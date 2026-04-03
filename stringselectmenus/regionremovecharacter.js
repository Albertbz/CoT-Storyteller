const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');
const { askForConfirmation } = require('../helpers/confirmations');
const { Characters, Players, Regions, Steelbearers } = require('../dbObjects');
const { formatCharacterName } = require('../helpers/formatters');
const { changeCharacterInDatabase, COLORS } = require('../misc');
const { WANDERER_REGION_ID } = require('../constants');
const { showMessageThenReturnToContainer } = require('../helpers/messageSender');
const { getRegionManagerContainer } = require('../helpers/containerCreator');

module.exports = {
  customId: 'region-remove-character-select',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get selected character id from the select menu
    const selectedCharacterId = interaction.values[0];
    const selectedCharacter = await Characters.findByPk(selectedCharacterId);
    // Ensure that the character is part of the same region as that of the user
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();
    const region = await character.getRegion();
    if (selectedCharacter.regionId !== region.id) {
      const otherRegionContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Character Not Found in Region\n` +
            `The selected character ${formatCharacterName(selectedCharacter.name)} is not in your region ${region.name}. Please select a character that is in your region.`
          )
        )

      return interaction.followUp({ components: [otherRegionContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Also check whether the selected character is a steelbearer. If so, do not
    // allow them to be removed from the region
    const steelbearerEntry = await Steelbearers.findOne({ where: { characterId: selectedCharacter.id } });
    if (steelbearerEntry) {
      const steelbearerContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Cannot Remove Steelbearer from Region\n` +
            `The selected character ${formatCharacterName(selectedCharacter.name)} is a steelbearer in the region and cannot be removed. If you want to remove them from the region, you must first remove them as a steelbearer.`
          )
        )

      return interaction.followUp({ components: [steelbearerContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Removing Character from Region\n` +
          `You are removing ${formatCharacterName(selectedCharacter.name)} from the region. This action will notify the player of the character that they have been removed from the region.`
        )
      ],
      'region-manager-return-button',
      async (interaction) => removeCharacterFromRegionConfirm(interaction, selectedCharacter)
    )
  }
}

async function removeCharacterFromRegionConfirm(interaction, character) {
  // Defer update to allow time to process
  await interaction.deferUpdate();

  // Inform the user that the character is being removed from the region
  const removingContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Removing Character from Region\n` +
        `Removing ${formatCharacterName(character.name)} from the region and notifying the player. Please wait...`
      )
    )

  await interaction.editReply({ components: [removingContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  const oldRegion = await character.getRegion();
  // Remove the character from the region by changing their region to wanderer
  const { character: updatedCharacter } = await changeCharacterInDatabase(interaction.user, character, true, { newRegionId: WANDERER_REGION_ID });
  if (!updatedCharacter) {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Error Removing Character from Region\n` +
          `An error occurred while trying to remove ${formatCharacterName(character.name)} from the region. Please try again later or contact a member of Staff.`
        )
      )
    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  // Send a notification to the player that their character has been removed from the region
  const player = await updatedCharacter.getPlayer();
  const user = await interaction.client.users.fetch(player.id);
  const newRegion = await updatedCharacter.getRegion();
  try {
    const removedContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Character Removed from Region\n` +
          `Hi ${user}! Your character ${formatCharacterName(character.name)} has been removed from the region **${oldRegion.name}** and changed to the **${newRegion.name}** region. If you believe this was a mistake or have any questions, please contact the ruler of **${oldRegion.name}** or a member of Staff.`
        )
      )
      .setAccentColor(COLORS.RED)
    await user.send({ components: [removedContainer], flags: [MessageFlags.IsComponentsV2] });

    // Inform the user that the character has been removed and the player has been notified
    return showMessageThenReturnToContainer(
      interaction,
      `# Character Removed from Region\n` +
      `${formatCharacterName(character.name)} has been removed from the region and the player has been notified.`,
      10000,
      'Region Dashboard',
      async () => getRegionManagerContainer(interaction.user.id)
    )
  }
  catch (error) {
    console.error(`Error sending DM to user ${user.id} about character removal from region:`, error.message);
    // If there was an error sending the DM (e.g. user has DMs closed), log the error but do not fail the entire operation
    return showMessageThenReturnToContainer(
      interaction,
      `# Character Removed from Region\n` +
      `${formatCharacterName(character.name)} has been removed from the region. However, there was an error sending a DM to the player to notify them of the removal. They may not be aware that their character has been removed, so please also try to notify them through other means if possible. We apologize for the inconvenience.`,
      15000,
      'Region Dashboard',
      async () => getRegionManagerContainer(interaction.user.id)
    )
  }
}