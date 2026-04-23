const { ContainerBuilder, TextDisplayBuilder, MessageFlags, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, inlineCode, SectionBuilder } = require("discord.js");
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
    const character = await player.getCharacter();
    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Manage Nickname\n` +
          `When you are playing a character, your nickname will be displayed as:` +
          `\n${inlineCode(`{Character Title }{Character Name}{ | Gamertag}`)}\n` +
          `with the character title and gamertag included or excluded based on your settings.\n` +
          `When you are not playing a character, your nickname will be your default nickname if you have set one, or it will show as "(no character)" if you haven't set a default nickname, with gamertag included if specified.`
        )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Character Title Prefix** *(${player.enableNicknameCharacterTitlePrefix ? 'enabled' : 'disabled'})*\n` +
              `${character ? character.title ? `${character.title}` : '*No character title specified...*' : '*Not currently playing a character...*'}`
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId('player-toggle-character-title-prefix-button')
              .setLabel(`${player.enableNicknameCharacterTitlePrefix ? 'Disable' : 'Enable'} Character Title Prefix`)
              .setEmoji('🎩')
              .setStyle(ButtonStyle.Secondary)
          )
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Gamertag Suffix** *(${player.enableNicknameGamertagSuffix ? 'enabled' : 'disabled'})*\n` +
              `${player.gamertag ? player.gamertag : '*No gamertag specified...*'}`
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId('player-toggle-gamertag-suffix-button')
              .setLabel(`${player.enableNicknameGamertagSuffix ? 'Disable' : 'Enable'} Gamertag Suffix`)
              .setEmoji('🎮')
              .setStyle(ButtonStyle.Secondary)
          )
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Default Nickname**\n` +
              `${player.defaultNickname ? player.defaultNickname : '*None*'}`
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId('player-change-default-nickname-button')
              .setLabel('Change Default Nickname')
              .setEmoji('✏️')
              .setStyle(ButtonStyle.Secondary)
          )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# Current Resulting Nickname\n` +
              `Based on your current settings, your nickname is displayed as:\n` +
              `**${await player.discordNickname}**`
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId('player-manager-return-button')
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Danger)
          )
      );

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}