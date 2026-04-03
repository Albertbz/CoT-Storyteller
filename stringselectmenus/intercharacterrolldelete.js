const { MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const { Relationships, Characters, Players } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { removeRelationshipFromDatabase } = require("../misc");
const { showMessageThenReturnToContainer } = require("../helpers/messageSender");
const { getCharacterManagerContainer } = require("../helpers/containerCreator");

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
      const notFoundContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Intercharacter Roll Not Found\n` +
            `The intercharacter roll you selected could not be found. Please select a valid intercharacter roll to delete.`
          )
        );
      return interaction.followUp({ components: [notFoundContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Confirm Intercharacter Roll Deletion\n` +
          `You are currently deleting the intercharacter roll between **${roll.bearingCharacter.name}** and **${roll.conceivingCharacter.name}**. Are you sure you want to proceed? This action cannot be undone.`
        )
      ],
      'character-manager-return-button',
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
        `# Deleting Intercharacter Roll\n` +
        `Deleting the intercharacter roll between **${roll.bearingCharacter.name}** and **${roll.conceivingCharacter.name}**. This may take a moment...`
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
  const player = await Players.findByPk(interaction.user.id);
  const character = await player.getCharacter();
  await showMessageThenReturnToContainer(
    interaction,
    `# Intercharacter Roll Deleted\n` +
    `The intercharacter roll between **${roll.bearingCharacter.name}** and **${roll.conceivingCharacter.name}** has been deleted.`,
    10000,
    `Character Dashboard`,
    async () => getCharacterManagerContainer(character)
  )

  // Send a DM to the other player to notify them that the intercharacter roll has been deleted
  const bearingPlayer = await roll.bearingCharacter.getPlayer();
  const conceivingPlayer = await roll.conceivingCharacter.getPlayer();

  if (!bearingPlayer || !conceivingPlayer) {
    // If either character does not have a player (for example if they are a playable child), skip this step
    return;
  }

  const otherPlayer = bearingPlayer.id === interaction.user.id ? conceivingPlayer : bearingPlayer;
  const otherUser = await interaction.client.users.fetch(otherPlayer.id);

  try {
    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Intercharacter Roll Deleted\n` +
          `The intercharacter roll between **${roll.bearingCharacter.name}** and **${roll.conceivingCharacter.name}** has been deleted by ${interaction.user}.\n\n` +
          `${rollInfo}`
        )
      );

    await otherUser.send({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
  catch (error) {
    console.error(`Error sending DM to player ${otherPlayer.id} about intercharacter roll deletion:`, error);
    const noDmContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Could Not Notify Other Player\n` +
          `The intercharacter roll was successfully deleted, but there was an error sending a DM to the other player to notify them of the deletion. This may be because they have DMs disabled. Please ask them to enable DMs so they can be notified of important updates like this in the future.`
        )
      );
    await interaction.followUp({ components: [noDmContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
  return;
}