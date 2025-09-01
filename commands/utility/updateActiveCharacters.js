const { SlashCommandBuilder, InteractionContextType, EmbedBuilder, MessageFlags, userMention } = require('discord.js');
const { Players, Characters, ActiveCharacters } = require('../../dbObjects.js');
const { channels } = require('../../configs/ids.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('update-active-characters')
    .setDescription('Updates the active characters embed.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0),
  async execute(interaction) {
    const activeCharactersList = await ActiveCharacters.findAll({
      include: [
        { model: Characters, as: 'character', attributes: ['name', 'affiliation', 'pveDeaths', 'yearOfMaturity'] },
        { model: Players, as: 'player', attributes: ['id'] },
      ],
      attributes: []
    });

    const channel = await interaction.guild.channels.fetch(channels.activeCharacters);

    const houses = [
      { name: 'House Aetos', color: 0x38761d },
      { name: 'House Ayrin', color: 0xcc0000 },
      { name: 'House Dayne', color: 0x6fa8dc },
      { name: 'House Farring', color: 0x1155cc },
      { name: 'House Locke', color: 0x93c47d },
      { name: 'House Merrick', color: 0xe69138 },
      { name: 'House Wildhart', color: 0x8e7cc3 },
    ]

    houses.forEach(house => {
      const activeCharactersFiltered = activeCharactersList.filter(activeCharacter => activeCharacter.character.affiliation == house.name)
      const chunkSize = 16;

      for (let i = 0; i < activeCharactersFiltered.length; i += chunkSize) {
        const embed = new EmbedBuilder()
          .setColor(house.color)
          .setTitle('Active Characters | ' + house.name)

        activeCharactersFiltered.slice(i, i + chunkSize)
          .forEach((activeCharacter, j, array) => {
            embed.addFields({
              name: activeCharacter.character.name,
              value: 'Played by: ' + userMention(activeCharacter.player.id) + '\n' +
                '```' + '\n' +
                'Affiliation: ' + activeCharacter.character.affiliation.slice(6) + '\n' +
                'PvE Deaths: ' + activeCharacter.character.pveDeaths + '\n' +
                'Year of Maturity: ' + activeCharacter.character.yearOfMaturity + '\n' +
                '```',
              inline: true
            })

            if (j % 2 == 1) {
              embed.addFields({
                name: '\u200b',
                value: '\u200b',
                inline: true
              })
            } else if (j == array.length - 1) {
              embed.addFields(
                {
                  name: '\u200b',
                  value: '\u200b',
                  inline: true
                },
                {
                  name: '\u200b',
                  value: '\u200b',
                  inline: true
                })
            }
          })
        channel.send({ embeds: [embed] });
      }
    })

    return interaction.reply({ 'content': 'The active characters embed has been updated.', flags: MessageFlags.Ephemeral })
  }
}