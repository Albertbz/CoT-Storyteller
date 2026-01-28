const { ContainerBuilder, ButtonBuilder, ButtonStyle, inlineCode } = require('discord.js');

async function createManageCharacterContainer(character) {
  const container = new ContainerBuilder()

  if (character) {
    const characterInfo = await character.formattedInfo;

    container
      .addTextDisplayComponents(
        (textDisplay) => textDisplay.setContent(`# Manage your current character: **${inlineCode(character.name)}**`),
        (textDisplay) => textDisplay.setContent(characterInfo)
      )
      .addSeparatorComponents((separator) => separator)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`Use the buttons below to manage various aspects of your character.`))
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId('character-change-surname-button')
            .setLabel('Change Surname')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('✍️'),
          new ButtonBuilder()
            .setCustomId('character-change-region-button')
            .setLabel('Change Region/House')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🏠')
        )
      );

    if (await character.isMortal) {
      container.addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId('character-register-death-button')
            .setLabel('Register Death')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('💀')
        )
      );
    }

    if (character.socialClassName === 'Commoner') {
      container.addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId('character-notability-button')
            .setLabel('Opt in to Notability')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⭐')
        )
      );
    }
    else {
      container.addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId('character-npc-rolls-button')
            .setLabel('Opt in/out of NPC Rolls')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🎲'),
          new ButtonBuilder()
            .setCustomId('character-intercharacter-rolls-button')
            .setLabel('Opt in/out of Intercharacter Rolls')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('👥')
        )
      );
    }
  }
  else {
    container
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# You do not currently have a Character\n` +
          `Use the buttons below to create a new character or to play an offspring.`
        )
      )
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId('character-create-button')
            .setLabel('Create New Character')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🆕'),
          new ButtonBuilder()
            .setCustomId('character-play-offspring-button')
            .setLabel('Play an Offspring')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('👶')
        )
      );
  }

  return container;
}

module.exports = {
  createManageCharacterContainer
}