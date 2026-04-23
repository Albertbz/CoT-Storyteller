const { ContainerBuilder, TextDisplayBuilder, MessageFlags, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, inlineCode } = require("discord.js");
const { Players } = require("../../dbObjects");

module.exports = {
  customId: 'player-manage-nickname-button',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the player
    const player = await Players.findByPk(interaction.user.id);

    /**
     * Create a container that shows the current nickname settings and the
     * resulting nickname with those settings, and allows the user to change
     * those settings with buttons to toggle:
     * 1. Whether to include the character title as a prefix in the nickname
     * 2. Whether to include the gamertag as a suffix in the nickname
     * 3. What the default nickname should be when no character is assigned
     */
    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Manage Nickname\n` +
          `When you are playing a character, your nickname will be displayed as:\n${inlineCode(`{Character Title}{Character Name} | {Gamertag}`)}\nwith the character title and gamertag included or excluded based on your settings.\nWhen you are not playing a character, your nickname will be your default nickname if you have set one, or it will show as "(no character)" if you haven't set a default nickname, with gamertag included if specified.\n` +
          `### Current Settings\n` +
          `**Character Title Prefix:** ${player.enableNicknameCharacterTitlePrefix ? 'Enabled' : 'Disabled'}\n` +
          `**Gamertag Suffix:** ${player.enableNicknameGamertagSuffix ? 'Enabled' : 'Disabled'}\n` +
          `**Default Nickname:** ${player.defaultNickname ? `${player.defaultNickname}` : '*None*'}\n` +
          `### Resulting Nickname\n` +
          `${await player.discordNickname}\n`
        )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Use the buttons below to change your nickname settings. Changes will be reflected in your nickname immediately.`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('player-toggle-character-title-prefix-button')
            .setLabel(`${player.enableNicknameCharacterTitlePrefix ? 'Disable' : 'Enable'} Character Title Prefix`)
            .setEmoji('🎩')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('player-toggle-gamertag-suffix-button')
            .setLabel(`${player.enableNicknameGamertagSuffix ? 'Disable' : 'Enable'} Gamertag Suffix`)
            .setEmoji('🎮')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('player-change-default-nickname-button')
            .setLabel('Change Default Nickname')
            .setEmoji('✏️')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('player-manager-return-button')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        )
      )

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}