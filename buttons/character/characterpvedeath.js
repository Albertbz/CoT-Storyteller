const { ContainerBuilder, MessageFlags, inlineCode, TextDisplayBuilder } = require('discord.js');
const { changeCharacterInDatabase } = require('../../misc.js');
const { Players } = require('../../dbObjects.js');
const { askForConfirmation } = require('../../helpers/confirmations.js');

async function characterPveDeathConfirm(interaction) {


  // Defer the update to allow time to process
  await interaction.deferUpdate();

  const player = await Players.findByPk(interaction.user.id);
  const character = await player.getCharacter();
  /**
   * Notify the user of death change in progress
   */
  const container = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# Adding PvE death to character...\n` +
        `Your character is being updated. This may take a few moments...`
      )
    );

  await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  /**
   * Update the character PvE death count in DB
   */

  const addedpvedeath = character.pveDeaths + 1
  const { character: changedCharacter, embed: _ } = await changeCharacterInDatabase(interaction.user, character, true, { newPveDeaths: addedpvedeath });
  if (!changedCharacter) {
    await interaction.followUp({ content: 'There was an error registering your character PvE death. Please contact a storyteller for assistance.', flags: MessageFlags.Ephemeral });
    return;
  }

  /**
   * Notify the user of successful notability update
   */
  container.spliceComponents(0, container.components.length); // Clear container components

  container
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# PvE death added Successfully!\n` +
        `Your character, **${inlineCode(character.name)}**, has now spent ${inlineCode(addedpvedeath)} PvE ${addedpvedeath === 1 ? 'life' : 'lives'}.\n` +
        `You can continue to manage your character using the Character Manager GUI above.`
      )
    );

  return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
}

async function playerTimeCheck(interaction) {

  const player = await Players.findByPk(interaction.user.id);
  const character = await player.getCharacter();
  // Check if player's account is less than 3 days old (1000ms x 60sec x 60min x 72hrs = 259200000 milliseconds)
  if ((Date.now() - (Date.parse(player.createdAt))) <= 259200000) {
    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# PvE death mitigated\n` +
          `PvE deaths within the first 3 days of server playtime do not count towards your first character.\n` +
          `You can continue to manage your character using the Character Manager GUI above.`
        )
      );
    return true
  }
    await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    // mitigate PvE death if last death occurred within 1 hour (1000ms x 60sec x 60min = 3600000 milliseconds)
    // testing with 1 minute (1000ms x 60sec = 60000 milliseconds)
    if ((Date.now() - (Date.parse(character.livesUpdatedAt))) <= 60000) {
    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# PvE death mitigated\n` +
          `PvE deaths within the same hour of last PvE death do not count towards your character.\n` +
          `You can continue to manage your character using the Character Manager GUI above.`
        )
      );
    return true
  }
  else {
    return false
  }
}



module.exports = {
  customId: 'character-pve-death-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();
    // Check player account time
    const check = await playerTimeCheck(interaction);
    if (check === false) {
      // Ask for confirmation
      return askForConfirmation(
        interaction,
        [
          new TextDisplayBuilder().setContent(
            `# Confirm Adding PvE Death\n` +
            `You are currently adding a PvE death to your character. This will increase your character\'s PvE death count by 1. You cannot undo this action.`
          )
        ],
        'character-manager-return-button',
        (interaction) => characterPveDeathConfirm(interaction)
      )
    }
  }
}