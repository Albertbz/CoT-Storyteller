const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode } = require('discord.js');
const { Players, Characters, Affiliations, SocialClasses, Worlds } = require('../../dbObjects.js');
const { roles } = require('../../configs/ids.json');
const { Op } = require('sequelize');
const { postInLogChannel } = require('../../misc.js');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('change')
    .setDescription('Change something in the Storyteller database.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addSubcommand(subcommand =>
      subcommand
        .setName('player')
        .setDescription('Change something about a player or their character.')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user of the player.')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('ign_new')
            .setDescription('The new VS username.')
        )
        .addStringOption(option =>
          option
            .setName('timezone_new')
            .setDescription('The new timezone.')
        )
        .addStringOption(option =>
          option
            .setName('name_new')
            .setDescription('The new name.')
        )
        .addStringOption(option =>
          option
            .setName('sex_new')
            .setDescription('The new sex.')
            .addChoices(
              { name: 'Male', value: 'Male' },
              { name: 'Female', value: 'Female' },
              { name: 'Undefined', value: 'Undefined' }
            )
        )
        .addStringOption(option =>
          option
            .setName('affiliation_new')
            .setDescription('The new affiliation.')
            .addChoices(
              { name: 'Aetos', value: 'Aetos' },
              { name: 'Ayrin', value: 'Ayrin' },
              { name: 'Dayne', value: 'Dayne' },
              { name: 'Farring', value: 'Farring' },
              { name: 'Locke', value: 'Locke' },
              { name: 'Merrick', value: 'Merrick' },
              { name: 'Wildhart', value: 'Wildhart' },
              { name: 'Wanderer', value: 'Wanderer' }
            )
        )
        .addStringOption(option =>
          option
            .setName('socialclass_new')
            .setDescription('The new social class.')
            .addChoices(
              { name: 'Commoner', value: 'Commoner' },
              { name: 'Notable', value: 'Notable' },
              { name: 'Noble', value: 'Noble' },
              { name: 'Ruler', value: 'Ruler' }
            )
        )
        .addNumberOption(option =>
          option
            .setName('yearofmaturity_new')
            .setDescription('The new Year of Maturity.')
        )
        .addNumberOption(option =>
          option
            .setName('pvedeaths_new')
            .setDescription('The new amount of PvE deaths.')
        )
        .addStringOption(option =>
          option
            .setName('role_new')
            .setDescription('The new role.')
        )
        .addBooleanOption(option =>
          option
            .setName('steelbearer_new')
            .setDescription('The new state of whether the character is a steelbearer.')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('character')
        .setDescription('Change something about a character.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the character.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('name_new')
            .setDescription('The new name.')
        )
        .addStringOption(option =>
          option
            .setName('sex_new')
            .setDescription('The new sex.')
            .addChoices(
              { name: 'Male', value: 'Male' },
              { name: 'Female', value: 'Female' },
              { name: 'Undefined', value: 'Undefined' }
            )
        )
        .addStringOption(option =>
          option
            .setName('affiliation_new')
            .setDescription('The new affiliation.')
            .addChoices(
              { name: 'Aetos', value: 'Aetos' },
              { name: 'Ayrin', value: 'Ayrin' },
              { name: 'Dayne', value: 'Dayne' },
              { name: 'Farring', value: 'Farring' },
              { name: 'Locke', value: 'Locke' },
              { name: 'Merrick', value: 'Merrick' },
              { name: 'Wildhart', value: 'Wildhart' },
              { name: 'Wanderer', value: 'Wanderer' }
            )
        )
        .addStringOption(option =>
          option
            .setName('socialclass_new')
            .setDescription('The new social class.')
            .addChoices(
              { name: 'Commoner', value: 'Commoner' },
              { name: 'Notable', value: 'Notable' },
              { name: 'Noble', value: 'Noble' },
              { name: 'Ruler', value: 'Ruler' }
            )
        )
        .addNumberOption(option =>
          option
            .setName('yearofmaturity_new')
            .setDescription('The new Year of Maturity.')
        )
        .addNumberOption(option =>
          option
            .setName('pvedeaths_new')
            .setDescription('The new amount of PvE deaths.')
        )
        .addStringOption(option =>
          option
            .setName('role_new')
            .setDescription('The new role.')
        )
        .addBooleanOption(option =>
          option
            .setName('steelbearer_new')
            .setDescription('The new state of whether the character is a steelbearer.')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('year')
        .setDescription('Change the current year.')
        .addNumberOption(option =>
          option
            .setName('year_new')
            .setDescription('The new year.')
            .setRequired(true)
        )
    )
  ,
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const characters = await Characters.findAll({
      where: { name: { [Op.startsWith]: focusedValue } },
      attributes: ['name', 'id']
    });
    await interaction.respond(characters.splice(0, 25).map(character => ({ name: character.name, value: character.id })))
  },
  async execute(interaction) {
    // Change player info
    if (interaction.options.getSubcommand() === 'player') {
      const user = interaction.options.getUser('user');
      const newIgn = interaction.options.getString('ign_new');
      const newTimezone = interaction.options.getString('timezone_new');

      const newName = interaction.options.getString('name_new');
      const newSex = interaction.options.getString('sex_new');
      const newAffiliationName = interaction.options.getString('affiliation_new');
      const newSocialClassName = interaction.options.getString('socialclass_new');
      const newYearOfMaturity = interaction.options.getNumber('yearofmaturity_new');
      const newPvEDeaths = interaction.options.getNumber('pvedeaths_new');
      const newRole = interaction.options.getString('role_new');
      const newIsSteelbearer = interaction.options.getBoolean('steelbearer_new');

      const player = await Players.findOne({
        where: { id: user.id },
        include: { model: Characters, as: 'character' }
      }
      );

      if (!player) return interaction.reply({ content: 'The specified player does not exist in the database.', flags: MessageFlags.Ephemeral });

      let characterInfoChangedText = '';
      let characterInfoChanged = false;

      let playerInfoChangedText = '';
      let playerInfoChanged = false;

      if (newIgn) {
        const oldIgn = player.ign;
        await player.update({ ign: newIgn });
        playerInfoChanged = true;
        playerInfoChangedText = playerInfoChangedText + 'IGN: ' + '`' + oldIgn + '` -> `' + newIgn + '`\n';
      }

      if (newTimezone) {
        const oldTimezone = player.timezone;
        await player.update({ timezone: newTimezone });
        playerInfoChanged = true;
        playerInfoChangedText = playerInfoChangedText + 'Timezone: ' + '`' + oldTimezone + '` -> `' + newTimezone + '`\n';
      }

      if (player.character) {
        const character = player.character;

        const member = await interaction.guild.members.fetch(player.id);

        if (newName) {
          const oldName = character.name;
          await character.update({ name: newName });
          // const member = await interaction.guild.members.fetch(user);
          // member.setNickname(newName); // Crashes the bot if used on owner of server
          characterInfoChanged = true;
          characterInfoChangedText = characterInfoChangedText + 'Name: ' + '`' + oldName + '` -> `' + newName + '`\n';
        }

        if (newSex) {
          const oldSex = character.sex;
          await character.update({ sex: newSex });
          characterInfoChanged = true;
          characterInfoChangedText = characterInfoChangedText + 'Sex: ' + '`' + oldSex + '` -> `' + newSex + '`\n';
        }

        if (newAffiliationName) {
          const oldAffiliation = await Affiliations.findOne({ where: { name: character.affiliationName } });
          const oldAffiliationRole = await interaction.guild.roles.fetch(oldAffiliation.roleId);

          const newAffiliation = await Affiliations.findOne({ where: { name: newAffiliationName } });
          const newAffiliationRole = await interaction.guild.roles.fetch(newAffiliation.roleId);

          await character.update({ affiliationName: newAffiliationName });

          // Update Discord role
          await member.roles.remove(oldAffiliationRole);
          await member.roles.add(newAffiliationRole);

          if (character.socialClassName === 'Commoner') {
            if (newAffiliationName === 'Wanderer') {
              member.roles.remove(roles.commoner);
            }
            else if (oldAffiliation.name === 'Wanderer') {
              member.roles.add(roles.commoner);
            }
          }

          // Update variables for later use
          characterInfoChanged = true;
          characterInfoChangedText = characterInfoChangedText + 'Affiliation: ' + inlineCode(oldAffiliation.name) + ' -> ' + inlineCode(newAffiliation.name) + '\n';
        }

        if (newSocialClassName) {
          const oldSocialClass = await SocialClasses.findOne({ where: { name: character.socialClassName } });
          const oldSocialClassRole = await interaction.guild.roles.fetch(oldSocialClass.roleId);

          const newSocialClass = await SocialClasses.findOne({ where: { name: newSocialClassName } });
          const newSocialClassRole = await interaction.guild.roles.fetch(newSocialClass.roleId);
          await character.update({ socialClassName: newSocialClassName });

          // Update Discord role
          await member.roles.remove(oldSocialClassRole);

          if (!(character.affiliationName === 'Wanderer' && newSocialClassName === 'Commoner')) {
            await member.roles.add(newSocialClassRole);
          }

          // Update varibles for later use
          characterInfoChanged = true;
          characterInfoChangedText = characterInfoChangedText + 'Social class: ' + inlineCode(oldSocialClass.name) + ' -> ' + inlineCode(newSocialClass.name) + '\n';
        }

        if (newYearOfMaturity) {
          const oldYearOfMaturity = character.yearOfMaturity;
          await character.update({ yearOfMaturity: newYearOfMaturity });
          characterInfoChanged = true;
          characterInfoChangedText = characterInfoChangedText + 'Year of Maturity: ' + '`' + oldYearOfMaturity + '` -> `' + newYearOfMaturity + '`\n';
        }

        if (newPvEDeaths) {
          const oldPvEDeaths = character.pveDeaths;
          await character.update({ pveDeaths: newPvEDeaths });
          characterInfoChanged = true;
          characterInfoChangedText = characterInfoChangedText + 'PvE Deaths: ' + '`' + oldPvEDeaths + '` -> `' + newPvEDeaths + '`\n';
        }

        if (newRole) {
          const oldRole = character.role;
          await character.update({ role: newRole });
          characterInfoChanged = true;
          characterInfoChangedText = characterInfoChangedText + 'Role: ' + '`' + oldRole + '` -> `' + newRole + '`\n';
        }

        if (newIsSteelbearer !== null) {
          const oldIsSteelbearer = character.isSteelbearer;
          await character.update({ isSteelbearer: newIsSteelbearer });

          // Update Discord role
          await member.roles.remove(roles.steelbearer);
          if (character.isSteelbearer) await member.roles.add(roles.steelbearer);

          // Update variables for later use
          characterInfoChanged = true;
          characterInfoChangedText = characterInfoChangedText + 'Is Steelbearer: ' + '`' + oldIsSteelbearer + '` -> `' + newIsSteelbearer + '`\n';
        }
      }
      else if (newName || newSex || newAffiliationName || newSocialClassName || newYearOfMaturity || newPvEDeaths || newRole || newIsSteelbearer !== null) {
        characterInfoChangedText = 'This player is currently not playing a character, and as such nothing was changed.'
      }

      // Handle different cases of changed info
      if (playerInfoChanged) {
        postInLogChannel(
          'Player Info Changed',
          '**Changed by:** ' + userMention(interaction.user.id) + '\n\n' +
          'Player: ' + userMention(user.id) + '\n\n' +
          playerInfoChangedText.replace(/\n$/, ''),
          0xD98C00
        )
        playerInfoChangedText = '**The following Player info was changed for ' + userMention(user.id) + ':**\n' + playerInfoChangedText;
      }

      if (characterInfoChangedText !== '') {
        if (characterInfoChanged) {
          postInLogChannel(
            'Character Info Changed',
            '**Changed by:** ' + userMention(interaction.user.id) + '\n\n' +
            'Character: `' + player.character.name + '`\n\n' +
            characterInfoChangedText.replace(/\n$/, ''),
            0xD98C00
          )
        }
        const characterName = player.character ? player.character.name : 'N/A';
        characterInfoChangedText = '**The following Character info was changed for `' + characterName + '`:**\n' + characterInfoChangedText;
      }

      let changedText = '';
      if (!playerInfoChanged && !characterInfoChanged) {
        if (characterInfoChangedText !== '') {
          changedText = characterInfoChangedText;
        }
        else {
          changedText = 'Please specify what to change.'
        }
      }
      else {
        changedText = playerInfoChangedText + characterInfoChangedText;
      }
      changedText = changedText.replace(/\n$/, '');

      return interaction.reply({ content: changedText, flags: MessageFlags.Ephemeral })
    }
    else if (interaction.options.getSubcommand() === 'character') {
      const characterId = interaction.options.getString('name');
      const newName = interaction.options.getString('name_new');
      const newSex = interaction.options.getString('sex_new');
      const newAffiliationName = interaction.options.getString('affiliation_new');
      const newSocialClassName = interaction.options.getString('socialclass_new');
      const newYearOfMaturity = interaction.options.getNumber('yearofmaturity_new');
      const newPvEDeaths = interaction.options.getNumber('pvedeaths_new');
      const newRole = interaction.options.getString('role_new');
      const newIsSteelbearer = interaction.options.getBoolean('steelbearer_new');

      const character = await Characters.findOne({
        include: { model: Affiliations, as: 'affiliation' },
        where: { id: characterId }
      })

      const player = await Players.findOne({
        where: { characterId: character.id }
      })

      const isCurrentlyPlayed = player !== null;
      let member = null;
      if (isCurrentlyPlayed) {
        member = await interaction.guild.members.fetch(player.id);
      }

      let changedText = '';

      if (newName) {
        const oldName = character.name;
        await character.update({ name: newName });
        changedText = changedText + 'Name: ' + '`' + oldName + '` -> `' + newName + '`\n';
      }

      if (newSex) {
        const oldSex = character.sex;
        await character.update({ sex: newSex });
        changedText = changedText + 'Sex: ' + '`' + oldSex + '` -> `' + newSex + '`\n';
      }

      if (newAffiliationName) {
        const oldAffiliation = await Affiliations.findOne({ where: { name: character.affiliationName } });
        const oldAffiliationRole = await interaction.guild.roles.fetch(oldAffiliation.roleId);

        const newAffiliation = await Affiliations.findOne({ where: { name: newAffiliationName } });
        const newAffiliationRole = await interaction.guild.roles.fetch(newAffiliation.roleId);

        await character.update({ affiliationName: newAffiliationName });

        // If currently played, update Discord role
        if (isCurrentlyPlayed) {
          await member.roles.remove(oldAffiliationRole);
          await member.roles.add(newAffiliationRole);

          if (character.socialClassName === 'Commoner') {
            if (newAffiliationName === 'Wanderer') {
              member.roles.remove(roles.commoner);
            }
            else if (oldAffiliation.name === 'Wanderer') {
              member.roles.add(roles.commoner);
            }
          }
        }

        changedText = changedText + 'Affiliation: ' + inlineCode(oldAffiliation.name) + ' -> ' + inlineCode(newAffiliation.name) + '\n';
      }

      if (newSocialClassName) {
        const oldSocialClass = await SocialClasses.findOne({ where: { name: character.socialClassName } });
        const oldSocialClassRole = await interaction.guild.roles.fetch(oldSocialClass.roleId);

        const newSocialClass = await SocialClasses.findOne({ where: { name: newSocialClassName } });
        const newSocialClassRole = await interaction.guild.roles.fetch(newSocialClass.roleId);
        await character.update({ socialClassName: newSocialClassName });

        // If currently played, update Discord role
        if (isCurrentlyPlayed) {
          await member.roles.remove(oldSocialClassRole);

          if (!(character.affiliationName === `Wanderer` && newSocialClassName === 'Commoner')) {
            await member.roles.add(newSocialClassRole);
          }
        }

        changedText = changedText + 'Social class: ' + inlineCode(oldSocialClass.name) + ' -> ' + inlineCode(newSocialClass.name) + '\n';
      }

      if (newYearOfMaturity) {
        const oldYearOfMaturity = character.yearOfMaturity;
        await character.update({ yearOfMaturity: newYearOfMaturity });
        changedText = changedText + 'Year of Maturity: ' + '`' + oldYearOfMaturity + '` -> `' + newYearOfMaturity + '`\n';
      }

      if (newPvEDeaths) {
        const oldPvEDeaths = character.pveDeaths;
        await character.update({ pveDeaths: newPvEDeaths });
        changedText = changedText + 'PvE Deaths: ' + '`' + oldPvEDeaths + '` -> `' + newPvEDeaths + '`\n';
      }

      if (newRole) {
        const oldRole = character.role;
        await character.update({ role: newRole });
        changedText = changedText + 'Role: ' + '`' + oldRole + '` -> `' + newRole + '`\n';
      }

      if (newIsSteelbearer !== null) {
        const oldIsSteelbearer = character.isSteelbearer;
        await character.update({ isSteelbearer: newIsSteelbearer });

        if (isCurrentlyPlayed) {
          await member.roles.remove(roles.steelbearer);
          if (character.isSteelbearer) await member.roles.add(roles.steelbearer);
        }

        changedText = changedText + 'Is Steelbearer: ' + '`' + oldIsSteelbearer + '` -> `' + newIsSteelbearer + '`\n';
      }

      changedText = changedText.replace(/\n$/, '');
      if (changedText === '') {
        changedText = 'Please specify what to change.'
      }
      else {
        postInLogChannel(
          'Character Info Changed',
          '**Changed by:** ' + userMention(interaction.user.id) + '\n\n' +
          'Character: ' + inlineCode(character.name) + '\n\n' +
          changedText,
          0xD98C00
        )
        changedText = '**The following was changed for `' + character.name + '`:**\n' + changedText;
      }

      return interaction.reply({ content: changedText, flags: MessageFlags.Ephemeral })
    }
    else if (interaction.options.getSubcommand() === 'year') {
      const newYear = interaction.options.getNumber('year_new');

      const world = await Worlds.findOne({ where: { name: 'Elstrand' } });

      const oldYear = world.currentYear;
      await world.update({ currentYear: newYear });

      postInLogChannel(
        'Current Year Changed',
        '**Changed by:** ' + userMention(interaction.user.id) + '\n\n' +
        'Year: ' + inlineCode(oldYear) + ' -> ' + inlineCode(newYear),
        0xD98C00
      )

      return interaction.reply({ content: 'The current year has been changed to ' + newYear, flags: MessageFlags.Ephemeral });
    }

    return interaction.reply({ content: 'Hmm, whatever you just did shouldn\'t be possible. What did you do?', flags: MessageFlags.Ephemeral })
  }
}