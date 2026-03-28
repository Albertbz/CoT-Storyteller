const { MessageFlags } = require("discord.js");
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
      return interaction.reply({ content: `This offspring cannot be legitimised yet, as they have not been born. They will be born in year ${offspringCharacter.yearOfMaturity - 2}.`, flags: [MessageFlags.Ephemeral] });
    }

    // Create modal for legitimising offspring
    const modal = await offspringLegitimiseModal(offspring);

    return interaction.showModal(modal);
  }
}