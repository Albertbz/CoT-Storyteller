const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require("discord.js");
const { Characters } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { formatCharacterName } = require("../helpers/formatters");
const { changeCharacterInDatabase } = require("../misc");
const { showMessageThenReturnToContainer } = require("../helpers/messageSender");
const { getRegionManagerContainer } = require("../helpers/containerCreator");

module.exports = {
  customId: 'region-add-noble-select',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the characterId from the select menu values
    const characterId = interaction.values[0];
    const character = await Characters.findByPk(characterId);

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Grant Nobility\n` +
          `You are granting nobility to ${formatCharacterName(character.name)}. This action will give the character noble status, which may grant them certain benefits and privileges depending on the region. The player of the character will also be notified that their character has been made a noble.`
        )
      ],
      'region-manager-return-button',
      async (interaction) => addNobleConfirm(interaction, character)
    )
  }
}

async function addNobleConfirm(interaction, character) {
  // Defer the interaction update to allow time to process
  await interaction.deferUpdate();

  // Notify the user that the character is being made noble
  const makingNobleContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Granting Nobility\n` +
        `Granting nobility to ${formatCharacterName(character.name)}. Please wait...`
      )
    )
  await interaction.editReply({ components: [makingNobleContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  // Update the character's social class to Noble in the database
  const { character: updatedCharacter } = await changeCharacterInDatabase(interaction.user, character, true, { newSocialClassName: 'Noble' });
  if (!updatedCharacter) {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Error Granting Nobility\n` +
          `There was an error granting nobility to ${formatCharacterName(character.name)}. Please try again later. If the issue persists, please contact a member of Staff.`
        )
      )

    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  // Send a notification to the player that their character has been made a noble
  const player = await updatedCharacter.getPlayer();
  const user = await interaction.client.users.fetch(player.id);
  const region = await updatedCharacter.getRegion();
  try {
    const nobleContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Character Granted Nobility\n` +
          `Your character ${formatCharacterName(character.name)} has been granted nobility in the region **${region.name}**. This means that your character may have certain benefits and privileges depending on the region. If you have any questions about what being a noble means in your region, please contact the ruler of **${region.name}**.`
        )
      )

    await user.send({ components: [nobleContainer], flags: [MessageFlags.IsComponentsV2] });

    // Inform the user that the character has been made a noble and the player has been notified
    return showMessageThenReturnToContainer(
      interaction,
      `# Nobility Granted\n` +
      `${formatCharacterName(character.name)} has been granted nobility and the player has been notified.`,
      10000,
      `Region Dashboard`,
      async () => getRegionManagerContainer(interaction.user.id)
    )
  }
  catch (error) {
    console.error(`Error sending DM to user ${user.id} about character being made noble:`, error.message);
    // If there was an error sending the DM (e.g. user has DMs closed), log the error but do not fail the entire operation
    return showMessageThenReturnToContainer(
      interaction,
      `# Nobility Granted\n` +
      `${formatCharacterName(character.name)} has been granted nobility in the region. However, there was an error sending a notification to ${user}. Please inform them of this change manually.`,
      10000,
      `Region Dashboard`,
      async () => getRegionManagerContainer(interaction.user.id)
    )
  }

}