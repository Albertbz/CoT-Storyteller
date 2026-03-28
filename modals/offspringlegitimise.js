const { TextDisplayBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, ContainerBuilder, MessageFlags, MediaGalleryItem, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { PlayableChildren, DiscordChannels } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { offspringLegitimiseModal } = require("../helpers/modalCreator");
const { COLORS } = require("../misc.js");

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

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Review Offspring Legitimisation Request\n` +
          `You are about to request the legitimisation of the offspring **${offspringCharacter.name}**. Please review the image you uploaded and confirm that you want to proceed with this request. If you confirm, the request will be sent to Staff for review.`
        ),
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder()
            .setURL(screenshot.url)
        )
      ],
      'offspring-manager-return-button',
      (interaction) => offspringLegitimiseConfirm(interaction, offspring, screenshot),
      (interaction) => offspringLegitimiseEdit(interaction, offspring)
    )
  }
}

async function offspringLegitimiseConfirm(interaction, offspring, screenshot) {
  // Defer update to allow time to process
  await interaction.deferUpdate();

  const offspringCharacter = await offspring.getCharacter();


  // Create a message to be sent in the approval channel with the details of the
  // request and the screenshot, and buttons to approve or deny the request
  const approvalChannelEntry = await DiscordChannels.findByPk('approval');
  if (!approvalChannelEntry) {
    console.error('Approval channel not found in database.');
    return interaction.followUp({ content: 'Approval channel not found. Please contact a member of staff.', flags: [MessageFlags.Ephemeral] });
  }

  const approvalChannel = interaction.client.channels.cache.get(approvalChannelEntry.channelId);

  const offspringInfo = await offspring.formattedInfo;

  const approvalContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Offspring Legitimisation Request\n` +
        `Request sent in by <@${interaction.user.id}> for the legitimisation of the offspring **${offspringCharacter.name}**. Please review the screenshot provided and approve or deny the request using the buttons below.\n` +
        `## Offspring Details\n` +
        offspringInfo + `\n` +
        `## Screenshot Provided`
      )
    )
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder()
          .setURL(screenshot.url)
      )
    )
    .setAccentColor(COLORS.APRICOT);

  const responseRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`offspring-legitimise-approve:${offspring.id}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`offspring-legitimise-deny:${offspring.id}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger)
  )

  await approvalChannel.send({ components: [approvalContainer, responseRow], flags: [MessageFlags.IsComponentsV2] });

  // Edit the message to say that the request has been sent to Staff for review
  // and that the user will be notified of the outcome of the request
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Offspring Legitimisation Request Sent\n` +
        `Your request to legitimise the offspring ${offspringCharacter.name} has been sent to Staff for review. You will be notified of the outcome of the request once it has been reviewed. Please allow some time for Staff to review your request. You will be notified of the outcome of your request once it has been reviewed.`
      )
    )

  return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
}

async function offspringLegitimiseEdit(interaction, offspring) {
  // Create modal for uploading a new screenshot
  const modal = await offspringLegitimiseModal(offspring);

  // Show the modal to the user
  return interaction.showModal(modal);
}