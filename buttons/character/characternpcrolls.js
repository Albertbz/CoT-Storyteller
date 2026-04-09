const { ContainerBuilder, MessageFlags, TextDisplayBuilder, SeparatorBuilder, TimestampStyles, time } = require('discord.js');
const { Players } = require('../../dbObjects.js');
const { askForConfirmation } = require('../../helpers/confirmations.js');
const { changeCharacterInDatabase } = require('../../misc.js');
const { getCharacterManagerContainer } = require('../../helpers/containerCreator.js');
const { showMessageThenReturnToContainer } = require('../../helpers/messageSender.js');
const { formatCharacterName } = require('../../helpers/formatters.js');

module.exports = {
  customId: 'character-npc-rolls-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    /**
     * Ensure the user wants to opt in/out of NPC rolls by editing the reply and
     * adding a button for confirmation.
     */
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();

    const optInDescription = 'You are opting in to NPC rolls, which means your character will be included in rolls that can result in bastard children with an NPC.';
    const optOutDescription = 'You are opting out of NPC rolls, which means your character will not be included in rolls that can result in bastard children with an NPC.';

    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# ${character.isRollingForBastards ? `Opt out of NPC Rolls` : `Opt in to NPC Rolls`}\n` +
          `${character.isRollingForBastards ? optOutDescription : optInDescription}`
        )
      ],
      'character-manager-return-button',
      (interaction) => characterNPCRollsConfirm(interaction)
    )
  }
}

async function characterNPCRollsConfirm(interaction) {
  // Defer the update to allow time to process
  await interaction.deferUpdate();

  /**
     * Notify the user of NPC rolls opt-in/out change in progress
     */
  const player = await Players.findByPk(interaction.user.id);
  const character = await player.getCharacter();

  const npcRollsText = character.isRollingForBastards ? 'Opting out of NPC Rolls...' : 'Opting in to NPC Rolls...';

  const container = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# ${npcRollsText}\n` +
        `Your character is being updated to ${character.isRollingForBastards ? 'opt out of' : 'opt in to'} NPC rolls. This may take a few moments...`
      )
    );

  await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  /**
   * Update the character's NPC rolls opt-in/out status
   */
  const { character: changedCharacter, embed: _ } = await changeCharacterInDatabase(interaction.user, character, true, { newIsRollingForBastards: !character.isRollingForBastards });
  if (!changedCharacter) {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Error Updating NPC Rolls Opt-In/Out Status\n` +
          `There was an error updating your character's NPC rolls opt-in/out status. Please contact a storyteller for assistance.`
        )
      )
    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  /**
   * Notify the user of successful NPC rolls opt-in/out status update
   */
  const newNpcRollsText = changedCharacter.isRollingForBastards ? 'Opted in to NPC Rolls' : 'Opted out of NPC Rolls';

  return showMessageThenReturnToContainer(
    interaction,
    `# ${newNpcRollsText}\n` +
    `Your character, ${formatCharacterName(changedCharacter.name)}, has been successfully ${changedCharacter.isRollingForBastards ? 'opted in to' : 'opted out of'} NPC rolls.`,
    10000,
    'Character Dashboard',
    async () => getCharacterManagerContainer(interaction.user.id)
  )
}