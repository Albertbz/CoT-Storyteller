const { SlashCommandBuilder, InteractionContextType, MessageFlags, inlineCode, ContainerBuilder, TextDisplayBuilder, Message } = require("discord.js");
const { DiscordChannels, DiscordRoles } = require("../../dbObjects");
const { postInLogChannel, COLORS } = require("../../misc");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("register")
    .setDescription("Register something with the bot.")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addSubcommand(subcommand =>
      subcommand
        .setName('channel')
        .setDescription('Register a channel.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name/type of channel to register.')
            .setRequired(true)
            .addChoices(
              { name: 'Graveyard', value: 'graveyard' },
              { name: 'Log', value: 'log' },
              { name: 'Regions', value: 'regions' },
              { name: 'Approval', value: 'approval' },
              { name: 'Tickets', value: 'tickets' },
              { name: 'Whitelist', value: 'whitelist' }
            )
        )
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel to register.')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('role')
        .setDescription('Register a role.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name/type of role to register.')
            .setRequired(true)
            .addChoices(
              { name: 'Steelbearer', value: 'steelbearer' },
              { name: 'Banned', value: 'banned' },
              { name: 'Guest', value: 'guest' }
            )
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to register.')
            .setRequired(true)
        )
    )
  ,

  async execute(interaction) {
    // Defer reply as we may need some time to process the command
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();

    /**
     * Handle channel registration subcommand
     */
    if (subcommand === 'channel') {
      // Get the channel type and channel from the command options
      const channelName = interaction.options.getString('name');
      const channel = interaction.options.getChannel('channel');

      // Find or create the database entry for this channel type, and update
      // the channelId to be the id of the channel provided in the command
      const [dbChannel, created] = await DiscordChannels.findOrCreate({
        where: { name: channelName },
        defaults: { channelId: channel.id }
      });

      if (!created) {
        await dbChannel.update({ channelId: channel.id });
      }

      // Post a message in the log channel about the registration
      await postInLogChannel(
        `Registered Channel`,
        `Registered channel ${channel} as the ${inlineCode(channelName)} channel.`,
        COLORS.GREEN
      )

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Registered Channel\n` +
            `Registered channel ${channel} as the **${channelName}** channel.`
          )
        )
        .setAccentColor(COLORS.GREEN);

      return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }
    /**
     * Handle role registration subcommand
     */
    else if (subcommand === 'role') {
      // Get the role type and role from the command options
      const roleName = interaction.options.getString('name');
      const role = interaction.options.getRole('role');

      // Find or create the database entry for this role type, and update
      // the roleId to be the id of the role provided in the command
      const [dbRole, created] = await DiscordRoles.findOrCreate({
        where: { name: roleName },
        defaults: { roleId: role.id }
      });

      if (!created) {
        await dbRole.update({ roleId: role.id });
      }

      // Post a message in the log channel about the registration
      await postInLogChannel(
        `Registered Role`,
        `Registered role ${role} as the ${inlineCode(roleName)} role.`,
        COLORS.GREEN
      )

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Registered Role\n` +
            `Registered role ${role} as the **${roleName}** role.`
          )
        )
        .setAccentColor(COLORS.GREEN);

      return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

  }
}