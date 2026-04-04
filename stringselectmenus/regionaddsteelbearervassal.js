const { TextDisplayBuilder } = require("discord.js");
const { Characters, Vassals } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { addSteelbearerConfirm } = require("../helpers/steelbearer");
const { formatCharacterName } = require("../helpers/formatters");

module.exports = {
  customId: 'region-add-steelbearer-vassal-select',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the characterId from the customId, split by :
    const [_, characterId] = interaction.customId.split(':');
    const character = await Characters.findByPk(characterId);
    const region = await character.getRegion();

    // Get the vassal from the select menu values
    const vassalId = interaction.values[0];
    const vassal = await Vassals.findByPk(vassalId);
    const vassalRegion = await vassal.getVassalRegion();

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Confirm Adding Steelbearer\n` +
          `You are currently making ${formatCharacterName(character.name)} a **Vassal** steelbearer of **${region.name}** for the vassal region of **${vassalRegion.name}**. This will notify the player of the character that they have been made a steelbearer.`
        )
      ],
      'region-manager-return-button',
      (interaction) => addSteelbearerConfirm(interaction, character, region, 'Vassal', { vassalId: vassal.id })
    )
  }
}