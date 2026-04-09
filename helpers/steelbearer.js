const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const { formatCharacterName } = require("./formatters");
const { assignSteelbearerToRegion } = require("../misc");
const { showMessageThenReturnToContainer } = require("./messageSender");
const { getRegionManagerContainer } = require("./containerCreator");

async function addSteelbearerConfirm(interaction, character, region, type, { duchyId = null, vassalId = null } = {}) {
  // Defer update to allow time to process
  await interaction.deferUpdate();

  // Notify the user that the steelbearer is being added
  const addingContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Adding Steelbearer\n` +
        `The character ${formatCharacterName(character.name)} is being made a **${type}** steelbearer of **${region.name}**. This may take a few moments...`
      )
    )

  await interaction.editReply({ components: [addingContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  // Add the steelbearer to the database
  const { steelbearer } = await assignSteelbearerToRegion(interaction.user, character, type, duchyId, vassalId);
  if (!steelbearer) {
    return showMessageThenReturnToContainer(
      interaction,
      `# Issue Adding Steelbearer\n` +
      `There was an issue adding ${formatCharacterName(character.name)} as a steelbearer. Please try again later or contact a member of staff if the issue persists.`,
      10000,
      'Region Dashboard',
      async () => getRegionManagerContainer(interaction.user.id)
    );
  }

  // Notify the user 
  const player = await character.getPlayer();
  const user = await interaction.client.users.fetch(player.id);
  try {
    const madeSteelbearerContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Character Made Steelbearer\n` +
          `Your character ${formatCharacterName(character.name)} has been made a **${type}** steelbearer of **${region.name}**. This means that you are now able and allowed to wear steel plate and other similar armor in-game.`
        )
      )

    await user.send({ components: [madeSteelbearerContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

    return showMessageThenReturnToContainer(
      interaction,
      `# Steelbearer Added\n` +
      `${formatCharacterName(character.name)} has been made a **${type}** steelbearer of **${region.name}** and the player has been notified.`,
      10000,
      'Region Dashboard',
      async () => getRegionManagerContainer(interaction.user.id)
    )
  }
  catch (error) {
    console.log(`Could not send DM to user with id ${player.id} about being made steelbearer:`, error.message);
    return showMessageThenReturnToContainer(
      interaction,
      `# Steelbearer Added\n` +
      `${formatCharacterName(character.name)} has been made a **${type}** steelbearer of **${region.name}**, but there was an issue notifying ${user}. They may not have been notified of their new steelbearer status. Please contact them and let them know about their new steelbearer status.`,
      15000,
      'Region Dashboard',
      async () => getRegionManagerContainer(interaction.user.id)
    )
  }
}

module.exports = {
  addSteelbearerConfirm
}