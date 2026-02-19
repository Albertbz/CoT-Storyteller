const { ContainerBuilder, inlineCode, ButtonBuilder, ButtonStyle, MessageFlags, MessageComponentInteraction } = require('discord.js');

/**
 * Creates a container for confirmation messages with dynamic content and 
 * buttons for confirming or editing the action.
 * @param {string} title The title of the message, displayed in large text.
 * @param {string} description The description of the message, displayed in
 * smaller text below the title.
 * @param {boolean} editable Whether the container should have the Edit button.
 * @param {boolean} disabled Whether to make the Confirm and Edit buttons disabled. Defaults to false.
 * @returns A container with the specified title and description, and possibly
 * an edit button and disabled Confirm and Edit buttons.
 */
function getContainer(title, description, editable, disabled = false) {
  const confirmButton = new ButtonBuilder()
    .setCustomId('confirmation-confirm-button')
    .setLabel('Confirm')
    .setStyle(ButtonStyle.Success);

  const cancelButton = new ButtonBuilder()
    .setCustomId('character-manager-return-button')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Danger);

  const editButton = new ButtonBuilder()
    .setCustomId('confirmation-edit-button')
    .setLabel('Edit')
    .setEmoji('✍️')
    .setStyle(ButtonStyle.Secondary);

  const container = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# ${title}\n` +
        `${description}`
      )
    )
    .addSeparatorComponents((separator) => separator)

  if (disabled) {
    container
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `You spent too long in the confirmation process. Please click the cancel button to start over.`
        )
      )
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          confirmButton.setDisabled(true),
          ...(editable
            ? [
              editButton.setDisabled(true)
            ]
            : []),
          cancelButton
        )
      );
  }
  else {
    container
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `If the above information is correct, please click the Confirm button to proceed.${editable ? ` If you need to make changes, click the Edit button.` : ``} You have 2 minutes to confirm before the confirmation expires.`
        )
      )
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          confirmButton,
          ...(editable
            ? [
              editButton
            ]
            : []),
          cancelButton
        )
      );
  }

  return container;
}

/**
 * Edits the original interaction response to ask the user for confirmation before
 * proceeding with an action. Displays a confirmation message with the provided title
 * and description, and buttons for confirming or editing the action. Collects button
 * interactions to determine whether the user confirmed or wants to edit the action,
 * and executes the appropriate function based on the user's choice. If the user does
 * not interact with the confirmation message within 2 minutes, the buttons will be
 * disabled and the user will be prompted to start over.
 * @param {MessageComponentInteraction} interaction The interaction that resulted in the asking for confirmation. This is typically the interaction from a modal submission or button click that initiates an action that requires confirmation.
 * @param {string} title The title of the confirmation message.
 * @param {string} description The description of the confirmation message.
 * @param {function(MessageComponentInteraction)} confirmFunction The function to execute if the user confirms the action. This function should handle editing the confirmation message to indicate that the action was confirmed, and any other necessary follow-up actions.
 * @param {function(MessageComponentInteraction)} editFunction An optional function to execute if the user clicks the Edit button. This function should handle editing the confirmation message to allow the user to make changes (or show a modal), and any other necessary follow-up actions. If this parameter is not provided, no Edit button will be shown in the confirmation message.
 */
async function askForConfirmation(interaction, title, description, confirmFunction, editFunction = null) {
  /**
   * Create a confirmation message with dynamic content and buttons for 
   * confirming or editing the action.
   */
  const confirmationContainer = getContainer(title, description, !!editFunction);

  const message = await interaction.editReply({ components: [confirmationContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  // Collect button interactions for confirmation or editing
  const filter = (i) => i.user.id === interaction.user.id && ['confirmation-confirm-button', 'confirmation-edit-button', 'character-manager-return-button'].includes(i.customId);
  const collector = message.createMessageComponentCollector({ filter, time: 120_000 });

  // Handle button interactions
  collector.on('collect', async (interaction) => {
    if (interaction.customId === 'confirmation-confirm-button') {
      await confirmFunction(interaction);
      collector.stop();
    }
    else if (interaction.customId === 'confirmation-edit-button' && editFunction) {
      await editFunction(interaction);

      // Assume that edit always produces a modal and shows it to the user,
      // so we can await submit of that modal to know if the user submitted the
      // edit, and as such that we can stop the collector
      try {
        await interaction.awaitModalSubmit({ time: 120_000, filter: (i) => i.user.id === interaction.user.id });
        collector.stop();
      }
      catch {
        // Catch timeout error, but do nothing with it
      }
    }
  });

  collector.on('end', async (_, reason) => {
    // Disable buttons, but only if the collector ended due to time expiring - 
    // if it ended due to confirmation, the buttons will already be gone since 
    // the message will have been edited
    if (reason !== 'time') return;
    const disabledContainer = getContainer(title, description, !!editFunction, true);
    await interaction.editReply({ components: [disabledContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  });
}

module.exports = { askForConfirmation };