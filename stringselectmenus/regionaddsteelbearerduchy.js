const { TextDisplayBuilder } = require("discord.js");
const { Duchies, Characters } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { addSteelbearerConfirm } = require("../helpers/steelbearer");
const { formatCharacterName } = require("../helpers/formatters");

module.exports = {
  customId: 'region-add-steelbearer-duchy-select',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the characterId from the customId, split by :
    const [_, characterId] = interaction.customId.split(':');
    const character = await Characters.findByPk(characterId);

    // Get the duchyId from the select menu values
    const duchyId = interaction.values[0];
    const duchy = await Duchies.findByPk(duchyId);
    const region = await duchy.getRegion();

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Confirm Adding Steelbearer\n` +
          `You are currently making ${formatCharacterName(character.name)} a **Duchy** steelbearer for the duchy of **${duchy.name}**. This will notify the player of the character that they have been made a steelbearer.`
        )
      ],
      'region-manager-return-button',
      (interaction) => addSteelbearerConfirm(interaction, character, region, 'Duchy', { duchyId: duchy.id })
    )
  }
}