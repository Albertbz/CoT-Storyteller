const { ContainerBuilder, ButtonBuilder, MessageFlags, ButtonStyle } = require('discord.js');


module.exports = {
  customId: 'character-register-death-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    const components = [];

    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Registering Character Deaths\n` +
          `This is to be used when your character has experienced a PVE or PVP death.\n`
        )
      )
      .addSeparatorComponents((separator) => separator)
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent('Please select what type of death you would like to register.\n'),
        (textDisplay) => textDisplay.setContent(`You have currently have ${inlineCode(character.pveDeaths)} PVE deaths. Once you have 3 PVE deaths, your next death will be registered as a PVP/Final Death.`))
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId('character-pve-death-button')
            .setLabel('Add PvE death')
            .setEmoji('💀')
            .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
            .setCustomId('character-pvp-death-button')
            .setLabel('Add PvP/Final Death')
            .setEmoji('💀')
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