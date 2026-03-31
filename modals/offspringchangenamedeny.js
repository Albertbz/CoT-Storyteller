const { MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const { PlayableChildren } = require("../dbObjects");
const { COLORS } = require("../misc");

module.exports = {
  customId: 'offspring-change-name-deny-modal',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the offspring from the customId, which is split by a :
    const offspringId = interaction.customId.split(':')[1]
    const offspring = await PlayableChildren.findByPk(offspringId);
    const offspringCharacter = await offspring.getCharacter();

    // Get the reason for denying the name change request from the modal submission
    const reason = interaction.fields.getTextInputValue('reason');

    // Send a message to the contacts of the offspring to inform them of the name change being denied, including the reason for denying the request
    const contacts = new Set();
    if (offspring.contact1Snowflake) contacts.add(offspring.contact1Snowflake);
    if (offspring.contact2Snowflake) contacts.add(offspring.contact2Snowflake);

    const deniedContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Offspring Name Change Denied\n` +
          `The name change request for the offspring **${offspringCharacter.name}** has been denied by staff.\n` +
          `**Reason for denial:**\n` +
          `> ${reason}`
        )
      )
      .setAccentColor(COLORS.RED);

    for (const contact of contacts) {
      try {
        const user = await interaction.client.users.fetch(contact);
        await user.send({ components: [deniedContainer], flags: [MessageFlags.IsComponentsV2] });
      }
      catch (error) {
        console.error(`Could not send DM to contact with id ${contact} for offspring name change denial.`, error);
      }
    }

    await interaction.deleteReply();
    const deniedReasonContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Offspring Name Change Denied\n` +
          `You have denied the name change request for **${offspringCharacter.name}**.\n` +
          `**Reason for denial:**\n` +
          `> ${reason}`
        )
      )
      .setAccentColor(COLORS.RED);
    return interaction.followUp({ components: [deniedReasonContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}