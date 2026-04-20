const { ContainerBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { Players } = require("../../dbObjects");

module.exports = {
  customId: 'player-change-timezone-button',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    const player = await Players.findByPk(interaction.user.id);

    /**
     * Set up a string select menu with three three options for timezones,
     * grouped by regions, that the player can choose from to get to a different
     * page of timezones
     */
    const timezoneOptions = [
      new StringSelectMenuOptionBuilder().setLabel('The Americas & Pacific West').setDescription('Timezones in the Americas and Pacific West regions').setValue(`0`),
      new StringSelectMenuOptionBuilder().setLabel('Europe, Africa & Middle East').setDescription('Timezones in Europe, Africa and the Middle East regions').setValue(`1`),
      new StringSelectMenuOptionBuilder().setLabel('Asia & Oceania').setDescription('Timezones in Asia and Oceania regions').setValue(`2`)
    ]

    const timezoneSelectMenu = new StringSelectMenuBuilder()
      .setCustomId(`player-change-timezone-region-select`)
      .setPlaceholder('Select a region to view its timezones')
      .addOptions(timezoneOptions);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Change Timezone\n\n` +
          `Please select a region from the dropdown menu below to view the timezones in that region. Once you select a timezone, your timezone will be updated.`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(timezoneSelectMenu),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`player-remove-timezone-button`)
            .setLabel('Remove Timezone')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!player.timezone), // Disable the remove timezone button if the player doesn't have a timezone set
          new ButtonBuilder()
            .setCustomId('player-manager-return-button')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        )
      );

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}