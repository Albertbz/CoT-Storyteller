const { ContainerBuilder, MessageFlags, inlineCode, TextDisplayBuilder } = require('discord.js');
const { changeCharacterInDatabase } = require('../../misc.js');
const { Players } = require('../../dbObjects.js');
const { askForConfirmation } = require('../../helpers/confirmations.js');

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
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Error Adding PvE Death\n` +
          `There was an error adding a PvE death to your character. Please contact a storyteller for assistance.`
        )
      )
    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
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

  /**
   * Mitigate PvE death if player's account is less than 3 days old or if last PvE death was within the same hour
   */
  // 3 days (1000ms x 60sec x 60min x 72hrs = 259200000 milliseconds)
  const threeDaysMitigation = (Date.now() - (Date.parse(player.createdAt))) <= 259200000;
  // 1 hour (1000ms x 60sec x 60min = 3600000 milliseconds)
  const oneHourMitigation = (Date.now() - (Date.parse(character.livesUpdatedAt))) <= 3600000;

  // Mitigate PvE death if player's account is less than 3 days old
  if (threeDaysMitigation) {
    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# PvE death mitigated\n` +
          `PvE deaths within the first 3 days of server playtime do not count towards your first character.`
        )
      );
    await interaction.followUp({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

    return true
  }
  // Mitigate PvE death if last death occurred within 1 hour
  else if (oneHourMitigation) {
    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# PvE death mitigated\n` +
          `PvE deaths within the same hour of most recent PvE death do not count towards your character.`
        )
      );
    await interaction.followUp({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

    return true
  }
  else {
    return false
  }
}