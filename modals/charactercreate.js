const { MessageFlags, ContainerBuilder } = require('discord.js');
const { addCharacterToDatabase, assignCharacterToPlayer } = require('../misc.js');

module.exports = {
  customId: 'character-create-modal',
  async execute(interaction) {
    // Defer reply to allow time to process
    await interaction.deferUpdate();

    /**
     * Extract modal inputs
     */
    const characterName = interaction.fields.getTextInputValue('character-name-input');
    const regionId = interaction.fields.getStringSelectValues('character-region-select')[0];
    const notabilityChoice = interaction.fields.getStringSelectValues('character-notability-select')[0];

    /**
     * Create the character in the database and assign to the player
     */
    const { character, embed: _ } = await addCharacterToDatabase(interaction.user, { name: characterName, regionId: regionId, socialClassName: notabilityChoice === 'yes' ? 'Notable' : 'Commoner' });
    if (!character) {
      await interaction.followUp({ content: 'There was an error creating your character. Please contact a storyteller for assistance.', flags: MessageFlags.Ephemeral });
      return;
    }
    await assignCharacterToPlayer(character.id, interaction.user.id, interaction.user);

    const components = [];

    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Character Created\n` +
          `Your character, **${character.name}**, has been successfully created and assigned to you.\n` +
          `You can manage your character using the Character Manager GUI above.`
        )
      );

    components.push(container);

    await interaction.editReply({ components: components, flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}