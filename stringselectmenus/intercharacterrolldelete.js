const { MessageFlags, ContainerBuilder } = require("discord.js");
const { Relationships, Characters } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { removeRelationshipFromDatabase } = require("../misc");

module.exports = {
  customId: 'intercharacter-roll-delete-select',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    /**
     * Get the selected intercharacter roll from the select menu, and then 
     * ask the user to confirm that they want to delete the intercharacter roll. 
     * If they confirm, delete the intercharacter roll from the database, 
     * and then send a message confirming that the intercharacter roll 
     * has been deleted.
     */
    const selectedRollId = interaction.values[0];
    const roll = await Relationships.findByPk(selectedRollId, {
      include: [
        { model: Characters, as: 'bearingCharacter' },
        { model: Characters, as: 'conceivingCharacter' }
      ]
    });

    if (!roll) {
      return interaction.followUp({ content: 'The selected intercharacter roll does not exist. Please select a valid intercharacter roll.', flags: [MessageFlags.Ephemeral] });
    }

    return askForConfirmation(
      interaction,
      'Confirm Intercharacter Roll Deletion',
      `You are currently deleting the intercharacter roll between **${roll.bearingCharacter.name}** and **${roll.conceivingCharacter.name}**. Are you sure you want to proceed? This action cannot be undone.`,
      (interaction) => intercharacterRollDeleteConfirm(interaction, roll)
    )
  }
}

async function intercharacterRollDeleteConfirm(interaction, roll) {
  // Defer the update to allow time to process
  await interaction.deferUpdate();

  /**
   * Edit the message to say that the roll is being deleted
   */
  const deletingContainer = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# Deleting Intercharacter Roll\nDeleting the intercharacter roll between **${roll.bearingCharacter.name}** and **${roll.conceivingCharacter.name}**. This may take a moment...`
      )
    );

  await interaction.editReply({ components: [deletingContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  /**
   * Delete the intercharacter roll from the database
   */
  const rollInfo = await roll.formattedInfo;
  await removeRelationshipFromDatabase(interaction.user, roll);

  /**
   * Edit the message to say that the roll has been deleted
   */
  const deletedContainer = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# Intercharacter Roll Deleted\nThe intercharacter roll has been deleted.`
      )
    );

  await interaction.editReply({ components: [deletedContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  // Send a DM to the other player to notify them that the intercharacter roll has been deleted
  const bearingPlayer = await roll.bearingCharacter.getPlayer();
  const conceivingPlayer = await roll.conceivingCharacter.getPlayer();

  if (!bearingPlayer || !conceivingPlayer) {
    // If either character does not have a player (for example if they are a playable child), skip this step
    return;
  }

  const otherPlayer = bearingPlayer.id === interaction.user.id ? conceivingPlayer : bearingPlayer;
  // const otherUser = await interaction.client.users.fetch(otherPlayer.id);
  const otherUser = await interaction.client.users.fetch('249586641402986497'); // TEMPORARY HARDCODED USER ID FOR TESTING - REPLACE WITH OTHER PLAYER ID WHEN DONE TESTING

  try {
    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Intercharacter Roll Deleted\nThe intercharacter roll between **${roll.bearingCharacter.name}** and **${roll.conceivingCharacter.name}** has been deleted by ${interaction.user}.\n\n` +
          `${rollInfo}`
        )
      );

    await otherUser.send({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
  catch (error) {
    console.error(`Error sending DM to player ${otherPlayer.id} about intercharacter roll deletion:`, error);
    await interaction.followUp({ content: 'There was an error sending a notification about the deletion to the other player. This may be because they have DMs disabled. However, the intercharacter roll has been successfully deleted.', flags: [MessageFlags.Ephemeral] });
  }
  return;
}