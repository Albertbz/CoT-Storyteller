const { SlashCommandBuilder, InteractionContextType, userMention, EmbedBuilder, inlineCode, bold, ButtonBuilder, ActionRowBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('count_whitelists')
    .setDescription('Count the number of whitelist applications denied and approved for each user.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addSubcommand(subcommand =>
      subcommand
        .setName('processed')
        .setDescription('Count the number of whitelist applications processed by each user.')
        .addBooleanOption(option =>
          option
            .setName('include_denied')
            .setDescription('Whether to include denied whitelist applications in the count.')
        )
        .addIntegerOption(option =>
          option
            .setName('days')
            .setDescription('Only show whitelist applications from the last N days.')
        )
    ),
  async execute(interaction) {
    await interaction.deferReply();

    // Fetch all messages from the whitelist applications channel
    const whitelistsChannel = interaction.client.channels.cache.get('1327928742080675870');

    let whitelistsMessages = [];
    console.log('\nFetching messages from whitelist applications channel...');
    // Create message pointer
    let whitelistsMessage = await whitelistsChannel.messages
      .fetch({ limit: 1 })
      .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));
    if (whitelistsMessage) {
      whitelistsMessages.push(whitelistsMessage);
    }

    while (whitelistsMessage) {
      await whitelistsChannel.messages
        .fetch({ limit: 100, before: whitelistsMessage.id })
        .then(messagePage => {
          messagePage.forEach(msg => whitelistsMessages.push(msg));

          // Update the message pointer to be the last message on the page of messages
          whitelistsMessage = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
        });
    }


    console.log(`Fetched ${whitelistsMessages.length} messages from whitelist applications channel.`);

    const subcommand = interaction.options.getSubcommand();

    let embedTitle = '';
    let whitelistCounts = new Map();
    let descriptionSuffix = '';
    let totalWhitelists = 0;

    // Handle 'closed' subcommand
    if (subcommand === 'processed') {
      const includeDenied = interaction.options.getBoolean('include_denied') ?? false;
      const days = interaction.options.getInteger('days') ?? null;

      // If days is specified, filter messages to only those within the last N days
      if (days !== null) {
        const now = Date.now();
        const cutoff = now - days * 24 * 60 * 60 * 1000;
        whitelistsMessages = whitelistsMessages.filter(msg => msg.createdTimestamp >= cutoff);
      }

      // Filter messages to those that say 'accepted successfully by' in the content
      // Also include 'denied successfully by' if includeDenied is true
      const newWhitelistsMessages = whitelistsMessages.filter(msg => {
        if (includeDenied) {
          return msg.content.includes('accepted successfully by') || msg.content.includes('denied successfully by');
        }
        else {
          return msg.content.includes('accepted successfully by');
        }
      });

      const oldWhitelistMessages = whitelistsMessages.filter(msg => {
        if (includeDenied) {
          return msg.content.includes('> accepted <') || msg.content.includes('> denied <');
        }
        else {
          return msg.content.includes('> accepted <');
        }
      });

      totalWhitelists = newWhitelistsMessages.length + oldWhitelistMessages.length;

      // Log how many messages are being processed
      console.log(`Processing ${totalWhitelists} processed whitelist messages...`);

      // Count whitelists per user
      for (const msg of newWhitelistsMessages) {
        if (includeDenied && msg.content.includes('denied successfully by')) {
          const denierId = msg.content.split('denied successfully by')[1].trim().split('>')[0].replace('<@', '').replace('!', '');
          whitelistCounts.set(denierId, (whitelistCounts.get(denierId) || 0) + 1);
        }
        else if (msg.content.includes('accepted successfully by')) {
          const closerId = msg.content.split('accepted successfully by')[1].trim().split('>')[0].replace('<@', '').replace('!', '');
          whitelistCounts.set(closerId, (whitelistCounts.get(closerId) || 0) + 1);
        }
      }

      for (const msg of oldWhitelistMessages) {
        if (includeDenied && msg.content.includes('> denied <')) {
          const denierId = msg.content.split('> denied <')[0].trim().replace('<@', '').replace('!', '');
          whitelistCounts.set(denierId, (whitelistCounts.get(denierId) || 0) + 1);
        }
        else if (msg.content.includes('> accepted <')) {
          const closerId = msg.content.split('> accepted <')[0].trim().replace('<@', '').replace('!', '');
          whitelistCounts.set(closerId, (whitelistCounts.get(closerId) || 0) + 1);
        }
      }

      // Set title and description suffix based on whether amount of days was specified
      embedTitle = includeDenied ? 'Accepted/Denied Whitelists Counts' : 'Accepted Whitelists Counts';
      descriptionSuffix = includeDenied ? 'accepted or denied' : 'accepted';
      if (days !== null) {
        embedTitle += ` (Last ${days} Days)`;
      }

    }

    // Sort whitelists counts descending
    whitelistCounts = new Map([...whitelistCounts.entries()].sort((a, b) => b[1] - a[1]));

    // Create reply message as embed
    let description = '';
    let amount = 0;
    const embeds = [];
    // Build embeds with a description of a max length of 4096 characters
    for (const [userId, count] of whitelistCounts.entries()) {
      const newLine = `${userMention(userId)}: ${bold(inlineCode(count.toString()))} whitelist${count > 1 ? 's' : ''} ${descriptionSuffix}\n`;
      // Check if adding this line would exceed the limit
      if (description.length + newLine.length > 3000) {
        // Create a new embed with the current description
        embeds.push(new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle(embedTitle)
          .setDescription(`Total whitelists: ${totalWhitelists}\n${description}`));
        // Reset description for the next embed
        description = newLine;
      }
      else {
        description += newLine;
      }
      amount += count;
    }

    // Add any remaining description as an embed
    if (description.length > 0) {
      embeds.push(new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(embedTitle)
        .setDescription(`Total whitelists: ${totalWhitelists}\n${description}`));
    }

    console.log(`Total whitelists counted: ${amount}`);

    // Add a left and right button to navigate between embeds if there are multiple
    if (embeds.length > 1) {
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('Previous')
            .setStyle('Primary'),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next')
            .setStyle('Primary')
        );
      await interaction.editReply({ embeds: [embeds[0]], components: [row] });

      let currentPage = 0;

      const filter = i => i.user.id === interaction.user.id;

      const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60_000 });

      collector.on('collect', async i => {
        if (i.customId === 'next') {
          currentPage = (currentPage + 1) % embeds.length;
          await i.update({ embeds: [embeds[currentPage]], components: [row] });
        }
        else if (i.customId === 'prev') {
          currentPage = (currentPage - 1 + embeds.length) % embeds.length;
          await i.update({ embeds: [embeds[currentPage]], components: [row] });
        }
      });

      collector.on('end', async () => {
        // Disable buttons after collector ends
        const disabledRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('prev')
              .setLabel('Previous')
              .setStyle('Primary')
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Next')
              .setStyle('Primary')
              .setDisabled(true)
          );
        await interaction.editReply({ embeds: [embeds[currentPage]], components: [disabledRow] });
      });

      return;
    }

    return interaction.editReply({ embeds: [embeds[0]] });
  }
}