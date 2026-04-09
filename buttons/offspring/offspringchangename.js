const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const { PlayableChildren } = require("../../dbObjects");
const { offspringChangeNameModal } = require("../../helpers/modalCreator");

module.exports = {
  customId: 'offspring-change-name',
  async execute(interaction) {
    // Get the offspring ID from the customId of the button
    const offspringId = interaction.customId.split(':')[1];
    // Get the offspring from the database
    const offspring = await PlayableChildren.findByPk(offspringId);

    // Check if an existing name change request is already pending for this offspring
    const existingChangeNameRequest = await offspring.getChangeNameRequest();
    if (existingChangeNameRequest) {
      const pendingRequestContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Existing Name Change Request\n` +
            `There is already a pending name change request for this offspring. Please wait for staff to review the existing request before submitting a new one.`
          )
        );
      return interaction.reply({ components: [pendingRequestContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Create modal to give the offspring a new name
    const modal = await offspringChangeNameModal(offspring);

    // Show the modal to the user
    await interaction.showModal(modal);
  }
}