const { ContainerBuilder, ButtonBuilder, ButtonStyle, inlineCode, StringSelectMenuOptionBuilder, ActionRowBuilder, StringSelectMenuBuilder, TextDisplayBuilder } = require('discord.js');
const { PlayableChildren, Characters, Relationships, Players } = require('../dbObjects');
const { Op } = require('sequelize');
const { formatCharacterName } = require('./formatters');

async function getCharacterManagerContainer(userId) {
  const player = await Players.findByPk(userId);

  if (!player) {
    const notRegisteredContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Not Registered as Player\n` +
          `You are not registered as a player. Please make a whitelist application to get registered.`
        )
      )
    return notRegisteredContainer;
  }

  const character = await player.getCharacter();

  if (!character) {
    const noCharacterContainer = new ContainerBuilder()
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

    return noCharacterContainer;
  }

  const characterInfo = await character.formattedInfo;

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# :bust_in_silhouette: Character Dashboard\n` +
        characterInfo
      ),
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

  return container;
}

async function getOffspringManagerContainer(userId) {
  const player = await Players.findByPk(userId);
  if (!player) {
    const notRegisteredContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Not Registered as Player\n` +
          `You are not registered as a player. Please make a whitelist application to get registered.`
        )
      )
    return notRegisteredContainer;
  }

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
      const parentNames = [];
      if (offspring.character.parent1) parentNames.push(offspring.character.parent1.name);
      if (offspring.character.parent2) parentNames.push(offspring.character.parent2.name);
      return new StringSelectMenuOptionBuilder()
        .setLabel(offspring.character ? offspring.character.name : `Offspring ${offspring.id}`)
        .setValue(offspring.id)
        .setDescription(`${offspring.legitimacy} ${offspring.character.sex ? offspring.character.sex === `Male` ? 'son' : 'daughter' : 'child'} of ${parentNames.length > 0 ? parentNames.join(" and ") : "Unknown Parents"}`);
    });

    container
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# :baby: Offspring Dashboard\n` +
          `You are listed as a contact for the following offspring. Select the one that you would like to manage to continue.`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder()
          .setComponents(
            new StringSelectMenuBuilder()
              .setCustomId('offspring-manage-select')
              .setPlaceholder('Select an offspring to manage')
              .addOptions(offspringOptions)
          )
      );
  }
  else {
    container
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# :baby: Manage Offspring\n` +
          `You are not currently listed as a contact for any offspring. One of your characters must have had a child, or you must have adopted someone else's child in order to have offspring to manage.`
        )
      )
  }

  return container;
}

async function getRegionManagerContainer(userId) {
  const player = await Players.findByPk(userId);
  if (!player) {
    const notRegisteredContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Not Registered as Player\n` +
          `You are not registered as a player. Please make a whitelist application to get registered.`
        )
      )
    return notRegisteredContainer;
  }

  const character = await player.getCharacter();
  if (!character) {
    const noCharacterContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# You do not currently have a Character\n` +
          `Use the Character Dashboard to create a new character or to play an offspring in order to manage regions.`
        )
      )
    return noCharacterContainer;
  }

  const region = await character.getRegion();
  if (!region) {
    const noRegionContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# No Region or House\n` +
          `Your character is not currently associated with any region. This is not supposed to happen, as all characters should be associated with a region. Please contact a member of Staff to resolve this issue.`
        )
      )
    return noRegionContainer;
  }

  const regionInfo = await region.formattedInfoNoSteelbearers;
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# :map: Region Manager\n` +
        regionInfo
      )
    )



  return container;
}

async function getIntercharacterRollManagerContainer(character) {
  // Get the intercharacter rolls (relationships) that the character is rolling in
  const intercharacterRolls = await Relationships.findAll({
    where: {
      [Op.or]: [
        { bearingCharacterId: character.id },
        { conceivingCharacterId: character.id }
      ]
    },
    include: [
      { model: Characters, as: 'bearingCharacter' },
      { model: Characters, as: 'conceivingCharacter' }
    ]
  });

  const container = new ContainerBuilder();

  // Create the text display component that explains what intercharacter rolls 
  // are and add it to the container
  const icRollsInfoTextDisplay = new TextDisplayBuilder().setContent(
    `# Manage Intercharacter Rolls\n` +
    `Intercharacter rolls are rolls that involve two characters in a relationship. These rolls can result in legitimate or illegitimate children, depending on if the two characters are married or not. In the case of legitimate children, they can also inherit noble titles from their parents.`
  );
  container.addTextDisplayComponents(icRollsInfoTextDisplay);

  // Add a separator
  container.addSeparatorComponents((separator) => separator);


  // Create either a text display component with the fact that the character
  // is not currently rolling in any intercharacter rolls, or a text display
  // component saying that the character is currently part of some rolls, and
  // that to edit them, they should choose them in the select menu below, and
  // add it to the container
  if (intercharacterRolls.length === 0) {
    const notRollingTextDisplay = new TextDisplayBuilder().setContent(
      `Your character, ${formatCharacterName(character.name)}, is currently not rolling in any intercharacter rolls.`
    );
    container.addTextDisplayComponents(notRollingTextDisplay);
  } else {
    const rollingTextDisplay = new TextDisplayBuilder().setContent(
      `Your character, ${formatCharacterName(character.name)}, is currently rolling in one or more intercharacter rolls. To edit an intercharacter roll, please select the one that you want to edit in the select menu below. To create a new intercharacter roll, click the 'Create Roll' button. To delete an intercharacter roll, click the 'Delete Roll' button.`
    );

    container.addTextDisplayComponents(rollingTextDisplay);

    const options = []
    for (const roll of intercharacterRolls) {
      const label = `${roll.bearingCharacter.name} & ${roll.conceivingCharacter.name}`;
      const description = `Bearing: ${roll.bearingCharacter.name} | ${roll.isCommitted ? `Committed` : `Not Committed`} | ${roll.inheritedTitle !== 'None' ? `Inherited Title: ${roll.inheritedTitle}` : `No Inherited Title`} | Fertility: ${(await roll.bearingCharacter.fertility) * (await roll.conceivingCharacter.fertility) * 100}%`;

      const option = new StringSelectMenuOptionBuilder()
        .setLabel(label)
        .setValue(roll.id)
        .setDescription(description);

      options.push(option);
    }

    // Create the select menu to edit existing intercharacter rolls and add it to the container
    const editSelectMenu = new StringSelectMenuBuilder()
      .setCustomId('intercharacter-roll-edit-select')
      .setPlaceholder('Select an intercharacter roll to edit')
      .addOptions(options);

    const editSelectMenuActionRow = new ActionRowBuilder()
      .setComponents(editSelectMenu);

    container.addActionRowComponents(editSelectMenuActionRow);
  }

  // Create the button to create a new intercharacter roll
  const createButton = new ButtonBuilder()
    .setCustomId('intercharacter-roll-create-button')
    .setLabel('Create Roll')
    .setEmoji('❤️')
    .setStyle(ButtonStyle.Secondary);

  // Delete button that only shows if there are existing intercharacter rolls
  const deleteButton = new ButtonBuilder()
    .setCustomId('intercharacter-roll-delete-button')
    .setLabel('Delete Roll')
    .setEmoji('🗑️')
    .setStyle(ButtonStyle.Secondary);

  // Create the button to cancel and return to the character manager
  const cancelButton = new ButtonBuilder()
    .setCustomId('character-manager-return-button')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Danger);

  // Create the action row for the buttons
  const actionRow = new ActionRowBuilder()
    .addComponents(createButton)

  if (intercharacterRolls.length > 0) {
    actionRow.addComponents(deleteButton);
  }

  actionRow.addComponents(cancelButton);

  container.addActionRowComponents(actionRow);

  return container;
}

module.exports = {
  getCharacterManagerContainer,
  getOffspringManagerContainer,
  getRegionManagerContainer,
  getIntercharacterRollManagerContainer
}