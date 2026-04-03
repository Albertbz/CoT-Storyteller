const { MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const { PlayableChildren } = require("../dbObjects");
const { COLORS } = require("../misc");
const { formatCharacterName } = require("../helpers/formatters");

module.exports = {
  customId: 'offspring-legitimise-deny-modal',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the offspring from the customId, which is split by a :
    const offspringId = interaction.customId.split(':')[1]
    const offspring = await PlayableChildren.findByPk(offspringId);
    const offspringCharacter = await offspring.getCharacter();

    // Get the reason for denying the legitimisation request from the modal submission
    const reason = interaction.fields.getTextInputValue('reason');

    // Send a message to the contacts of the offspring to inform them of the legitimisation being denied, including the reason for denying the request
    const contacts = new Set();
    if (offspring.contact1Snowflake) contacts.add(offspring.contact1Snowflake);
    if (offspring.contact2Snowflake) contacts.add(offspring.contact2Snowflake);

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

    for (const contact of contacts) {
      try {
        const user = await interaction.client.users.fetch(contact);
        await user.send({ components: [deniedContainer], flags: [MessageFlags.IsComponentsV2] });
      }
      catch (error) {
        console.error(`Could not send DM to contact with id ${contact} for offspring legitimisation denial.`, error);
      }
    }

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
    return interaction.followUp({ components: [deniedReasonContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}