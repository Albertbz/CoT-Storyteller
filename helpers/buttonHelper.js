const { MessageFlags } = require("discord.js");


/**
 * Given a customId of a string select menu, runs the appropriate function.
 */
function handleButtonInteraction(customId, interaction) {
  let reply = null;
  switch (customId) {
    case 'manage-character-button':
      reply = createManageCharacterReply();
      break;
    case 'manage-offspring-button':
      reply = createManageOffspringReply();
      break;
    default:
      console.warn(`Unhandled string select menu interaction with customId: ${customId}`);

  }

  interaction.reply(reply);
}

/**
 * Create the manage character reply message.
 */
function createManageCharacterReply() {
  return {
    content: 'You selected to manage your character.',
    flags: MessageFlags.Ephemeral,
  }
}

/**
 * Create the manage offspring reply message.
 */
function createManageOffspringReply() {
  return {
    content: 'You selected to manage your offspring.',
    flags: MessageFlags.Ephemeral,
  }
}


module.exports = {
  handleButtonInteraction,
}