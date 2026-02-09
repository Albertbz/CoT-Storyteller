const { ButtonBuilder, ContainerBuilder, MessageFlags, ButtonStyle } = require('discord.js');
const { Players } = require('../dbObjects');

module.exports = {
  customId: 'character-npc-rolls-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    /**
     * Ensure the user wants to opt in/out of NPC rolls by editing the reply and
     * adding a button for confirmation.
     */
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();

    const npcRollsText = character.isRollingForBastards ? 'Opt out of NPC Rolls' : 'Opt in to NPC Rolls';

    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# ${npcRollsText}\n` +
          `By opting in to NPC rolls, your character will be included in rolls that can result in bastard children with an NPC. If you opt out, your character will not be included in these rolls.`
        )
      )
      .addSeparatorComponents((separator) => separator)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `If you are sure that you want to ${character.isRollingForBastards ? 'opt out of' : 'opt in to'} NPC rolls for your character, please click the "Confirm ${npcRollsText}" button below.`
        )
      )
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId('character-npc-rolls-confirm-button')
            .setLabel(`Confirm ${npcRollsText}`)
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('character-manager-return-button')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        )
      );

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}