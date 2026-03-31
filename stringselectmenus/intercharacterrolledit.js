const { MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const { intercharacterRollCreateModal, intercharacterRollEditModal } = require("../helpers/modalCreator");
const { Relationships, Characters } = require("../dbObjects");

module.exports = {
  customId: 'intercharacter-roll-edit-select',
  async execute(interaction) {
    // Get the selected intercharacter roll from the select menu
    const selectedRollId = interaction.values[0];
    const roll = await Relationships.findByPk(selectedRollId, {
      include: [
        { model: Characters, as: 'bearingCharacter' },
        { model: Characters, as: 'conceivingCharacter' }
      ]
    });

    if (!roll) {
      const notFoundContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Intercharacter Roll Not Found\n` +
            `The intercharacter roll you selected could not be found. Please select a valid intercharacter roll to edit.`
          )
        );
      return interaction.reply({ components: [notFoundContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Create a modal to edit the relationship and show it to the user
    const modal = await intercharacterRollEditModal(roll);
    await interaction.showModal(modal);
  }
}