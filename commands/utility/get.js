const { SlashCommandBuilder, InteractionContextType, MessageFlags, AttachmentBuilder } = require("discord.js");
const { Players } = require("../../dbObjects");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('get')
    .setDescription('Get something.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addSubcommand(subcommand =>
      subcommand
        .setName('players')
        .setDescription('Get a list of all players.')
        .addStringOption(option =>
          option
            .setName('include')
            .setDescription('Who to include in the list of players.')
            .addChoices(
              { name: 'All Players', value: 'all' },
              { name: 'Only Players Outside the Guild', value: 'outside_guild' },
              { name: 'Only Players Inside the Guild', value: 'inside_guild' }
            )
        )
    ),
  async execute(interaction) {
    // Defer reply to allow time to process
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'players') {
      const include = interaction.options.getString('include') || 'all';

      // Get all players
      const players = await Players.findAll();

      // Filter players based on guild membership if the option is set
      const filteredPlayers = [];
      for (const player of players) {
        // Check if player is in the guild, first by checking the cache, then by fetching from the API if not found in cache
        let member = interaction.guild.members.cache.get(player.id);
        if (!member) {
          member = await interaction.guild.members.fetch(player.id).catch(() => null);
        }
        const isInGuild = !!member;

        if (include === 'outside_guild' && isInGuild) {
          continue; // Skip players who are in the guild if onlyOutsideGuild is true
        }
        if (include === 'inside_guild' && !isInGuild) {
          continue; // Skip players who are not in the guild if onlyInsideGuild is true
        }
        filteredPlayers.push(player);
      }

      // Create an attachment with the list of players
      let playerListContent = 'ID - Has Character\n';
      for (const player of filteredPlayers) {
        const character = await player.getCharacter();
        playerListContent += `${player.id} - ${character ? 'Yes (' + character.id + ')' : 'No'}\n`;
      }
      const attachment = new AttachmentBuilder(Buffer.from(playerListContent), { name: 'players.txt' });

      await interaction.editReply({ files: [attachment] });
    }

  }
};