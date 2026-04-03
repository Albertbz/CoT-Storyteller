const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const { changePlayableChildInDatabase, COLORS } = require("../../misc");
const { PlayableChildren } = require("../../dbObjects");
const { formatCharacterName } = require("../../helpers/formatters");

module.exports = {
  customId: 'offspring-legitimise-approve',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the offspring from the customId, which is split by a :
    const offspringId = interaction.customId.split(':')[1]
    const offspring = await PlayableChildren.findByPk(offspringId);
    const offspringCharacter = await offspring.getCharacter();

    // Change the legitimacy of the offspring to Legitimised
    await changePlayableChildInDatabase(interaction.user, offspring, { newLegitimacy: 'Legitimised' });

    // Send a message to the contacts of the offspring to inform them of the legitimisation being approved
    const contacts = new Set();
    if (offspring.contact1Snowflake) contacts.add(offspring.contact1Snowflake);
    if (offspring.contact2Snowflake) contacts.add(offspring.contact2Snowflake);

    const approvalContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Offspring Legitimisation Approved\n` +
          `The legitimisation request for the offspring ${formatCharacterName(offspringCharacter.name)} has been approved by staff. ${formatCharacterName(offspringCharacter.name)} is now legitimised.`
        )
      )
      .setAccentColor(COLORS.GREEN);

    for (const contact of contacts) {
      try {
        const user = await interaction.client.users.fetch(contact);
        await user.send({ components: [approvalContainer], flags: [MessageFlags.IsComponentsV2] });
      }
      catch (error) {
        console.log(`Could not send DM to contact with id ${contact} for offspring legitimisation approval.`, error);
      }
    }

    await interaction.deleteReply();
    const successContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Offspring Legitimisation Approved\n` +
          `You have approved the legitimisation request for ${formatCharacterName(offspringCharacter.name)}. The offspring is now legitimised.`
        )
      )
      .setAccentColor(COLORS.GREEN);
    return interaction.followUp({ components: [successContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}