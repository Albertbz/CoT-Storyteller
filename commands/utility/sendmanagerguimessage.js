const { SlashCommandBuilder, InteractionContextType, MessageFlags, ContainerBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sendmanagerguimessage')
    .setDescription('Send a manager GUI message to the channel this command is used in.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addSubcommand(subcommand =>
      subcommand
        .setName('character')
        .setDescription('Send the character manager GUI message in this channel.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('region')
        .setDescription('Send the region manager GUI message in this channel.')
    )
  ,
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'character') {

      const message = await createCharacterManagerMessage();
      const sentMessage = await interaction.channel.send(message);

      return interaction.editReply(`Character manager GUI message sent: ${sentMessage.url}.`);
    }

    if (subcommand === 'region') {
      return interaction.editReply('Region manager GUI message not yet implemented.');
    }

    return interaction.editReply('Unknown subcommand.');
  }
}

/**
 * Create and return the character manager GUI message.
 */
async function createCharacterManagerMessage() {
  // Components array to hold all the message components
  const components = [];

  const container = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# Character Manager\n` +
        `In this channel, you can manage your current character and any offspring that you are a contact for.`
      ))
    .addSeparatorComponents((separator) => separator)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `Use the menu below to select what you would like to manage.`
      ))
    .addActionRowComponents((actionRow) =>
      actionRow.setComponents(
        new StringSelectMenuBuilder()
          .setCustomId('character-manager-select')
          .setPlaceholder('Select what to manage...')
          .addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel('Character')
              .setDescription('Create a new character, or edit your currently played character.')
              .setValue('manage-character'),
            new StringSelectMenuOptionBuilder()
              .setLabel('Offspring')
              .setDescription('Manage all offspring that you are a contact for.')
              .setValue('manage-offspring')
          )
      )
    )

  components.push(container);

  // Return the message object
  return { components: components, flags: MessageFlags.IsComponentsV2 };
}