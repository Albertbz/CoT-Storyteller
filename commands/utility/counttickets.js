const { SlashCommandBuilder, InteractionContextType, userMention, EmbedBuilder, inlineCode, bold, ButtonBuilder, ActionRowBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('count_tickets')
    .setDescription('Count the number of tickets for each user.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addSubcommand(subcommand =>
      subcommand
        .setName('closed')
        .setDescription('Count the number of tickets closed by each user.')
        .addBooleanOption(option =>
          option
            .setName('include_denied')
            .setDescription('Whether to include denied tickets in the count.')
        )
        .addIntegerOption(option =>
          option
            .setName('days')
            .setDescription('Only show tickets from the last N days.')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('created')
        .setDescription('Count the number of tickets created by each user.')
    ),
  async execute(interaction) {
    await interaction.deferReply();

    // Fetch all messages from ticket channels
    const ticketsChannel = interaction.client.channels.cache.get('1372947144436355172');
    const reportsChannel = interaction.client.channels.cache.get('1373194981937774613');
    const theftsChannel = interaction.client.channels.cache.get('1374704462106591293');

    let ticketsMessages = [];
    console.log('\nFetching messages from tickets channel...');
    // Create message pointer
    let ticketsMessage = await ticketsChannel.messages
      .fetch({ limit: 1 })
      .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));
    if (ticketsMessage) {
      ticketsMessages.push(ticketsMessage);
    }

    while (ticketsMessage) {
      await ticketsChannel.messages
        .fetch({ limit: 100, before: ticketsMessage.id })
        .then(messagePage => {
          messagePage.forEach(msg => ticketsMessages.push(msg));

          // Update the message pointer to be the last message on the page of messages
          ticketsMessage = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
        });
    }

    // Fetch messages from reports channel
    let reportsMessages = [];
    console.log('\nFetching messages from reports channel...');
    let reportsMessage = await reportsChannel.messages
      .fetch({ limit: 1 })
      .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));

    if (reportsMessage) {
      reportsMessages.push(reportsMessage);
    }

    while (reportsMessage) {
      await reportsChannel.messages
        .fetch({ limit: 100, before: reportsMessage.id })
        .then(messagePage => {
          messagePage.forEach(msg => reportsMessages.push(msg));
          reportsMessage = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
        });
    }

    // Fetch messages from thefts channel
    let theftsMessages = [];
    console.log('\nFetching messages from thefts channel...');
    let theftsMessage = await theftsChannel.messages
      .fetch({ limit: 1 })
      .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));
    if (theftsMessage) {
      theftsMessages.push(theftsMessage);
    }

    while (theftsMessage) {
      await theftsChannel.messages
        .fetch({ limit: 100, before: theftsMessage.id })
        .then(messagePage => {
          messagePage.forEach(msg => theftsMessages.push(msg));
          theftsMessage = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
        });
    }

    // Get all old tickets messages
    const oldTicketsChannel = interaction.client.channels.cache.get('1327766228424589322');
    console.log('\nFetching messages from old tickets channel...');
    let oldTicketsMessages = [];
    let oldTicketsMessage = await oldTicketsChannel.messages
      .fetch({ limit: 1 })
      .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));
    if (oldTicketsMessage) {
      oldTicketsMessages.push(oldTicketsMessage);
    }

    while (oldTicketsMessage) {
      await oldTicketsChannel.messages
        .fetch({ limit: 100, before: oldTicketsMessage.id })
        .then(messagePage => {
          messagePage.forEach(msg => oldTicketsMessages.push(msg));
          oldTicketsMessage = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
        });
    }

    // Combine all messages except old tickets (they use other formats)
    ticketsMessages = ticketsMessages.concat(reportsMessages, theftsMessages);

    console.log(`Fetched ${ticketsMessages.length} messages from tickets channels.`);


    const subcommand = interaction.options.getSubcommand();

    let embedTitle = '';
    let ticketCounts = new Map();
    let descriptionSuffix = '';

    // Handle 'closed' subcommand
    if (subcommand === 'closed') {
      const includeDenied = interaction.options.getBoolean('include_denied') ?? false;
      const days = interaction.options.getInteger('days') ?? null;

      // If days is specified, filter messages to only those within the last N days
      if (days !== null) {
        const now = Date.now();
        const cutoff = now - days * 24 * 60 * 60 * 1000;
        ticketsMessages = ticketsMessages.filter(msg => msg.createdTimestamp >= cutoff);
      }

      // Filter messages to those that say 'was closed by' in the content
      // Also include 'was denied by' if includeDenied is true
      ticketsMessages = ticketsMessages.filter(msg => {
        if (includeDenied) {
          return msg.content.includes('was closed by') || msg.content.includes('was denied by');
        }
        else {
          return msg.content.includes('was closed by');
        }
      });

      // Log how many messages are being processed
      console.log(`Processing ${ticketsMessages.length} closed/denied ticket messages...`);


      // Count tickets per user
      for (const msg of ticketsMessages) {
        if (includeDenied && msg.content.includes('was denied by')) {
          const denierId = msg.content.split('was denied by')[1].trim().split(' ')[0].replace('<@', '').replace('>', '').replace('!', '').replace(',', '');
          ticketCounts.set(denierId, (ticketCounts.get(denierId) || 0) + 1);
        }
        else if (msg.content.includes('was closed by')) {
          const closerId = msg.content.split('was closed by')[1].trim().split(' ')[0].replace('<@', '').replace('>', '').replace('!', '').replace(',', '');
          ticketCounts.set(closerId, (ticketCounts.get(closerId) || 0) + 1);
        }
      }

      // If days is specified, filter old tickets messages to only those within the last N days
      if (days !== null) {
        const now = Date.now();
        const cutoff = now - days * 24 * 60 * 60 * 1000;
        oldTicketsMessages = oldTicketsMessages.filter(msg => msg.createdTimestamp >= cutoff);
      }

      // Filter old tickets messages similarly, but with new format where
      // there is a field 'Closed by' as name and value being the user mention
      // No need to check for denied separately, as closed tickets include both closed and denied
      oldTicketsMessages = oldTicketsMessages.filter(msg => {
        return msg.embeds.length > 0 && msg.embeds[0].fields.some(field => field.name === 'Closed by');
      });

      // Count tickets per user from old tickets messages
      for (const msg of oldTicketsMessages) {
        const closedByField = msg.embeds[0].fields.find(field => field.name === 'Closed by');
        if (closedByField) {
          const closerId = closedByField.value.replace('<@', '').replace('>', '').replace('!', '').replace(',', '');
          ticketCounts.set(closerId, (ticketCounts.get(closerId) || 0) + 1);
        }
      }

      // Log how many old messages are being processed
      console.log(`Processing ${oldTicketsMessages.length} old closed/denied ticket messages...`);


      // Set title and description suffix based on whether amount of days was specified
      embedTitle = includeDenied ? 'Closed/Denied Ticket Counts' : 'Closed Ticket Counts';
      descriptionSuffix = includeDenied ? 'closed or denied' : 'closed';
      if (days !== null) {
        embedTitle += ` (Last ${days} Days)`;
      }

    }
    else if (subcommand === 'created') {
      // Filter messages to those that say 'was created by' in the content
      ticketsMessages = ticketsMessages.filter(msg => msg.content.includes('was created by'));

      // Count tickets per user
      for (const msg of ticketsMessages) {
        const creatorId = msg.content.split('was created by')[1].trim().split('\n')[0].replace('<@', '').replace('>', '').replace('!', '').replace(',', '');
        ticketCounts.set(creatorId, (ticketCounts.get(creatorId) || 0) + 1);
      }

      embedTitle = 'Created Ticket Counts';
      descriptionSuffix = 'created';
    }


    // Sort ticket counts descending
    ticketCounts = new Map([...ticketCounts.entries()].sort((a, b) => b[1] - a[1]));

    // Create reply message as embed
    let description = '';
    let amount = 0;
    const embeds = [];
    // Build embeds with a description of a max length of 4096 characters
    for (const [userId, count] of ticketCounts.entries()) {
      const newLine = `${userMention(userId)}: ${bold(inlineCode(count.toString()))} ticket${count > 1 ? 's' : ''} ${descriptionSuffix}\n`;
      // Check if adding this line would exceed the limit
      if (description.length + newLine.length > 3000) {
        // Create a new embed with the current description
        embeds.push(new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle(embedTitle)
          .setDescription(`Total tickets: ${ticketsMessages.length + oldTicketsMessages.length}\n${description}`));
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
        .setDescription(`Total tickets: ${ticketsMessages.length + oldTicketsMessages.length}\n${description}`));
    }

    console.log(`Total tickets counted: ${amount}`);

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