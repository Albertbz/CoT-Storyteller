const { MessageFlags, ContainerBuilder, inlineCode, ButtonStyle, ButtonBuilder } = require("discord.js");
const { Players } = require("../dbObjects.js");

module.exports = {
  customId: 'manage-character-button',
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const components = [];

    // Get player that invoked the interaction
    const player = await Players.findByPk(interaction.user.id);
    if (!player) {
      return {
        content: 'You are not registered as a player. Please make a ticket to register.',
        flags: MessageFlags.Ephemeral,
      };
    }

    const character = await player.getCharacter();

    const container = new ContainerBuilder()

    if (character) {
      container
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `# Managing your current character, **${inlineCode(character.name)}**.\n` +
            `Use the buttons below to manage various aspects of your character.`
          )
        )
        .addActionRowComponents((actionRow) =>
          actionRow.setComponents(
            new ButtonBuilder()
              .setCustomId('character-change-surname-button')
              .setLabel('Change Surname')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('✍️'),
            new ButtonBuilder()
              .setCustomId('character-change-region-button')
              .setLabel('Change Region/House')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('🏠'),
            new ButtonBuilder()
              .setCustomId('character-notability-button')
              .setLabel('Opt in to Notability')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('⭐'),
            new ButtonBuilder()
              .setCustomId('character-register-death-button')
              .setLabel('Register Death')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('💀')
          )
        )
        .addActionRowComponents((actionRow) =>
          actionRow.setComponents(
            new ButtonBuilder()
              .setCustomId('character-npc-rolls-button')
              .setLabel('Opt in/out of NPC Rolls')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('🎲'),
            new ButtonBuilder()
              .setCustomId('character-intercharacter-rolls-button')
              .setLabel('Opt in/out of Intercharacter Rolls')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('👥')
          )
        );
    }
    else {
      container
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `# You do not currently have a character.\n` +
            `Use the buttons below to create a new character or to play a playable child.`
          )
        )
        .addActionRowComponents((actionRow) =>
          actionRow.setComponents(
            new ButtonBuilder()
              .setCustomId('character-create-button')
              .setLabel('Create New Character')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('🆕'),
            new ButtonBuilder()
              .setCustomId('character-play-child-button')
              .setLabel('Play a Playable Child')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('👶')
          )
        );
    }

    components.push(container);

    const message =
    {
      components: components,
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    }

    return interaction.editReply(message);
  }
}