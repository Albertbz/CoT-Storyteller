const { TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ContainerBuilder, MessageFlags } = require("discord.js");
const { Players, Relationships } = require("../dbObjects");
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
      }
    });

    // Create the text display component that explains what intercharacter rolls are
    const icRollsInfoTextDisplay = new TextDisplayBuilder()
      .setContent("# Manage Intercharacter Rolls\nIntercharacter rolls are rolls that involve two characters in a relationship. These rolls can result in legitimate or illegitimate children, depending on if the two characters are married or not. In the case of legitimate children, they can also inherit noble titles from their parents.");

    // Create the text display component with the current intercharacter rolls that the character is rolling in (shorthand)
    let intercharacterRollsContent = "Your character is currently not rolling in any intercharacter rolls.";
    if (intercharacterRolls.length > 0) {
      intercharacterRollsContent = "Your character is currently rolling in the following intercharacter rolls:\n";
      const intercharacterRollsTextList = [];
      for (const roll of intercharacterRolls) {
        const bearingCharacter = await roll.getBearingCharacter();
        const conceivingCharacter = await roll.getConceivingCharacter();
        intercharacterRollsTextList.push(`- ${bearingCharacter.name} x ${conceivingCharacter.name}`);
      }
      intercharacterRollsContent += intercharacterRollsTextList.join('\n');
    }

    const intercharacterRollsTextDisplay = new TextDisplayBuilder()
      .setContent(intercharacterRollsContent);

    // Create the button to create a new intercharacter roll
    const createIntercharacterRollButton = new ButtonBuilder()
      .setCustomId('create-intercharacter-roll-button')
      .setLabel('Create Roll')
      .setEmoji('❤️')
      .setStyle(ButtonStyle.Secondary);

    // Create the button to edit existing intercharacter rolls (if any exist)
    const editIntercharacterRollsButton = new ButtonBuilder()
      .setCustomId('edit-intercharacter-rolls-button')
      .setLabel('Edit Rolls')
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Secondary);

    // Create the button to cancel and return to the character manager
    const cancelButton = new ButtonBuilder()
      .setCustomId('character-manager-return-button')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger);

    // Create the action row for the buttons, conditionally adding the edit button if intercharacter rolls exist
    const buttons = [createIntercharacterRollButton];
    if (intercharacterRolls.length > 0) {
      buttons.push(editIntercharacterRollsButton);
    }
    buttons.push(cancelButton);

    const actionRow = new ActionRowBuilder()
      .setComponents(buttons);

    // Create the container that will hold all the components
    const container = new ContainerBuilder()
      .addTextDisplayComponents(icRollsInfoTextDisplay)
      .addSeparatorComponents((separator) => separator)
      .addTextDisplayComponents(intercharacterRollsTextDisplay)
      .addActionRowComponents(actionRow);

    // Respond with the container
    await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}