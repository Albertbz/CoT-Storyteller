const { ContainerBuilder, inlineCode, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

function confirmationCheck(character, dataType, data) {
  const container = new ContainerBuilder();

  switch (dataType) {
    case 'default':
      container
        .addTextDisplayComponents((textDisplay) =>
          // Placeholder to show generic option to call
          textDisplay.setContent(
            `Please review the following change and confirm that this is correct for ${inlineCode(character.name)}.`
          )
        )
        .addSeparatorComponents((separator) => separator)
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `Your character, ${inlineCode(character.name)}, will change their ${data.change} from
            ${inlineCode(data.oldValue)} to ${inlineCode(data.newValue)}`
          )
        );
    case 'death':
      container
        .addTextDisplayComponents((textDisplay) =>
          // If you want to write this as a function with inline parameters, we can. 
          // I just see some double handling on writing a custom description each time.
          textDisplay.setContent(
            `Please review the final death information and confirm that this is correct for ${inlineCode(character.name)}.`
          )
        )
        .addSeparatorComponents((separator) => separator)
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `${inlineCode(character.name)}'s final death\n` +
            `Date of Death: ${data.day} ${data.month} ${data.year}\n` +
            `Cause: ${data.cause}\n` +
            `Final Note: ${data.note}\n`
          )
        );
      break;

    default:
      throw new Error(`Unknown confirmation type: ${dataType}`);
  }

  // Create dynamic buttons based on dataType
  const editButton = new ButtonBuilder()
    .setCustomId(`character-edit-${dataType}-button`)
    .setLabel('Edit')
    .setEmoji('✍️')
    .setStyle(ButtonStyle.Secondary);

  const confirmButton = new ButtonBuilder()
    .setCustomId(`character-submit-${dataType}-button`)
    .setLabel('Confirm')
    .setEmoji('✅')
    .setStyle(ButtonStyle.Success);

  const cancelButton = new ButtonBuilder()
    .setCustomId('character-manager-return-button')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Danger);

  // This is extendable to show/remove based on submission
  if (datatype = 'death') {
    container.addActionRowComponents((actionRow) =>
      actionRow.setComponents(editButton, confirmButton, cancelButton)
    );
  }
  else {
    container.addActionRowComponents((actionRow) =>
      actionRow.setComponents(confirmButton, cancelButton)
    );
  }

  return container;
}

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
      // Don't stop the collector here - allow the user to exit the modal and come
      // back to confirmation without changing anything
    }
  });

  collector.on('end', async (collected, reason) => {
    // Disable buttons, but only if the collector ended due to time expiring - 
    // if it ended due to confirmation, the buttons will already be gone since 
    // the message will have been edited
    if (reason !== 'time') return;
    const disabledContainer = getContainer(title, description, !!editFunction, true);
    await interaction.editReply({ components: [disabledContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  });
}

module.exports = { confirmationCheck, askForConfirmation };