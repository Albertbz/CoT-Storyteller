const { ContainerBuilder, MessageFlags, TextDisplayBuilder } = require("discord.js");
const { PlayableChildren, Characters, Players } = require("../../dbObjects");
const { askForConfirmation } = require("../../helpers/confirmations");
const { changePlayableChildInDatabase } = require("../../misc");
const { showMessageThenReturnToContainer } = require("../../helpers/messageSender");
const { getOffspringManagerContainer } = require("../../helpers/containerCreator");
const { formatCharacterName } = require("../../helpers/formatters");

module.exports = {
  customId: 'offspring-toggle-hidden',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    // Get the offspring ID from the customId, separated by :
    const offspringId = interaction.customId.split(':')[1];

    // Get the offspring from the database
    const offspring = await PlayableChildren.findByPk(offspringId, { include: { model: Characters, as: 'character' } });

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Toggle Hidden Status\n` +
          `You are currently ${offspring.hidden ? 'unhiding' : 'hiding'} this offspring. This means that the offspring will ${offspring.hidden ? 'be visible' : 'be hidden'} in the list of offspring that other players can apply to play and are able to see information about.`
        )
      ],
      'offspring-manager-return-button',
      (interaction) => toggleHiddenConfirm(interaction, offspring)
    )
  }
}

async function toggleHiddenConfirm(interaction, offspring) {
  // Defer the update to allow time to process
  await interaction.deferUpdate();

  // Create container to say that it is being updated
  const container = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# ${offspring.hidden ? 'Unhiding' : 'Hiding'} Offspring\n` +
        `The offspring, ${offspring.character ? formatCharacterName(offspring.character.name) : offspring.id}, is being ${offspring.hidden ? 'unhidden' : 'hidden'}. This may take a few moments...`
      )
    );

  await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  const { playableChild: updatedOffspring, _ } = await changePlayableChildInDatabase(interaction.user, offspring, { newHidden: !offspring.hidden });
  if (!updatedOffspring) {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Error ${offspring.hidden ? 'Unhiding' : 'Hiding'} Offspring\n` +
          `There was an error ${offspring.hidden ? 'unhiding' : 'hiding'} the offspring. Please contact a storyteller for assistance.`
        )
      )
    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  // Update the container to say that it has been updated
  return showMessageThenReturnToContainer(
    interaction,
    `# Offspring ${updatedOffspring.hidden ? 'Hidden' : 'Unhidden'}\n` +
    `The offspring has been successfully ${updatedOffspring.hidden ? 'hidden' : 'unhidden'}.`,
    10000,
    `Offspring Dashboard`,
    async () => getOffspringManagerContainer(interaction.user.id)
  )
}