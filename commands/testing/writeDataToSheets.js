const { SlashCommandBuilder, InteractionContextType, MessageFlags } = require('discord.js');
const { syncSpreadsheetsToDatabase } = require('../../spreadsheetSync.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('write_data_to_sheet')
    .setDescription('Write all of the current data to the spreadsheets.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    await syncSpreadsheetsToDatabase();

    return interaction.editReply({
      content: 'The data has been written.', flags: MessageFlags.Ephemeral
    });
  }
}