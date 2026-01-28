const { ContainerBuilder, ButtonBuilder, MessageFlags, ButtonStyle } = require('discord.js');

module.exports = {
  customId: 'character-notability-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    /**
     * Ensure the user wants to opt in to notability by editing the reply and
     * adding a button for confirmation.
     */
    const components = [];

    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Character Notability Opt-In\n` +
          `By opting in to notability, your character will be made mortal and will begin aging. It will also be possible for your character to participate in the offspring system. It is not possible to later opt out of notability, so make sure that you want to proceed.\n`
        )
      )
      .addSeparatorComponents((separator) => separator)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `If you are sure that you want to opt in to notability for your character, please click the "Confirm Notability Opt-In" button below.`
        )
      )
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId('character-notability-confirm-button')
            .setLabel('Confirm Notability Opt-In')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('character-manager-return-button')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        )
      );

    components.push(container);

    return interaction.editReply({ components: components, flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}