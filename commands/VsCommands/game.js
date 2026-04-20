const { SlashCommandBuilder, EmbedBuilder, Colors } = require('discord.js');
const { bridgeGet, bridgePost } = require('../../helpers/StorytellerBridge.js');
const { admin_role_ids = [] } = require('../../configs/config.json'); /// for testing only

/*
 Slash command group: /game
 *
 Subcommands:
    /game status              – server status (players + date)
    /game date                – full in-game calendar
    /game players             – online player list
    /game command <cmd>       – run a server command  (admin only)
    /game kick <player> [reason] – kick a player       (admin only)
 *
 * Admin restriction will be controlled by admin_role_id in DiscordRoles.Admin
 */


function isAdmin(interaction) {
    if (!admin_role_ids.length) return true;
    return interaction.member?.roles?.cache?.some(r => admin_role_ids.includes(r.id)) ?? false;
}

async function handleStatus(interaction) {
    await interaction.deferReply();
    const data = await bridgeGet('/status');
    const d = data.date ?? {};

    const embed = new EmbedBuilder()
        .setTitle('🌍 Vintage Story — Server Status')
        .setColor(Colors.Blurple)
        .addFields(
            { name: 'Players Online', value: String(data.playerCount ?? 0), inline: true },
            { name: 'In-Game Date', value: d.dateFormatted ?? 'Unknown', inline: true },
        )
        .setFooter({ text: `Server time: ${data.serverTime ?? '?'}` });

    await interaction.editReply({ embeds: [embed] });
}

async function handleDate(interaction) {
    await interaction.deferReply();
    const d = await bridgeGet('/date');

    const embed = new EmbedBuilder()
        .setTitle('🗓️ In-Game Date & Time')
        .setColor(Colors.Green)
        .setDescription(`**${d.dateFormatted ?? 'Unknown'}**`)
        .addFields(
            { name: 'Year', value: String(d.year ?? '?'), inline: true },
            { name: 'Month', value: String(d.month ?? '?'), inline: true },
            { name: 'Day', value: String(d.day ?? '?'), inline: true },
        );

    await interaction.editReply({ embeds: [embed] });
}

async function handlePlayers(interaction) {
    await interaction.deferReply();
    const data = await bridgeGet('/players');
    const count = data.count ?? 0;
    const list = (data.players ?? []).map(p => `• ${p.name}`).join('\n') || '*No players online.*';

    const embed = new EmbedBuilder()
        .setTitle(`👥 Online Players (${count})`)
        .setColor(Colors.Gold)
        .setDescription(list);

    await interaction.editReply({ embeds: [embed] });
}

async function handleCommand(interaction) {
    if (!isAdmin(interaction)) {
        return interaction.reply({ content: '❌ You don\'t have permission to run server commands.', ephemeral: true });
    }

    const cmd = interaction.options.getString('cmd', true);
    await interaction.deferReply();

    await bridgePost('/command', { command: cmd });

    await interaction.editReply(`✅ Executed \`/${cmd.replace(/^\/+/, '')}\``);
    console.log(`[VSBridge] ${interaction.user.tag} ran command: ${cmd}`);
}

async function handleKick(interaction) {
    if (!isAdmin(interaction)) {
        return interaction.reply({ content: '❌ You don\'t have permission to kick players.', ephemeral: true });
    }

    const player = interaction.options.getString('player', true);
    const reason = interaction.options.getString('reason') ?? 'Kicked via Discord.';
    await interaction.deferReply();

    await bridgePost('/kick', { player, reason });

    await interaction.editReply(`✅ Kicked **${player}** — *${reason}*`);
    console.log(`[VSBridge] ${interaction.user.tag} kicked ${player}: ${reason}`);
}

// ── Route map ─────────────────────────────────────────────────────────────────

const subcommands = {
    status: handleStatus,
    date: handleDate,
    players: handlePlayers,
    command: handleCommand,
    kick: handleKick,
};

// ── Export (matches the pattern index.js expects) ─────────────────────────────

module.exports = {
    data: new SlashCommandBuilder()
        .setName('game')
        .setDescription('Vintage Story server commands')

        .addSubcommand(sub => sub
            .setName('status')
            .setDescription('Show server status: players online and in-game date.'))

        .addSubcommand(sub => sub
            .setName('date')
            .setDescription('Show the current in-game date.'))

        .addSubcommand(sub => sub
            .setName('players')
            .setDescription('List all players currently online.'))


        .addSubcommand(sub => sub
            .setName('command')
            .setDescription('[Admin] Execute a server command.')
            .addStringOption(opt => opt
                .setName('cmd')
                .setDescription('Command to run (with or without leading slash).')
                .setRequired(true)))

        .addSubcommand(sub => sub
            .setName('kick')
            .setDescription('[Admin] Kick a player from the server.')
            .addStringOption(opt => opt
                .setName('player')
                .setDescription('Exact in-game player name.') /// Can make this an IGN search in the future
                .setRequired(true))
            .addStringOption(opt => opt
                .setName('reason')
                .setDescription('Reason for the kick.')
                .setRequired(false))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const handler = subcommands[sub];

        if (!handler) {
            return interaction.reply({ content: `Unknown subcommand: \`${sub}\``, ephemeral: true });
        }

        try {
            await handler(interaction);
        } catch (err) {
            console.error(`[StorytellerBridge] Error in /game ${sub}:`, err.message);
            const msg = `❌ Bridge error: \`${err.message}\``;
            if (interaction.deferred) {
                await interaction.editReply(msg);
            } else {
                await interaction.reply({ content: msg, ephemeral: true });
            }
        }
    },
};