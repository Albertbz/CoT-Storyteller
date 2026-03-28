const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const { PlayableChildren } = require("../../dbObjects");
const { changeCharacterInDatabase, COLORS } = require("../../misc");

module.exports = {
  customId: 'offspring-change-name-approve',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the offspring ID and new name from the customId, which is split by a :
    const [_, offspringId, newName] = interaction.customId.split(':');
    const offspring = await PlayableChildren.findByPk(offspringId);
    const offspringCharacter = await offspring.getCharacter();

    const oldName = offspringCharacter.name;

    // Change the name of the offspring in the database
    await changeCharacterInDatabase(interaction.user, offspringCharacter, true, { newName: newName });

    // Send a message to the contacts of the offspring to inform them of the name change
    const contacts = new Set();
    if (offspring.contact1Snowflake) contacts.add(offspring.contact1Snowflake);
    if (offspring.contact2Snowflake) contacts.add(offspring.contact2Snowflake);

    const approvalContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Offspring Name Change Approved\n` +
          `The name change request for the offspring **${oldName}** has been approved by staff. The name of **${oldName}** has now been changed to **${newName}**.`
        )
      )
      .setAccentColor(COLORS.GREEN);

    for (const contact of contacts) {
      try {
        const user = await interaction.client.users.fetch(contact);
        await user.send({ components: [approvalContainer], flags: [MessageFlags.IsComponentsV2] });
      }
      catch (error) {
        console.log(`Could not send DM to contact with id ${contact} for offspring name change approval.`, error);
      }
    }

    await interaction.deleteReply();
    return interaction.followUp({ content: `You have approved the name change request for **${oldName}**. The name has now been changed to **${newName}**.`, flags: [MessageFlags.Ephemeral] });
  }
}