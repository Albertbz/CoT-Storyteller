const { TextDisplayBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, ContainerBuilder, MessageFlags, MediaGalleryItem, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { PlayableChildren, DiscordChannels, Players, LegitimisationRequests } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { offspringLegitimiseModal } = require("../helpers/modalCreator");
const { COLORS } = require("../misc.js");
const { showMessageThenReturnToContainer } = require("../helpers/messageSender.js");
const { getOffspringManagerContainer } = require("../helpers/containerCreator.js");
const { formatCharacterName } = require("../helpers/formatters.js");

module.exports = {
  customId: 'offspring-legitimise-modal',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the offspring from the customId, which is split by a :
    const offspringId = interaction.customId.split(':')[1]
    const offspring = await PlayableChildren.findByPk(offspringId);
    const offspringCharacter = await offspring.getCharacter();

    // Get the attachment from the modal submission
    const screenshot = interaction.fields.getUploadedFiles('offspring-legitimise-screenshot').first();
    const newName = interaction.fields.getTextInputValue('offspring-change-name-input');
    const chiseledChildScreenshot = interaction.fields.getUploadedFiles('offspring-chiseled-offspring-screenshot').first();

    // Check if the attachments are images
    for (const file of [screenshot, chiseledChildScreenshot]) {
      if (!file || !file.contentType.startsWith('image/')) {
        const invalidFileContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# Invalid File Uploaded\n` +
              `The file you uploaded is not a valid image. Please upload a valid image file (.png, .jpg, .jpeg) and try again.`
            )
          );
        return interaction.editReply({ components: [invalidFileContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
      }
    }

    const changingName = newName !== offspringCharacter.name;

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Review Offspring Legitimisation Request\n` +
          `You are about to request the legitimisation of the offspring ${formatCharacterName(offspringCharacter.name)}${changingName ? ` and to change its name to ${formatCharacterName(newName)}` : ''}. Please review the images you uploaded and confirm that you want to proceed with this request. If you confirm, the request will be sent to Staff for review.`
        ),
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder()
            .setURL(screenshot.url),
          new MediaGalleryItemBuilder()
            .setURL(chiseledChildScreenshot.url)
        )
      ],
      'offspring-manager-return-button',
      (interaction) => offspringLegitimiseConfirm(interaction, offspring, screenshot, newName, chiseledChildScreenshot),
      (interaction) => offspringLegitimiseEdit(interaction, offspring, newName)
    )
  }
}

async function offspringLegitimiseConfirm(interaction, offspring, screenshot, newName, chiseledChildScreenshot) {
  // Defer update to allow time to process
  await interaction.deferUpdate();

  const offspringCharacter = await offspring.getCharacter();

  // Create a message to be sent in the approval channel with the details of the
  // request and the screenshot, and buttons to approve or deny the request
  const approvalChannelEntry = await DiscordChannels.findByPk('approval');
  if (!approvalChannelEntry) {
    console.error('Approval channel not found in database.');
    const channelNotFoundContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Approval Channel Not Found\n` +
          `The approval channel could not be found in the database. Please contact a member of staff to resolve this issue.`
        )
      );
    return interaction.editReply({ components: [channelNotFoundContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  const approvalChannel = interaction.client.channels.cache.get(approvalChannelEntry.channelId);
  // Check if the channel exists
  if (!approvalChannel) {
    console.log('Approval channel not found in client cache.');
    const channelNotFoundContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Approval Channel Not Found\n` +
          `The approval channel could not be found in the client cache. Please contact a member of staff to resolve this issue.`
        )
      );
    return interaction.editReply({ components: [channelNotFoundContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }


  const offspringInfo = await offspring.formattedInfo;
  const changingName = newName !== offspringCharacter.name;

  const approvalContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Offspring Legitimisation Request\n` +
        `Request sent in by ${interaction.user} for the legitimisation${changingName ? ` and name change to ${formatCharacterName(newName)}` : ''} of the offspring ${formatCharacterName(offspringCharacter.name)}. Please review the screenshots provided and approve or deny the request using the buttons below.\n` +
        `## Offspring Details\n` +
        offspringInfo + `\n` +
        `## Screenshots Provided`
      )
    )
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder()
          .setURL(screenshot.url),
        new MediaGalleryItemBuilder()
          .setURL(chiseledChildScreenshot.url)
      )
    )
    .setAccentColor(COLORS.APRICOT);

  // Create a new legitimisation request
  const legitimisationRequest = await LegitimisationRequests.create({
    offspringId: offspring.id,
    requestedById: interaction.user.id,
    newName: newName
  })

  const responseRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`offspring-legitimise-approve:${legitimisationRequest.id}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`offspring-legitimise-deny:${legitimisationRequest.id}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger)
  )

  await approvalChannel.send({ components: [approvalContainer, responseRow], flags: [MessageFlags.IsComponentsV2] });

  // Edit the message to say that the request has been sent to Staff for review
  // and that the user will be notified of the outcome of the request
  return showMessageThenReturnToContainer(
    interaction,
    `# Offspring Legitimisation Request Sent\n` +
    `Your request to legitimise the offspring ${formatCharacterName(offspringCharacter.name)} has been sent to Staff for review. Please allow some time for Staff to review your request. You will be notified of the outcome of your request once it has been reviewed.`,
    10000,
    `Offspring Dashboard`,
    async () => getOffspringManagerContainer(interaction.user.id)
  )
}

async function offspringLegitimiseEdit(interaction, offspring, newName) {
  // Create modal for uploading a new screenshot
  const modal = await offspringLegitimiseModal(offspring, newName);

  // Show the modal to the user
  return interaction.showModal(modal);
}