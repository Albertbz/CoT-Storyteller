const { MessageFlags, ContainerBuilder, inlineCode } = require('discord.js');
const { changeCharacterInDatabase } = require('../misc.js');
const { Players } = require('../dbObjects');

module.exports = {
  customId: 'character-change-surname-modal',
  async execute(interaction) {
    // Defer reply to allow time to process
    await interaction.deferUpdate();

    /**
     * Notify the user of surname update in progress
     */
    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Changing Character Surname\n` +
          `The surname of your character is being changed. This may take a few moments...`
        )
      );

    await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

    // Extract modal input
    const newSurname = interaction.fields.getTextInputValue('character-surname-input');

    /**
     * Get the character from the database and update the name with the new
     * surname
     */
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();

    const firstNameSeparator = character.name.indexOf(' ');
    const firstName = firstNameSeparator !== -1 ? character.name.substring(0, firstNameSeparator) : character.name;
    const newName = `${firstName} ${newSurname}`;

    const { character: updatedCharacter, _ } = await changeCharacterInDatabase(interaction.user.id, character, true, { newName: newName });
    if (!updatedCharacter) {
      await interaction.followUp({ content: 'There was an error when changing the surname. Please contact a storyteller for assistance.', flags: MessageFlags.Ephemeral });
      return;
    }

    /**
     * Notify the user of successful surname change
     */
    container.spliceComponents(0, container.components.length);

    container
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Character Surname Changed\n` +
          `Your character has now successfully had their surname changed to **${inlineCode(newSurname)}**.\n` +
          `You can continue to manage your character using the Character Manager GUI above.`
        )
      )

  }
}