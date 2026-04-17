const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { Players, Characters } = require("../../dbObjects");

module.exports = {
  customId: 'region-manage-managers-button',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the region to get the managers
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();
    const region = await character.getRegion();
    const regionManagers = await region.getRegionManagers({
      include: [{
        model: Characters,
        as: 'character'
      }]
    });

    // Sort managers alphabetically by character name
    regionManagers.sort((a, b) => a.character.name.localeCompare(b.character.name));

    // Show the user the manager management menu:
    // - A button to add a manager
    // - A button to remove a manager
    // - A button to return to the region management menu

    const disableRemoveButton = regionManagers.length === 0;

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Manage Region Managers\n` +
          `In this menu, you can manage the region managers in your region, **${region.name}**. Region managers are responsible for managing the region in various ways, and have access to all of the same buttons that you do.\n\n` +
          `${regionManagers.length > 0 ? `Currently, the following characters in your region are region managers:\n${regionManagers.map(manager => `- ${manager.character.name}`).join('\n')}\n` : `There are currently no region managers in your region.\n`}`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Select an option below to manage region managers in your region.`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`region-add-manager-button`)
            .setLabel(`Add Manager`)
            .setEmoji('📜')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`region-remove-manager-button`)
            .setLabel(`Remove Manager`)
            .setEmoji('🥀')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disableRemoveButton),
          new ButtonBuilder()
            .setCustomId(`region-manager-return-button`)
            .setLabel(`Cancel`)
            .setStyle(ButtonStyle.Danger)
        ),
      );

    await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}