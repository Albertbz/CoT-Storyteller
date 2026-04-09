const { MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const { PlayableChildren, Worlds } = require("../../dbObjects")
const { offspringLegitimiseModal } = require("../../helpers/modalCreator");
const { WORLD_ID } = require("../../constants");

module.exports = {
  customId: 'offspring-legitimise',
  async execute(interaction) {
    // Get the offspring from the customId, which is split by a :
    const offspringId = interaction.customId.split(':')[1]
    const offspring = await PlayableChildren.findByPk(offspringId);
    const offspringCharacter = await offspring.getCharacter();
    const world = await Worlds.findByPk(WORLD_ID);

    // Check whether the offspring has been born yet, and if not, return an error
    // message to the user
    if (offspringCharacter.yearOfMaturity - 2 > world.currentYear) {
      const notBornContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Offspring Not Born Yet\n` +
            `This offspring cannot be legitimised yet, as they have not been born. They will be born in year ${offspringCharacter.yearOfMaturity - 2}.`
          )
        );
      return interaction.reply({ components: [notBornContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    const existingLegitimisationRequest = await offspring.getLegitimisationRequest();
    if (existingLegitimisationRequest) {
      const pendingRequestContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Existing Legitimisation Request\n` +
            `There is already a pending legitimisation request for this offspring. Please wait for staff to review the existing request before submitting a new one.`
          )
        );
      return interaction.reply({ components: [pendingRequestContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Create modal for legitimising offspring
    const modal = await offspringLegitimiseModal(offspring);

    return interaction.showModal(modal);
  }
}