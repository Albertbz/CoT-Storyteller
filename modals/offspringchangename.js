const { TextDisplayBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags, ContainerBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { askForConfirmation } = require("../helpers/confirmations");
const { DiscordChannels, PlayableChildren, Characters, Players } = require("../dbObjects");
const { COLORS } = require("../misc");
const { offspringChangeNameModal } = require("../helpers/modalCreator");
const { showMessageThenReturnToContainer } = require("../helpers/messageSender");
const { getOffspringManagerContainer } = require("../helpers/containerCreator");
const { formatCharacterName } = require("../helpers/formatters");

module.exports = {
  customId: 'offspring-change-name-modal',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the offspring ID from the customId of the modal
    const offspringId = interaction.customId.split(':')[1];
    const offspring = await PlayableChildren.findByPk(offspringId);
    const offspringCharacter = await offspring.getCharacter();

    // Get the new name from the text input
    const newName = interaction.fields.getTextInputValue('offspring-change-name-input');

    // Check if the name is actually different
    if (offspringCharacter.name === newName) {
      const noChangesContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# No Changes Detected\n` +
            `The new name you entered is the same as the current name of the offspring, ${formatCharacterName(offspringCharacter.name)}. Please enter a different name to change it.`
          )
        );
      return interaction.followUp({ components: [noChangesContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Check if the name is already taken by another character
    const existingCharacter = await Characters.findOne({ where: { name: newName } });
    if (existingCharacter) {
      const nameTakenContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Name Already Taken\n` +
            `The name **${newName}** is already taken by another character. Please enter a different name to change it.`
          )
        );
      return interaction.followUp({ components: [nameTakenContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Get the screenshot from the file upload
    const screenshot = interaction.fields.getUploadedFiles('offspring-change-name-screenshot').first();

    // Get the image URL from the attachment, ensure that it is an image file
    if (!screenshot || !screenshot.contentType.startsWith('image/')) {
      const invalidFileContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Invalid File Uploaded\n` +
            `The file you uploaded is not a valid image. Please upload a screenshot of the chiseled child as a tabletop piece to proceed with the name change request.`
          )
        );
      return interaction.followUp({ components: [invalidFileContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Confirm Offspring Name Change\n` +
          `You are about to request a name change for the offspring ${formatCharacterName(offspringCharacter.name)} to ${formatCharacterName(newName)}. Please review the image you uploaded, ensuring that it is a screenshot of the chiseled child, and confirm that you want to proceed with this request. If you confirm, the request will be sent to Staff for review.`
        ),
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder()
            .setURL(screenshot.url)
        )
      ],
      'offspring-manager-return-button',
      (interaction) => offspringChangeNameConfirm(interaction, offspring, newName, screenshot),
      (interaction) => offspringChangeNameEdit(interaction, offspring, newName)
    )
  }
}

async function offspringChangeNameConfirm(interaction, offspring, newName, screenshot) {
  // Defer update to allow time to process
  await interaction.deferUpdate();

  const offspringCharacter = await offspring.getCharacter();

  // Create a message to be sent in the approval channel with the details of the
  // request and the screenshot, and buttons to approve or deny the request
  const approvalChannelEntry = await DiscordChannels.findByPk('approval');
  if (!approvalChannelEntry) {
    console.log('Approval channel not found in database.');
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

  const approvalContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Offspring Name Change Request\n` +
        `Request sent in by ${interaction.user} for changing the name of ${formatCharacterName(offspringCharacter.name)} to:\n` +
        `### ${formatCharacterName(newName)}\n` +
        `Please review the screenshot provided, ensuring that it is a screenshot of the chiseled child as a tabletop piece, and also verify that the child is legitimate or legitimised if the same surname as the parent(s) has been used. Then, approve or deny the request.\n` +
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
      .setCustomId(`offspring-change-name-approve:${offspring.id}:${newName}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`offspring-change-name-deny:${offspring.id}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger)
  );

  await approvalChannel.send({ components: [approvalContainer, responseRow], flags: [MessageFlags.IsComponentsV2] });

  // Edit the original message to confirm that the request has been sent
  const player = await Players.findByPk(interaction.user.id);
  return showMessageThenReturnToContainer(
    interaction,
    `# Offspring Name Change Request Sent\n` +
    `Your request to change the name of ${formatCharacterName(offspringCharacter.name)} to ${formatCharacterName(newName)} has been sent to Staff for review. Please allow some time for Staff to review your request. You will be notified of the outcome of your request once it has been reviewed.`,
    10000,
    `Offspring Dashboard`,
    async () => getOffspringManagerContainer(player)
  )
}

async function offspringChangeNameEdit(interaction, offspring, newName) {
  // Create a new modal to be shown
  const modal = await offspringChangeNameModal(offspring, { nameValue: newName });

  // Show the modal to the user
  await interaction.showModal(modal);
}