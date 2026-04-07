const { MessageFlags, ContainerBuilder, TextDisplayBuilder, codeBlock, inlineCode } = require("discord.js");
const { PlayableChildren, OffspringChangeNameRequests } = require("../dbObjects");
const { COLORS, postInLogChannel } = require("../misc");
const { formatCharacterName } = require("../helpers/formatters");

module.exports = {
  customId: 'offspring-change-name-deny-modal',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the offspring from the customId, which is split by a :
    const changeNameRequestId = interaction.customId.split(':')[1];
    const changeNameRequest = await OffspringChangeNameRequests.findByPk(changeNameRequestId);
    const offspring = await changeNameRequest.getOffspring();
    const offspringCharacter = await offspring.getCharacter();

    // Get the reason for denying the name change request from the modal submission
    const reason = interaction.fields.getTextInputValue('reason');

    // Send a message to the player that requested the name change
    const requestedBy = await changeNameRequest.getRequestedBy();

    const deniedContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Offspring Name Change Denied\n` +
          `The name change request for the offspring ${formatCharacterName(offspringCharacter.name)} has been denied by staff.\n` +
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
            `# Offspring Name Change Denied\n` +
            `You have denied the name change request for ${formatCharacterName(offspringCharacter.name)}.\n` +
            `**Reason for denial:**\n` +
            `>>> ${reason}`
          )
        )
        .setAccentColor(COLORS.RED);
      await interaction.followUp({ components: [deniedReasonContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }
    catch (error) {
      console.error(`Could not send DM to contact with id ${requestedBy.id} for offspring name change denial.`, error.message);

      await interaction.deleteReply();
      const deniedReasonContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Offspring Name Change Denied\n` +
            `You have denied the name change request for ${formatCharacterName(offspringCharacter.name)}. However, there was an error while trying to notify ${user}. Please ensure they are aware that their request has been denied.\n` +
            `**Reason for denial:**\n` +
            `>>> ${reason}`
          )
        )
        .setAccentColor(COLORS.RED);
      await interaction.followUp({ components: [deniedReasonContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    try {
      await postInLogChannel(
        `Offspring Name Change Denied`,
        `**Denied by:** ${interaction.user}\n\n` +
        `offspring: ${inlineCode(offspringCharacter.name)} (${inlineCode(offspring.id)})\n` +
        `newName: ${inlineCode(changeNameRequest.newName)}\n` +
        `requestedBy: ${user} (${inlineCode(user.id)})\n` +
        `reason:\n${codeBlock(reason)}\n`,
        COLORS.RED
      );
    }
    catch (error) {
      console.error('Error posting offspring name change denial in log channel:', error);
    }

    return changeNameRequest.destroy();
  }
}