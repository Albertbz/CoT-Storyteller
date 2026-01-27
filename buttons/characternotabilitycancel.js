const { MessageFlags, ContainerBuilder } = require('discord.js');

module.exports = {
  customId: 'character-notability-cancel-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    /**
     * Notify the user that the notability opt-in has been cancelled
     */
    const components = [];

    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Notability Opt-In Cancelled\n` +
          `You have chosen to cancel the notability opt-in for your character. As such, your character remains a commoner.\n` +
          `You can continue to manage your character using the Character Manager GUI above.`
        )
      );

    components.push(container);

    return interaction.editReply({ components: components, flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}