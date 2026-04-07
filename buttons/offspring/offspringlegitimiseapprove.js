const { ContainerBuilder, TextDisplayBuilder, MessageFlags, inlineCode } = require("discord.js");
const { changePlayableChildInDatabase, COLORS, changeCharacterInDatabase, postInLogChannel } = require("../../misc");
const { PlayableChildren, LegitimisationRequests } = require("../../dbObjects");
const { formatCharacterName } = require("../../helpers/formatters");

module.exports = {
  customId: 'offspring-legitimise-approve',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the offspring from the customId, which is split by a :
    const legitimisationRequestId = interaction.customId.split(':')[1]
    const legitimisationRequest = await LegitimisationRequests.findByPk(legitimisationRequestId);
    const offspring = await legitimisationRequest.getOffspring();
    const offspringCharacter = await offspring.getCharacter();

    // Change the legitimacy of the offspring to Legitimised
    const { playableChild: updatedOffspring } = await changePlayableChildInDatabase(interaction.user, offspring, { newLegitimacy: 'Legitimised' });
    if (!updatedOffspring) {
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Error Approving Legitimisation\n` +
            `An error occurred while trying to approve the legitimisation request for ${formatCharacterName(offspringCharacter.name)}. Please try again later.`
          )
        )
        .setAccentColor(COLORS.RED);
      return interaction.followUp({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }
    // Change the name of the offspring if the new name is different from the old name
    const oldName = offspringCharacter.name;
    if (legitimisationRequest.newName && legitimisationRequest.newName !== offspringCharacter.name) {
      const { character: updatedCharacter } = await changeCharacterInDatabase(interaction.user, offspringCharacter, true, { newName: legitimisationRequest.newName });
      if (!updatedCharacter) {
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# Error Changing Offspring Name\n` +
              `An error occurred while trying to change the name of ${formatCharacterName(oldName)} to ${formatCharacterName(legitimisationRequest.newName)}. However, the legitimisation of the offspring has still been approved. Please contact staff to resolve this issue.`
            )
          )
          .setAccentColor(COLORS.RED);
        return interaction.followUp({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
      }
    }


    // Send a message to the one that requested the legitimisation that their request has been approved
    const requestedBy = await legitimisationRequest.getRequestedBy();

    const approvalContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Offspring Legitimisation Approved\n` +
          `The legitimisation request for the offspring ${formatCharacterName(oldName)} has been approved by staff. ${formatCharacterName(oldName)} is now legitimised${legitimisationRequest.newName ? ` and has had their name changed to ${formatCharacterName(legitimisationRequest.newName)}` : ''}.`
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
            `# Offspring Legitimisation Approved\n` +
            `You have approved the legitimisation request for ${formatCharacterName(oldName)}. The offspring is now legitimised${legitimisationRequest.newName ? ` and has had their name changed to ${formatCharacterName(legitimisationRequest.newName)}` : ''}.`
          )
        )
        .setAccentColor(COLORS.GREEN);
      await interaction.followUp({ components: [successContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }
    catch (error) {
      console.log(`Could not send DM to requested by with id ${requestedBy.id} for offspring legitimisation approval.`, error.message);

      await interaction.deleteReply();
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Offspring Legitimisation Approved\n` +
            `You have approved the legitimisation request for ${formatCharacterName(oldName)}. The offspring is now legitimised${legitimisationRequest.newName ? ` and has had their name changed to ${formatCharacterName(legitimisationRequest.newName)}` : ''}. However, an error occurred while trying to notify ${user} to inform them of the approval. Please contact them manually.`
          )
        )
        .setAccentColor(COLORS.YELLOW);
      await interaction.followUp({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    await postInLogChannel(
      `Offspring Legitimisation Approved`,
      `**Approved by:** ${interaction.user}\n\n` +
      `offspring: ${inlineCode(offspringCharacter.name)} (${inlineCode(offspring.id)})\n` +
      `newName: ${inlineCode(legitimisationRequest.newName || '-')}\n` +
      `requestedBy: ${user} (${inlineCode(user.id)})`,
      COLORS.GREEN
    );

    return legitimisationRequest.destroy();
  }
}