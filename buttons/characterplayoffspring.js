const { ContainerBuilder, MessageFlags, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  customId: 'character-play-offspring-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    /**
     * Create a message that has two buttons, one for playing one of your own
     * offspring, and one for playing someone else's offspring.
     */
    const components = [];

    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Play as Offspring Character\n` +
          `You have chosen to play as an offspring character. Please select one of the options below to proceed.`
        )
      )
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId('character-play-own-offspring-button')
            .setLabel('Play Own Offspring')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('👶'),
          new ButtonBuilder()
            .setCustomId('character-play-others-offspring-button')
            .setLabel("Play Someone Else's Offspring")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🤝')
        )
      );

    components.push(container);

    return interaction.editReply({ components: components, flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

}