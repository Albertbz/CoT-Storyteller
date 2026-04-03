const { SlashCommandBuilder, InteractionContextType, MessageFlags, ContainerBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('senddashboards')
    .setDescription('Send a message with the dashboards to the channel this command is used in.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
  ,
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const message = await createDashboardMessage();
    const sentMessage = await interaction.channel.send(message);

    return interaction.editReply(`Dashboard message sent: ${sentMessage.url}.`);
  }
}

/**
 * Create and return the dashboard message.
 */
async function createDashboardMessage() {
  // Components array to hold all the message components
  const components = [];

  const container = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# Dashboards\n` +
        `In this channel, you can manage your current character, any offspring that you are a contact of, as well as the region your character is in (assuming you have the appropriate permissions).`
      ))
    .addSeparatorComponents((separator) => separator)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `Use the menu below to select what you would like to manage.`
      ))
    .addActionRowComponents((actionRow) =>
      actionRow.setComponents(
        new ButtonBuilder()
          .setCustomId('character-manager-button')
          .setLabel('Character')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('👤')
        ,
        new ButtonBuilder()
          .setCustomId('offspring-manager-button')
          .setLabel('Offspring')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('👶')
        ,
        new ButtonBuilder()
          .setCustomId('region-manager-button')
          .setLabel('Region')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🗺️')
      )
    )

  components.push(container);

  // Return the message object
  return { components: components, flags: MessageFlags.IsComponentsV2 };
}