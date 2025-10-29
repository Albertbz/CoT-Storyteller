const { SlashCommandBuilder, InteractionContextType, EmbedBuilder, MessageFlags, userMention, inlineCode } = require('discord.js');
const { Players, Characters, Affiliations, SocialClasses, Worlds } = require('../../dbObjects.js');
const { Op } = require('sequelize');

function makeInfoEmbed(title, about) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription('Info about: ' + about);
  return embed;
}

async function addPlayerInfoToEmbed(player, embed) {
  embed
    .addFields(
      { name: '\u200b', value: '\u200b', inline: true },
      { name: '\u200b', value: '***Player Info***', inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
    );

  if (!player) {
    embed
      .addFields(
        { name: 'Currently not played by a player.', value: '\u200b' }
      );
    return;
  }

  const user = await client.users.fetch(player.id);

  const discordUsername = user ? user.username : 'Unknown';
  const vsUsername = player.ign ? player.ign : 'Unknown';
  const timezone = player.timezone === null ? '-' : player.timezone;

  embed
    .addFields(
      { name: 'Discord Username', value: inlineCode(discordUsername), inline: true },
      { name: 'VS Username', value: inlineCode(vsUsername), inline: true },
      { name: 'Timezone', value: inlineCode(timezone), inline: true },
    )
}

function addCharacterInfoToEmbed(character, embed, world) {
  embed
    .addFields(
      { name: '\u200b', value: '\u200b', inline: true },
      { name: '\u200b', value: '***Character Info***', inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
    );

  if (!character) {
    embed
      .addFields(
        { name: 'Currently not playing a character.', value: '\u200b' }
      );
    return;
  }

  const name = character.name;
  const sex = character.sex;
  const affiliationName = character.affiliation ? character.affiliation.name : 'Unknown';
  const socialClassName = character.socialClass ? character.socialClass.name : 'Unknown';
  const role = character.role === null ? '-' : character.role;
  const comments = character.comments === null ? '-' : character.comments;
  let pveDeaths = '-';
  let yearOfMaturity = '-';
  let age = '-';
  if (!(character.socialClassName === 'Commoner' && (character.affiliation && character.affiliation.name !== 'Wanderer'))) {
    pveDeaths = character.pveDeaths;
    yearOfMaturity = character.yearOfMaturity;
    age = world.currentYear - character.yearOfMaturity;
  }

  embed
    .addFields(
      { name: 'Name', value: inlineCode(name), inline: true },
      { name: 'Sex', value: inlineCode(sex), inline: true },
      { name: 'Affiliation', value: inlineCode(affiliationName), inline: true },
      { name: 'Social Class', value: inlineCode(socialClassName), inline: true },
      { name: 'Role', value: inlineCode(role), inline: true },
      { name: 'Comments', value: inlineCode(comments), inline: true },
      { name: 'PvE Deaths', value: inlineCode(pveDeaths), inline: true },
      { name: 'Year of Maturity', value: inlineCode(yearOfMaturity), inline: true },
      { name: 'Age', value: inlineCode(age), inline: true },
    );

  return;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Get info about a player or a character.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
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
    const world = await Worlds.findOne({ where: { name: 'Elstrand' } });

    if (interaction.options.getSubcommand() === 'player') {
      const user = interaction.options.getUser('user');
      const player = await Players.findOne({
        where: { id: user.id },
        include: {
          model: Characters, as: 'character',
          include: [
            { model: Affiliations, as: 'affiliation' },
            { model: SocialClasses, as: 'socialClass' }]
        }
      }
      );
      if (!player) {
        return interaction.reply({
          content: 'This user is not in the database.', flags: MessageFlags.Ephemeral
        })
      }

      const embed = makeInfoEmbed('Result', userMention(user.id));
      await addPlayerInfoToEmbed(player, embed);
      addCharacterInfoToEmbed(player.character, embed, world);

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
    else if (interaction.options.getSubcommand() === 'character') {
      const characterId = interaction.options.getString('name');

      const character = await Characters.findOne({
        where: { id: characterId },
        include: [
          { model: Affiliations, as: 'affiliation' },
          { model: SocialClasses, as: 'socialClass' }]
      });

      if (!character) {
        return interaction.reply({
          content: 'Character not found in the database. Please make sure you click on the name when searching for it.', flags: MessageFlags.Ephemeral
        })
      }

      const embed = makeInfoEmbed('Result', character.name);
      addCharacterInfoToEmbed(character, embed, world);

      const player = await Players.findOne({
        where: { characterId: character.id }
      })

      await addPlayerInfoToEmbed(player, embed);

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
}