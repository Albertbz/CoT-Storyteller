const { ContainerBuilder, ButtonBuilder, ButtonStyle, inlineCode, StringSelectMenuOptionBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { PlayableChildren, Characters } = require('../dbObjects');
const { Op } = require('sequelize');

async function getCharacterManagerContainer(character) {
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
      const npcRollsText = character.isRollingForBastards ? 'Opt out of NPC Rolls' : 'Opt in to NPC Rolls';

      container.addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId('character-npc-rolls-button')
            .setLabel(npcRollsText)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🎲'),
          new ButtonBuilder()
            .setCustomId('character-intercharacter-rolls-button')
            .setLabel('Manage Intercharacter Rolls')
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

async function getOffspringManagerContainer(player) {
  const container = new ContainerBuilder();

  const offspring = await PlayableChildren.findAll({
    where: {
      [Op.or]: [
        { contact1Snowflake: player.id },
        { contact2Snowflake: player.id }
      ]
    },
    include: {
      model: Characters, as: `character`,
      include: [
        { model: Characters, as: `parent1` },
        { model: Characters, as: `parent2` }
      ]
    }
  })

  if (offspring.length > 0) {
    const offspringOptions = offspring.map((offspring) => {
      const parentNames = [offspring.character.parent1, offspring.character.parent2]
        .filter(parent => parent) // Filter out null parents
        .map(parent => parent.name)
        .join(' and ');
      return new StringSelectMenuOptionBuilder()
        .setLabel(offspring.character ? offspring.character.name : `Offspring ${offspring.id}`)
        .setValue(offspring.id)
        .setDescription(`${offspring.legitimacy} ${offspring.character.sex === `male` ? 'son' : 'daughter'} of ${parentNames}`)
    });

    container
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Manage Offspring\n` +
          `You are listed as a contact for the following offspring. Select the one that you would like to manage to continue.`
        ))
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ActionRowBuilder()
            .setComponents(
              new StringSelectMenuBuilder()
                .setCustomId('offspring-manage-select')
                .setPlaceholder('Select an offspring to manage')
                .addOptions(offspringOptions)
            )
        )
      );
  }
  else {
    container
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Manage Offspring\n` +
          `You are not currently listed as a contact for any offspring. One of your characters must have had a child, or you must have adopted someone else's child in order to have offspring to manage.`
        )
      )
  }

  return container;
}

module.exports = {
  getCharacterManagerContainer,
  getOffspringManagerContainer
}