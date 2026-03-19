const { SlashCommandBuilder, InteractionContextType, MessageFlags, inlineCode, ContainerBuilder, TextDisplayBuilder, Message } = require("discord.js");
const { DiscordChannels } = require("../../dbObjects");
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
            .setName('type')
            .setDescription('The type of channel to register.')
            .setRequired(true)
            .addChoices(
              { name: 'Graveyard', value: 'graveyard' },
              { name: 'Log', value: 'log' },
              { name: 'Regions', value: 'regions' },
            )
        )
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel to register.')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    // Defer reply as we may need some time to process the command
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'channel') {
      // Get the channel type and channel from the command options
      const channelType = interaction.options.getString('type');
      const channel = interaction.options.getChannel('channel');

      // Find or create the database entry for this channel type, and update
      // the channelId to be the id of the channel provided in the command
      const [dbChannel, created] = await DiscordChannels.findOrCreate({
        where: { name: channelType },
        defaults: { channelId: channel.id }
      });

      if (!created) {
        await dbChannel.update({ channelId: channel.id });
      }

      // Post a message in the log channel about the registration
      await postInLogChannel(
        `Registered Channel`,
        `Registered channel ${channel} as the ${inlineCode(channelType)} channel.`,
        COLORS.GREEN
      )

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Registered Channel\n` +
            `Registered channel ${channel} as the **${channelType}** channel.`
          )
        )
        .setAccentColor(COLORS.GREEN);

      return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

  }
}