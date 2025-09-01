const { SlashCommandBuilder, InteractionContextType, EmbedBuilder, MessageFlags, userMention } = require('discord.js');
const { Players, Characters, ActiveCharacters, Affiliations, SocialClasses } = require('../../dbObjects.js');
const { channels, roles } = require('../../configs/ids.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('update-active-characters')
    .setDescription('Updates the active characters embed.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0),
  async execute(interaction) {
    const activeCharactersList = await ActiveCharacters.findAll({
      include: [
        { model: Characters, as: 'character', include: [{ model: Affiliations, as: 'affiliation' }, { model: SocialClasses, as: 'socialClass' }], attributes: ['name', 'pveDeaths', 'yearOfMaturity'] },
        { model: Players, as: 'player', attributes: ['id'] },
      ],
      attributes: []
    });

    const channel = await interaction.guild.channels.fetch(channels.activeCharacters);

    const affiliations = [
      { id: roles.aetos, color: 0x38761d },
      { id: roles.ayrin, color: 0xcc0000 },
      { id: roles.dayne, color: 0x6fa8dc },
      { id: roles.farring, color: 0x1155cc },
      { id: roles.locke, color: 0x93c47d },
      { id: roles.merrick, color: 0xe69138 },
      { id: roles.wildhart, color: 0x8e7cc3 },
    ]

    affiliations.forEach(async affiliation => {
      const affiliationRole = await interaction.guild.roles.fetch(affiliation.id);
      const activeCharactersFiltered = activeCharactersList.filter(activeCharacter => activeCharacter.character.affiliation.id === affiliation.id)
      const chunkSize = 16;

      for (let i = 0; i < activeCharactersFiltered.length; i += chunkSize) {
        const embed = new EmbedBuilder()
          .setColor(affiliation.color)
          .setTitle('Active Characters | ' + affiliationRole.name)

        activeCharactersFiltered.slice(i, i + chunkSize)
          .forEach((activeCharacter, j, array) => {
            embed.addFields({
              name: activeCharacter.character.name,
              value: 'Played by: ' + userMention(activeCharacter.player.id) + '\n' +
                '```' + '\n' +
                'Affiliation: ' + activeCharacter.character.affiliation.name + '\n' +
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