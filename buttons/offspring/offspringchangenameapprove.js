const { ContainerBuilder, TextDisplayBuilder, MessageFlags, inlineCode } = require("discord.js");
const { PlayableChildren, OffspringChangeNameRequests } = require("../../dbObjects");
const { changeCharacterInDatabase, COLORS, postInLogChannel } = require("../../misc");
const { formatCharacterName } = require("../../helpers/formatters");

module.exports = {
  customId: 'offspring-change-name-approve',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the offspring ID and new name from the customId, which is split by a :
    const [_, changeNameRequestId] = interaction.customId.split(':');
    const changeNameRequest = await OffspringChangeNameRequests.findByPk(changeNameRequestId);
    if (!changeNameRequest) {
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Error Approving Offspring Name Change\n` +
            `The name change request could not be found. It may have already been processed or deleted. Please try again or delete the request.`
          )
        )
        .setAccentColor(COLORS.RED);
      return interaction.followUp({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }
    const offspring = await changeNameRequest.getOffspring();
    const offspringCharacter = await offspring.getCharacter();

    const oldName = offspringCharacter.name;

    // Change the name of the offspring in the database
    const { character: updatedCharacter } = await changeCharacterInDatabase(interaction.user, offspringCharacter, true, { newName: changeNameRequest.newName });
    if (!updatedCharacter) {
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Error Changing Offspring Name\n` +
            `An error occurred while trying to change the name of ${formatCharacterName(oldName)} to ${formatCharacterName(changeNameRequest.newName)}. Please try again later.`
          )
        )
        .setAccentColor(COLORS.RED);
      return interaction.followUp({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Send a message to the player that requested the name change
    const requestedBy = await changeNameRequest.getRequestedBy();

    const approvalContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Offspring Name Change Approved\n` +
          `The name change request for the offspring ${formatCharacterName(oldName)} has been approved by staff. The name of ${formatCharacterName(oldName)} has now been changed to ${formatCharacterName(changeNameRequest.newName)}.`
        )
      )
      .setAccentColor(COLORS.GREEN);

    let user = null;
    try {
      user = await interaction.client.users.fetch(requestedBy.id);
      await user.send({ components: [approvalContainer], flags: [MessageFlags.IsComponentsV2] });

      await interaction.deleteReply();
      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Offspring Name Change Approved\n` +
            `You have approved the name change request for ${formatCharacterName(oldName)}. The name has now been changed to ${formatCharacterName(changeNameRequest.newName)}.`
          )
        )
        .setAccentColor(COLORS.GREEN);
      await interaction.followUp({ components: [successContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }
    catch (error) {
      console.log(`Could not send DM to requested by user with id ${requestedBy.id} for offspring name change approval.`, error.message);
      await interaction.deleteReply();
      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Offspring Name Change Approved\n` +
            `You have approved the name change request for ${formatCharacterName(oldName)}. The name has now been changed to ${formatCharacterName(changeNameRequest.newName)}. However, an error occurred while trying to notify ${user} to inform them of the approval. Please contact them manually to inform them of the approval and the name change.`
          )
        )
        .setAccentColor(COLORS.GREEN);
      await interaction.followUp({ components: [successContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    try {
      await postInLogChannel(
        `Offspring Name Change Approved`,
        `**Approved by:** ${interaction.user}\n\n` +
        `offspring: ${inlineCode(offspringCharacter.name)} (${inlineCode(offspring.id)})\n` +
        `newName: ${inlineCode(changeNameRequest.newName)}\n` +
        `requestedBy: ${user} (${inlineCode(user.id)})`,
        COLORS.GREEN
      )
    }
    catch (error) {
      console.error('Error posting offspring name change approval in log channel:', error);
    }

    return changeNameRequest.destroy();
  }
}