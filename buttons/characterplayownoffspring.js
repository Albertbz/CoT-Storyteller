const { ContainerBuilder, MessageFlags, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { Players, Characters, PlayableChildren, Worlds } = require('../dbObjects.js');
const { Op } = require('sequelize');

module.exports = {
  customId: 'character-play-own-offspring-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    /**
     * Get all playable offspring characters for the player that invoked the interaction.
     */
    // Get the player that invoked the interaction
    const player = await Players.findByPk(interaction.user.id);
    // Get the world to have current year
    const world = await Worlds.findOne({ where: { name: 'Elstrand' } });
    // Get all playable children for this player where either contact1Snowflake
    // or contact2Snowflake matches the player's id, and where the character's
    // yearOfMaturity is less than or equal to the current year in the world
    const offspring = await PlayableChildren.findAll({
      where: {
        [Op.or]: [
          { contact1Snowflake: player.id },
          { contact2Snowflake: player.id }
        ],
      },
      include: {
        model: Characters, as: 'character',
        where: {
          yearOfMaturity: {
            [Op.lte]: world.currentYear
          }
        }
      }
    });

    // If no playable offspring found, inform the player
    if (offspring.length === 0) {
      const noOffspringContainer = new ContainerBuilder()
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `# No Playable Offspring Found\n` +
            `You do not have any playable offspring characters available at this time.`
          )
        );

      return interaction.editReply({ components: [noOffspringContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    /**
     * Create a message with a dropdown (select menu) with all of the characters
     * that the player is a contact for.
     */
    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Play as Your Own Offspring Character\n` +
          `You have chosen to play as one of your own offspring characters. Please select the offspring character you wish to play from the dropdown menu below.`
        )
      );

    // Create the select menu options from the offspring characters. Each option
    // should have the chararcter's name as the label, and a description with
    // the character's age, region, house, social class, and parents' names.
    const options = [];
    for (const playableChild of offspring) {
      const character = playableChild.character;
      const age = world.currentYear - character.yearOfMaturity;
      const parents = [];
      const parent1 = await character.getParent1();
      const parent2 = await character.getParent2();
      if (parent1) parents.push(parent1.name);
      if (parent2) parents.push(parent2.name);
      const parentsString = parents.length > 0 ? parents.join(' & ') : 'Unknown';
      const descriptionString =
        `${playableChild.legitimacy} ${character.sex === 'male' ? 'Son' : 'Daughter'} of ${parentsString} | ` +
        `Age: ${age}`;

      const option = new StringSelectMenuOptionBuilder()
        .setLabel(character.name)
        .setDescription(descriptionString.slice(0, 100))
        .setValue(playableChild.id);
      options.push(option);
    }

    container.addActionRowComponents((actionRow) =>
      actionRow.setComponents(
        new StringSelectMenuBuilder()
          .setCustomId('character-play-own-offspring-select')
          .setPlaceholder('Select an offspring character to play')
          .addOptions(options)
      )
    );

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

}