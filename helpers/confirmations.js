const { ContainerBuilder, inlineCode, ButtonBuilder, ButtonStyle } = require('discord.js');

function confirmationCheck(character, dataType, data) {
  const container = new ContainerBuilder();
  
  switch(dataType) {
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

module.exports = { confirmationCheck };