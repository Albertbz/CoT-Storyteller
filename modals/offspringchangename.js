const { TextDisplayBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags, ContainerBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { askForConfirmation } = require("../helpers/confirmations");
const { DiscordChannels, PlayableChildren } = require("../dbObjects");
const { COLORS } = require("../misc");
const { offspringChangeNameModal } = require("../helpers/modalCreator");

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
      return interaction.followUp({ content: 'The new name is the same as the current name.', flags: [MessageFlags.Ephemeral] });
    }

    // Get the screenshot from the file upload
    const screenshot = interaction.fields.getUploadedFiles('offspring-change-name-screenshot').first();

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Confirm Offspring Name Change\n` +
          `You are about to request a name change for the offspring **${offspringCharacter.name}** to **${newName}**. Please review the image you uploaded, ensuring that it is a screenshot of the chiseled child, and confirm that you want to proceed with this request. If you confirm, the request will be sent to Staff for review.`
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
    console.error('Approval channel not found in database.');
    return interaction.followUp({ content: 'Approval channel not found. Please contact a member of staff.', flags: [MessageFlags.Ephemeral] });
  }

  const approvalChannel = interaction.client.channels.cache.get(approvalChannelEntry.channelId);

  const offspringInfo = await offspring.formattedInfo;

  const approvalContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Offspring Name Change Request\n` +
        `Request sent in by ${interaction.user} for changing the name of **${offspringCharacter.name}** to:\n` +
        `### *${newName}*\n` +
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
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Offspring Name Change Request Sent\n` +
        `Your request to change the name of **${offspringCharacter.name}** to **${newName}** has been sent to Staff for review. Please allow some time for Staff to review your request. You will be notified of the outcome of your request once it has been reviewed.`
      )
    )

  return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
}

async function offspringChangeNameEdit(interaction, offspring, newName) {
  // Create a new modal to be shown
  const modal = await offspringChangeNameModal(offspring, { nameValue: newName });

  // Show the modal to the user
  await interaction.showModal(modal);
}