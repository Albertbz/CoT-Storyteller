const { ButtonBuilder, ContainerBuilder, MessageFlags, ButtonStyle } = require('discord.js');
const { Players } = require('../dbObjects');
const { askForConfirmation } = require('../helpers/confirmations');
const { changeCharacterInDatabase } = require('../misc.js');

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
    await interaction.followUp({ content: 'There was an error updating your character\'s NPC rolls opt-in/out status. Please contact a storyteller for assistance.', flags: MessageFlags.Ephemeral });
    return;
  }

  /**
   * Notify the user of successful NPC rolls opt-in/out status update
   */
  container.spliceComponents(0, container.components.length); // Clear container components

  const newNpcRollsText = changedCharacter.isRollingForBastards ? 'Opted in to NPC Rolls' : 'Opted out of NPC Rolls';

  container
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# ${newNpcRollsText}\n` +
        `Your character, **${changedCharacter.name}**, has been successfully updated to ${changedCharacter.isRollingForBastards ? 'opt in to' : 'opt out of'} NPC rolls.\n` +
        `You can continue to manage your character using the Character Manager GUI above.`
      )
    );

  return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
}

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
      character.isRollingForBastards ? 'Opt out of NPC Rolls' : 'Opt in to NPC Rolls',
      character.isRollingForBastards ? optOutDescription : optInDescription,
      (interaction) => characterNPCRollsConfirm(interaction)
    )
  }
}