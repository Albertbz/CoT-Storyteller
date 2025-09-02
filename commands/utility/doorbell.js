const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, roleMention } = require('discord.js');
const { Players, Characters, ActiveCharacters, Affiliations } = require('../../dbObjects.js');
const { roles, channels } = require('../../configs/ids.json');
const { Op } = require('sequelize');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('doorbell')
    .setDescription('Ring the doorbell of one of the Houses.')
    .setContexts(InteractionContextType.Guild)
    .addStringOption(option =>
      option
        .setName('house')
        .setDescription('The House that you are ringing a doorbell at.')
        .setRequired(true)
        .addChoices(
          { name: 'Aetos', value: roles.aetos },
          { name: 'Ayrin', value: roles.ayrin },
          { name: 'Dayne', value: roles.dayne },
          { name: 'Farring', value: roles.farring },
          { name: 'Locke', value: roles.locke },
          { name: 'Merrick', value: roles.merrick },
          { name: 'Wildhart', value: roles.wildhart }
        )
    )
    .addStringOption(option =>
      option
        .setName('text')
        .setDescription('The text that you would like to go alongside the doorbell ping.')
        .setRequired(true)
        .setMaxLength(150)
    ),
  async execute(interaction) {
    const houseId = interaction.options.getString('house');
    const text = interaction.options.getString('text');

    const doorbellChannel = await interaction.guild.channels.fetch(channels.doorbell);

    const message = '*' + text + '*\n||' + roleMention(houseId) + '||';
    doorbellChannel.send({ content: message })

    const doorbellLogChannel = await interaction.guild.channels.fetch(channels.doorbellLog);
    const logMessage = userMention(interaction.user.id) + ' ran the doorbell command with the following text: `' + text + '`';
    doorbellLogChannel.send({ content: logMessage })

    return interaction.reply({ content: 'The doorbell has been rung.', flags: MessageFlags.Ephemeral })
  }
}