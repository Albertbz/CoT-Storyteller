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
    /game kick <player> [reason] – kick a player       (admin only)
 *
 * Admin restriction will be controlled by admin_role_id in DiscordRoles.Admin
 */
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
            .setName('kick')
            .setDescription('Kick a player from the server.')
            .addStringOption(opt => opt
                .setName('ign')
                .setDescription('Exact in-game player name.') /// Can make this an IGN search in the future
                .setRequired(true))
            .addStringOption(opt => opt
                .setName('reason')
                .setDescription('Reason for the kick.')
                .setRequired(false)))
        .addSubcommand(sub => sub
            .setName('give')
            .setDescription('Give a player an item, queued if offline.')
            .addStringOption(opt => opt.setName('ign').setDescription('Player IGN').setRequired(true))
            .addStringOption(opt => opt.setName('item').setDescription('Item code e.g. game:ingot-iron').setRequired(true))
            .addIntegerOption(opt => opt.setName('quantity').setDescription('Amount (default 1)').setMinValue(1).setRequired(false))
            .addStringOption(opt => opt.setName('attribute').setDescription('Attributes to modify, if wrong will default to none').setRequired(false)))

        .addSubcommand(sub => sub
            .setName('teleport')
            .setDescription('Teleport a player to coordinates, queued if offline.')
            .addStringOption(opt => opt.setName('ign').setDescription('Player IGN').setRequired(true))
            .addNumberOption(opt => opt.setName('x').setDescription('X coordinate').setRequired(true))
            .addNumberOption(opt => opt.setName('y').setDescription('Y coordinate').setRequired(true))
            .addNumberOption(opt => opt.setName('z').setDescription('Z coordinate').setRequired(true)))

        .addSubcommand(sub => sub
            .setName('whisper')
            .setDescription('Send a private message to a player, queued if offline.')
            .addStringOption(opt => opt.setName('ign').setDescription('Player IGN').setRequired(true))
            .addStringOption(opt => opt.setName('message').setDescription('Message to send').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('whitelist')
            .setDescription('Add a player to the server whitelist.')
            .addStringOption(opt => opt
                .setName('ign').setDescription('Player IGN').setRequired(true))
            .addBooleanOption(opt => opt
                .setName('status').setDescription("true whitelisted, false not whitelisted").setRequired(true)))
        ,      
    async  execute(interaction) {
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
        }
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

async function handleKick(interaction) {
    
    const player = interaction.options.getString('ign', true);
    const reason = interaction.options.getString('reason') ?? 'Kicked via Discord.';
    await interaction.deferReply();

    await bridgePost('/kick', { player, reason });

    await interaction.editReply(`✅ Kicked **${player}** — *${reason}*`);
    console.log(`[VSBridge] ${interaction.user.tag} kicked ${player}: ${reason}`);
}

async function handleGive(interaction) {
    const player = interaction.options.getString('ign', true);
    const item = interaction.options.getString('item', true);
    const quantity = interaction.options.getInteger('quantity') ?? 1;
    const attributes = interaction.options.getString('attribute') ?? '';
    await interaction.deferReply();

    const data = await bridgePost('/give', { player, item, quantity: String(quantity), attributes });
    const note = data.queued ? '*(player offline — will execute on next login)*' : '';
    await interaction.editReply(`✅ Gave **${quantity}x ${item}** to **${player}** ${note}`.trim());
}

async function handleTeleport(interaction) {
    const ign = interaction.options.getString('ign', true);
    const x = interaction.options.getNumber('x', true);
    const y = interaction.options.getNumber('y', true);
    const z = interaction.options.getNumber('z', true);
    await interaction.deferReply();

    const data = await bridgePost('/teleport', { player, x: String(x), y: String(y), z: String(z) });
    const note = data.queued ? '*(player offline — will execute on next login)*' : '';
    await interaction.editReply(`✅ Teleported **${player}** to ${x}, ${y}, ${z} ${note}`.trim());
}

async function handleWhisper(interaction) {
    const ign = interaction.options.getString('ign', true);
    const message = interaction.options.getString('message', true);
    await interaction.deferReply();

    const data = await bridgePost('/whisper', { player, message });
    const note = data.queued ? '*(player offline — will deliver on next login)*' : '';
    await interaction.editReply(`✅ Whispered to **${player}** ${note}`.trim());
  }

async function handleWhitelist(interaction) {
    const ign = interaction.options.getString('ign', true);
    const status = interaction.options.getBoolean('status', true);
    await interaction.deferReply();

    const body = {
        ign,
        status
    };

    const data = await bridgePost('/whitelist', {player: ign,
        status: String(status)});
    const action = status ? 'added to' : 'removed from';
    await interaction.editReply(`✅ **${ign}** has been ${action} the whitelist.`);
}

const subcommands = {
    status: handleStatus,
    date: handleDate,
    players: handlePlayers,
    kick: handleKick,
    give: handleGive,
    teleport: handleTeleport,
    whisper: handleWhisper,
    whitelist: handleWhitelist

}

