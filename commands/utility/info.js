const { SlashCommandBuilder, InteractionContextType, EmbedBuilder, MessageFlags, userMention } = require('discord.js');
const { Players, Characters, ActiveCharacters } = require('../../dbObjects.js');
const { Op } = require('sequelize');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Get info about a player or a character.')
    .setContexts(InteractionContextType.Guild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('player')
        .setDescription('Get info about a player.')
        .addUserOption(option => option.setName('user').setDescription('The user.').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('character')
        .setDescription('Get info about a character.')
        .addStringOption(option => option.setName('name').setDescription('The name of the character.').setRequired(true).setAutocomplete(true))
    ),
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const characters = await Characters.findAll({
      where: { name: { [Op.startsWith]: focusedValue } },
      attributes: ['name', 'id']
    });
    await interaction.respond(characters.splice(0, 25).map(character => ({ name: character.name, value: character.id })))
  },
  async execute(interaction) {
    if (interaction.options.getSubcommand() === 'player') {
      const user = interaction.options.getUser('user');

      const player = await Players.findOne({ where: { id: user.id } });

      const embed = new EmbedBuilder()
        .setTitle('Result')
        .setDescription('Info about: ' + userMention(user.id))
        .addFields(
          { name: '\u200b', value: '\u200b', inline: true },
          { name: '\u200b', value: '***Player Info***', inline: true },
          { name: '\u200b', value: '\u200b', inline: true },
        )
        .addFields(
          { name: 'Discord Username', value: '`' + user.username + '`', inline: true },
          { name: 'VS Username', value: '`' + player.ign + '`', inline: true },
          { name: 'Timezone', value: '`' + player.timezone + '`', inline: true },
        )

      const activeCharacter = await ActiveCharacters.findOne({
        include: [
          { model: Characters, as: 'character' }
        ],
        where: { playerId: user.id },
        attributes: []
      })

      if (activeCharacter) {
        const character = activeCharacter.character;
        embed
          .addFields(
            { name: '\u200b', value: '\u200b', inline: true },
            { name: '\u200b', value: '***Character Info***', inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
          )
          .addFields(
            { name: 'Name', value: '`' + character.name + '`', inline: true },
            { name: 'Sex', value: '`' + character.sex + '`', inline: true },
            { name: 'Affiliation', value: '`' + character.affiliation + '`', inline: true },
            { name: 'Social Class', value: '`' + character.socialClass + '`', inline: true },
            { name: 'Year of Maturity', value: '`' + character.yearOfMaturity + '`', inline: true },
            { name: 'PvE Deaths', value: '`' + character.pveDeaths + '`', inline: true },
          )
      }
      else {
        embed
          .addFields(
            { name: '\u200b', value: '\u200b', inline: true },
            { name: '\u200b', value: '***Character Info***', inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
          )
          .addFields(
            { name: 'Currently not playing a character.', value: '\u200b' }
          )
      }

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
    else if (interaction.options.getSubcommand() === 'character') {
      const characterId = interaction.options.getString('name');

      const character = await Characters.findOne({ where: { id: characterId } });

      const embed = new EmbedBuilder()
        .setTitle('Result')
        .setDescription('Info about: ' + character.name)
        .addFields(
          { name: '\u200b', value: '\u200b', inline: true },
          { name: '\u200b', value: '***Character Info***', inline: true },
          { name: '\u200b', value: '\u200b', inline: true },
        )
        .addFields(
          { name: 'Name', value: '`' + character.name + '`', inline: true },
          { name: 'Sex', value: '`' + character.sex + '`', inline: true },
          { name: 'Affiliation', value: '`' + character.affiliation + '`', inline: true },
          { name: 'Social Class', value: '`' + character.socialClass + '`', inline: true },
          { name: 'Year of Maturity', value: '`' + character.yearOfMaturity + '`', inline: true },
          { name: 'PvE Deaths', value: '`' + character.pveDeaths + '`', inline: true },
        )

      const activeCharacter = await ActiveCharacters.findOne({
        include: { model: Players, as: 'player' },
        where: { characterId: character.id },
        attributes: []
      });

      if (activeCharacter) {
        const player = activeCharacter.player;
        const user = await interaction.client.users.fetch(player.id);
        // const user = member.user;

        embed
          .addFields(
            { name: '\u200b', value: '\u200b', inline: true },
            { name: '\u200b', value: '***Player Info***', inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
          )
          .addFields(
            { name: 'Discord Username', value: '`' + user.username + '`', inline: true },
            { name: 'VS Username', value: '`' + player.ign + '`', inline: true },
            { name: 'Timezone', value: '`' + player.timezone + '`', inline: true },
          )
      }
      else {
        embed
          .addFields(
            { name: '\u200b', value: '\u200b', inline: true },
            { name: '\u200b', value: '***Player Info***', inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
          )
          .addFields(
            { name: 'Currently not played by a player.', value: '\u200b' }
          )
      }

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
}