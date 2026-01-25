const { MessageFlags } = require("discord.js");


/**
 * Given a customId of a string select menu, runs the appropriate function.
 */
function handleStringSelectMenuInteraction(customId, interaction) {
  switch (customId) {
    case 'character-manager-select':
      // Send placeholder response for now
      interaction.reply({ content: 'Character manager menu selected. (Functionality not yet implemented.)', flags: MessageFlags.Ephemeral });
      break;
    default:
      console.warn(`Unhandled string select menu interaction with customId: ${customId}`);

  }
}

module.exports = {
  handleStringSelectMenuInteraction,
}