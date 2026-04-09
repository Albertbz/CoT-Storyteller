const { MessageFlags, ContainerBuilder, TextDisplayBuilder, inlineCode, codeBlock } = require("discord.js");
const { PlayableChildren, LegitimisationRequests } = require("../dbObjects");
const { COLORS, postInLogChannel } = require("../misc");
const { formatCharacterName } = require("../helpers/formatters");

module.exports = {
  customId: 'offspring-legitimise-deny-modal',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the offspring from the customId, which is split by a :
    const legitimisationRequestId = interaction.customId.split(':')[1];
    const legitimisationRequest = await LegitimisationRequests.findByPk(legitimisationRequestId);
    const offspring = await legitimisationRequest.getOffspring();
    const offspringCharacter = await offspring.getCharacter();

    // Get the reason for denying the legitimisation request from the modal submission
    const reason = interaction.fields.getTextInputValue('reason');

    // Send a message to the player that requested the legitimisation to inform them that their request has been denied, along with the reason for denial
    const requestedBy = await legitimisationRequest.getRequestedBy();

    const deniedContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Offspring Legitimisation Denied\n` +
          `The legitimisation request for the offspring ${formatCharacterName(offspringCharacter.name)} has been denied by staff.\n` +
          `**Reason for denial:**\n` +
          `>>> ${reason}`
        )
      )
      .setAccentColor(COLORS.RED);

    let user = null;
    try {
      user = await interaction.client.users.fetch(requestedBy.id);
      await user.send({ components: [deniedContainer], flags: [MessageFlags.IsComponentsV2] });

      await interaction.deleteReply();
      const deniedReasonContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Offspring Legitimisation Denied\n` +
            `You have denied the legitimisation request for ${formatCharacterName(offspringCharacter.name)}.\n` +
            `**Reason for denial:**\n` +
            `>>> ${reason}`
          )
        )
        .setAccentColor(COLORS.RED);
      await interaction.followUp({ components: [deniedReasonContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }
    catch (error) {
      console.error(`Could not send DM to user with id ${requestedBy.id} for offspring legitimisation denial.`, error);

      await interaction.deleteReply();
      const deniedReasonContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Offspring Legitimisation Denied\n` +
            `You have denied the legitimisation request for ${formatCharacterName(offspringCharacter.name)}. However, an error occurred while trying to notify ${user} to inform them of the denial. Please contact them manually to inform them of the denial and the reason for it.\n` +
            `**Reason for denial:**\n` +
            `>>> ${reason}`
          )
        )
        .setAccentColor(COLORS.RED);


      await interaction.followUp({ components: [deniedReasonContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    try {
      await postInLogChannel(
        `Offspring Legitimisation Denied`,
        `**Denied by:** ${interaction.user}\n\n` +
        `offspring: ${inlineCode(offspringCharacter.name)} (${inlineCode(offspring.id)})\n` +
        `newName: ${inlineCode(legitimisationRequest.newName || '-')}\n` +
        `requestedBy: ${user} (${inlineCode(user.id)})\n` +
        `reason:\n${codeBlock(reason)}`,
        COLORS.RED
      )
    }
    catch (error) {
      console.error('Error posting offspring legitimisation denial in log channel.', error);
    }

    await legitimisationRequest.destroy();
  }
}