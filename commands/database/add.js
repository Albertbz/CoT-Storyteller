const { SlashCommandBuilder, InteractionContextType, MessageFlags } = require('discord.js');
const { Players, Characters, ActiveCharacters } = require('../../dbObjects.js');
const { roles } = require('../../configs/ids.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Adds a player to the database.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addUserOption(option =>
      option.setName('player')
        .setDescription('The player to add.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('ign')
        .setDescription('The Vintage Story username.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('character')
        .setDescription('The name of the character.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('affiliation')
        .setDescription('The affiliation of the character.')
        .addChoices(
          { name: 'Aetos', value: roles.aetos },
          { name: 'Ayrin', value: roles.ayrin },
          { name: 'Dayne', value: roles.dayne },
          { name: 'Farring', value: roles.farring },
          { name: 'Locke', value: roles.locke },
          { name: 'Merrick', value: roles.merrick },
          { name: 'Wildhart', value: roles.wildhart },
          { name: 'Wanderer', value: roles.wanderer }
        )
    )
    .addStringOption(option =>
      option.setName('socialclass')
        .setDescription('The social class of the character.')
        .addChoices(
          { name: 'Commoner', value: roles.commoner },
          { name: 'Notable', value: roles.notable },
          { name: 'Noble', value: roles.noble },
          { name: 'Ruler', value: roles.ruler }
        )
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('player');
    const ign = interaction.options.getString('ign');
    const characterName = interaction.options.getString('character');
    const affiliationId = interaction.options.getString('affiliation') ?? roles.wanderer;
    const socialClassId = interaction.options.getString('socialclass') ?? roles.commoner;

    // Add the player to the database
    try {
      const player = await Players.create({
        id: user.id,
        ign: ign,
      });
      console.log(player.toJSON());
    }
    catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return interaction.reply({ 'content': 'That player already exists.', flags: MessageFlags.Ephemeral });
      }

      return interaction.reply({ 'content': 'Something went wrong with adding the player.', flags: MessageFlags.Ephemeral });
    }

    // Add the character to the database and give roles
    try {
      const member = await interaction.guild.members.fetch(user);

      // Create character and add name
      const character = await Characters.create({
        name: characterName,
      });

      // Add affiliation
      member.roles.add(affiliationId);
      const affiliationRole = await interaction.guild.roles.fetch(affiliationId);
      await character.update({ affiliationId: affiliationId });

      // Add social class
      member.roles.add(socialClassId);
      const socialClassRole = await interaction.guild.roles.fetch(socialClassId);
      await character.update({ socialClassId: socialClassId });

      // Make character description for reply
      const characterDescription =
        affiliationRole.name.includes('House') ?
          '`' + socialClassRole.name + '` of `' + affiliationRole.name + '`.' :
          '`' + socialClassRole.name + '` `' + affiliationRole.name + '`.';

      console.log(character.toJSON());

      // Set as active character
      const activeCharacter = await ActiveCharacters.create({
        playerId: user.id,
        characterId: character.id,
      });
      console.log(activeCharacter.toJSON());

      await interaction.reply({
        'content':
          'The player `' + user.username
          + '` with the VS IGN `' + ign
          + '` has been added as the character `' + characterName
          + '`, who is a ' + characterDescription, flags: MessageFlags.Ephemeral
      });
    }
    catch (error) {
      console.log(error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return interaction.reply({ 'content': 'That character already exists.', flags: MessageFlags.Ephemeral });
      }

      return interaction.reply({ 'content': 'Something went wrong with adding the character.', flags: MessageFlags.Ephemeral });
    }
  },
};