const { ContainerBuilder, ButtonBuilder, MessageFlags, ButtonStyle, inlineCode } = require('discord.js');
const { Players } = require('../dbObjects.js');

module.exports = {
  customId: 'character-register-death-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();

    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Registering Character Death\n` +
          `This is to be used when your character has experienced a PvE or Final death.\n` +
          `Your character, **${inlineCode(character.name)}**, has currently experienced ${inlineCode(character.pveDeaths)} PvE deaths.`
        )
      )
      .addSeparatorComponents((separator) => separator)
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent('Please select what type of death you would like to register.\n'));

    const pveDeathButton = new ButtonBuilder()
      .setCustomId('character-pve-death-button')
      .setLabel('PvE death')
      .setEmoji('💀')
      .setStyle(ButtonStyle.Secondary);

    const finalDeathButton = new ButtonBuilder()
      .setCustomId('character-final-death-button')
      .setLabel('Final death')
      .setEmoji('💀')
      .setStyle(ButtonStyle.Secondary);

    const cancelButton = new ButtonBuilder()
      .setCustomId('character-manager-return-button')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger);

    if ((character.pveDeaths) < 2) {
      container.addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          pveDeathButton,
          finalDeathButton,
          cancelButton
        )
      );
    }
    else {
      container.addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          finalDeathButton,
          cancelButton
        )
      );
    }

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}