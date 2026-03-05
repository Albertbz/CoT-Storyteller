const { TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ContainerBuilder, MessageFlags, StringSelectMenuOptionBuilder } = require("discord.js");
const { Players, Relationships, Characters } = require("../dbObjects");
const { Op } = require("sequelize");

module.exports = {
  customId: 'character-intercharacter-rolls-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    /**
     * Create a container with the following parts:
     * - A text display component that explains what intercharacter rolls are
     * - Separator
     * - A text display component with the current intercharacter rolls that the character is rolling in (shorthand)
     * - A button to create a new intercharacter roll
     * - A button to edit existing intercharacter rolls (if any exist)
     * - A button to cancel and return to the character manager
     */

    // Get the character of the player
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();

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
    const icRollsInfoTextDisplay = new TextDisplayBuilder()
      .setContent("# Manage Intercharacter Rolls\nIntercharacter rolls are rolls that involve two characters in a relationship. These rolls can result in legitimate or illegitimate children, depending on if the two characters are married or not. In the case of legitimate children, they can also inherit noble titles from their parents.");
    container.addTextDisplayComponents(icRollsInfoTextDisplay);

    // Add a separator
    container.addSeparatorComponents((separator) => separator);


    // Create either a text display component with the fact that the character
    // is not currently rolling in any intercharacter rolls, or a text display
    // component saying that the character is currently part of some rolls, and
    // that to edit them, they should choose them in the select menu below, and
    // add it to the container
    if (intercharacterRolls.length === 0) {
      const notRollingTextDisplay = new TextDisplayBuilder()
        .setContent("Your character is currently not rolling in any intercharacter rolls.");
      container.addTextDisplayComponents(notRollingTextDisplay);
    } else {
      const rollingTextDisplay = new TextDisplayBuilder()
        .setContent("Your character is currently rolling in some intercharacter rolls. To edit them, please select the roll you want to edit in the select menu below.");

      container.addTextDisplayComponents(rollingTextDisplay);

      // Create the select menu to edit existing intercharacter rolls and add it to the container
      const editSelectMenu = new StringSelectMenuBuilder()
        .setCustomId('intercharacter-roll-edit-select')
        .setPlaceholder('Select an intercharacter roll to edit')
        .addOptions(
          intercharacterRolls.map(roll => {
            const otherCharacter = roll.bearingCharacter.id === character.id ? roll.conceivingCharacter : roll.bearingCharacter;
            const option = new StringSelectMenuOptionBuilder()
              .setLabel(`Roll with ${otherCharacter.name}`)
              .setValue(roll.id)
              .setDescription(
                `Bearing: ${roll.bearingCharacter.name} | ${roll.isCommitted ? `Committed` : `Not Committed`} | ${roll.inheritedTitle !== 'None' ? `Inherited Title: ${roll.inheritedTitle}` : `No Inherited Title`}`
              )
            return option;
          })
        )

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

    // Create the button to cancel and return to the character manager
    const cancelButton = new ButtonBuilder()
      .setCustomId('character-manager-return-button')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger);

    // Create the action row for the buttons
    const actionRow = new ActionRowBuilder()
      .setComponents(createButton, cancelButton);

    container.addActionRowComponents(actionRow);

    // Respond with the container
    await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}