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

    try {
      await syncSpreadsheetsToDatabase();

      return interaction.editReply({
        content: 'The data has been written.', flags: MessageFlags.Ephemeral
      });
    }
    catch (error) {
      return interaction.editReply({ content: error.message || 'An error occurred while writing data to the spreadsheets.', flags: MessageFlags.Ephemeral });
    }

  }
}