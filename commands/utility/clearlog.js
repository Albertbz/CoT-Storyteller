const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, roleMention, EmbedBuilder, inlineCode, bold, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const { channels } = require('../../configs/ids.json');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear_log')
    .setDescription('Clear the Storyteller log channel of messages.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0),
  async execute(interaction) {
    await interaction.deferReply();

    // Fetch all messages from ticket channels
    const logChannel = interaction.client.channels.cache.get(channels.storytellerLog);

    let logMessages = [];
    console.log('\nFetching messages from log channel...');
    // Create message pointer
    let logMessage = await logChannel.messages
      .fetch({ limit: 1 })
      .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));

    while (logMessage) {
      await logChannel.messages
        .fetch({ limit: 100, before: logMessage.id })
        .then(messagePage => {
          messagePage.forEach(msg => logMessages.push(msg));

          // Update the message pointer to be the last message on the page of messages
          logMessage = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
        });
    }

    console.log(`Fetched ${logMessages.length} messages from log channel.`);

    // Ask for confirmation with a button
    const confirmButton = new ButtonBuilder()
      .setCustomId('confirmClearLog')
      .setLabel('Confirm Clear Log')
      .setStyle('Danger');

    const cancelButton = new ButtonBuilder()
      .setCustomId('cancelClearLog')
      .setLabel('Cancel')
      .setStyle('Secondary');

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    const confirmationMessage = await interaction.editReply({ content: `Are you sure you want to clear all ${logMessages.length} messages from the log channel? This action cannot be undone.`, components: [row] });

    // Create a message component collector to handle button clicks
    const filter = i => i.user.id === interaction.user.id;
    const collector = confirmationMessage.createMessageComponentCollector({ filter, time: 60000 });

    let confirmed = false;

    collector.on('collect', async i => {
      if (i.customId === 'confirmClearLog') {
        console.log('Log clear confirmed by user.');
        confirmed = true;
        await i.update({ content: 'Clearing log channel...', components: [] });
        collector.stop();
      } else if (i.customId === 'cancelClearLog') {
        console.log('Log clear cancelled by user.');
        confirmed = false;
        await i.update({ content: 'Log clear cancelled.', components: [] });
        collector.stop();
      }
    });

    collector.on('end', async collected => {
      // If ran out of time, change text
      if (collected.size === 0) {
        return interaction.editReply({ content: 'Log clear cancelled due to timeout.', components: [] });
      }

      if (!confirmed) {
        return interaction.editReply({ content: 'Log clear cancelled.', components: [] });
      }

      // Proceed to clear the log
      console.log('Clearing log channel...');

      // Bulk delete messages in chunks of 100
      for (let i = 0; i < logMessages.length; i += 100) {
        const chunk = logMessages.slice(i, i + 100);
        await logChannel.bulkDelete(chunk, true);
        console.log(`Deleted ${chunk.length} messages from log channel.`);
        // Update interaction reply to show progress
        await interaction.editReply({ content: `Clearing log channel... Deleted ${Math.min(i + 100, logMessages.length)} of ${logMessages.length} messages.`, components: [] });
      }

      console.log('Log channel cleared.');

      return interaction.editReply({ content: `Cleared ${logMessages.length} messages from the log channel.`, components: [] });
    });



  }
}