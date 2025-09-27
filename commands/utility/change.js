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
            .setAutocomplete(true)
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
            .setAutocomplete(true)
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
    .addSubcommand(subcommand =>
      subcommand
        .setName('affiliation')
        .setDescription('Change something about an affiliation.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the affiliation to change something about.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('name_new')
            .setDescription('The new name of the affiliation.')
        )
        .addStringOption(option =>
          option
            .setName('emoji_new')
            .setDescription('The new name of the emoji for the affiliation.')
        )
    )
  ,
  async autocomplete(interaction) {
    let choices;

    if (interaction.options.getSubcommand() === 'player') {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === 'affiliation_new') {
        const focusedValue = interaction.options.getFocused();

        const affilations = await Affiliations.findAll({
          where: { name: { [Op.startsWith]: focusedValue }, [Op.or]: { name: 'Wanderer', isRuling: true } },
          attributes: ['name', 'id']
        })

        choices = affilations.splice(0, 25).map(affiliation => ({ name: affiliation.name, value: affiliation.id }));
      }
    }

    if (interaction.options.getSubcommand() === 'character') {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === 'name') {
        const focusedValue = interaction.options.getFocused();

        const characters = await Characters.findAll({
          where: { name: { [Op.startsWith]: focusedValue } },
          attributes: ['name', 'id']
        });

        choices = characters.splice(0, 25).map(character => ({ name: character.name, value: character.id }));
      }

      if (focusedOption.name === 'affiliation_new') {
        const focusedValue = interaction.options.getFocused();

        const affilations = await Affiliations.findAll({
          where: { name: { [Op.startsWith]: focusedValue }, [Op.or]: { name: 'Wanderer', isRuling: true } },
          attributes: ['name', 'id']
        })

        choices = affilations.splice(0, 25).map(affiliation => ({ name: affiliation.name, value: affiliation.id }));
      }
    }

    if (interaction.options.getSubcommand() === 'affiliation') {
      const focusedValue = interaction.options.getFocused();

      const affilations = await Affiliations.findAll({
        where: { name: { [Op.startsWith]: focusedValue } },
        attributes: ['name', 'id']
      })

      choices = affilations.splice(0, 25).map(affiliation => ({ name: affiliation.name, value: affiliation.id }));
    }
    await interaction.respond(choices);
  },
  async execute(interaction) {
    // Change player info
    if (interaction.options.getSubcommand() === 'player') {
      const user = interaction.options.getUser('user');
      const newIgn = interaction.options.getString('ign_new');
      const newTimezone = interaction.options.getString('timezone_new');

      const newName = interaction.options.getString('name_new');
      const newSex = interaction.options.getString('sex_new');
      const newAffiliationId = interaction.options.getString('affiliation_new');
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

      const characterInfoChangedText = [];
      // let characterInfoChangedText = '';
      let characterInfoChanged = false;

      const playerInfoChangedText = [];
      // let playerInfoChangedText = '';
      let playerInfoChanged = false;

      if (newIgn) {
        const oldIgn = player.ign;
        await player.update({ ign: newIgn });
        playerInfoChanged = true;
        playerInfoChangedText.push('IGN: ' + inlineCode(oldIgn) + ' -> ' + inlineCode(newIgn));
      }

      if (newTimezone) {
        const oldTimezone = player.timezone;
        await player.update({ timezone: newTimezone });
        playerInfoChanged = true;
        playerInfoChangedText.push('Timezone: ' + inlineCode(oldTimezone) + ' -> ' + inlineCode(newTimezone))
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
          characterInfoChangedText.push('Name: ' + inlineCode(oldName) + ' -> ' + inlineCode(newName))
        }

        if (newSex) {
          const oldSex = character.sex;
          await character.update({ sex: newSex });
          characterInfoChanged = true;
          characterInfoChangedText.push('Sex: ' + inlineCode(oldSex) + ' -> ' + inlineCode(newSex))
        }

        if (newAffiliationId) {
          const oldAffiliation = await Affiliations.findOne({ where: { id: character.affiliationId } });
          const newAffiliation = await Affiliations.findOne({ where: { id: newAffiliationId } });

          await character.update({ affiliationId: newAffiliationId });

          // Update Discord role
          await member.roles.remove([roles.eshaeryn, roles.firstLanding, roles.riverhelm, roles.theBarrowlands, roles.theHeartlands, roles.velkharaan, roles.vernados, roles.wanderer]);
          await member.roles.add(newAffiliation.roleId);

          // Update variables for later use
          characterInfoChanged = true;
          characterInfoChangedText.push('Affiliation: ' + inlineCode(oldAffiliation.name) + ' -> ' + inlineCode(newAffiliation.name));
        }

        if (newSocialClassName) {
          const oldSocialClass = await SocialClasses.findOne({ where: { name: character.socialClassName } });
          const newSocialClass = await SocialClasses.findOne({ where: { name: newSocialClassName } });

          await character.update({ socialClassName: newSocialClassName });

          // Update Discord role
          await member.roles.remove([roles.notable, roles.noble, roles.ruler]);

          if (newSocialClass.name === 'Ruler') {
            await member.roles.add([roles.notable, roles.noble, roles.ruler]);
          }
          else if (newSocialClass.name === 'Noble') {
            await member.roles.add([roles.notable, roles.noble]);
          }
          else if (newSocialClass.name === 'Notable') {
            await member.roles.add(roles.notable);
          }

          // Update varibles for later use
          characterInfoChanged = true;
          characterInfoChangedText.push('Social class: ' + inlineCode(oldSocialClass.name) + ' -> ' + inlineCode(newSocialClass.name));
        }

        if (newYearOfMaturity) {
          const oldYearOfMaturity = character.yearOfMaturity;
          await character.update({ yearOfMaturity: newYearOfMaturity });
          characterInfoChanged = true;
          characterInfoChangedText.push('Year of Maturity: ' + inlineCode(oldYearOfMaturity) + ' -> ' + inlineCode(newYearOfMaturity));
        }

        if (newPvEDeaths) {
          const oldPvEDeaths = character.pveDeaths;
          await character.update({ pveDeaths: newPvEDeaths });
          characterInfoChanged = true;
          characterInfoChangedText.push('PvE Deaths: ' + inlineCode(oldPvEDeaths) + ' -> ' + inlineCode(newPvEDeaths));
        }

        if (newRole) {
          const oldRole = character.role;
          await character.update({ role: newRole });
          characterInfoChanged = true;
          characterInfoChangedText.push('Role: ' + inlineCode(oldRole) + ' -> ' + inlineCode(newRole));
        }

        if (newIsSteelbearer !== null) {
          const oldIsSteelbearer = character.isSteelbearer;
          await character.update({ isSteelbearer: newIsSteelbearer });

          // Update Discord role
          await member.roles.remove(roles.steelbearer);
          if (character.isSteelbearer) await member.roles.add(roles.steelbearer);

          // Update variables for later use
          characterInfoChanged = true;
          characterInfoChangedText.push('Is Steelbearer: ' + inlineCode(oldIsSteelbearer) + ' -> ' + inlineCode(newIsSteelbearer));
        }
      }
      else if (newName || newSex || newAffiliationId || newSocialClassName || newYearOfMaturity || newPvEDeaths || newRole || newIsSteelbearer !== null) {
        characterInfoChangedText.push('This player is currently not playing a character, and as such nothing was changed.')
      }

      // Handle different cases of changed info
      if (playerInfoChanged) {
        postInLogChannel(
          'Player Info Changed',
          '**Changed by:** ' + userMention(interaction.user.id) + '\n\n' +
          'Player: ' + userMention(user.id) + '\n\n' +
          playerInfoChangedText.join('\n'),
          0xD98C00
        )
        playerInfoChangedText.unshift('**The following Player info was changed for ' + userMention(user.id) + ':**')
      }

      if (characterInfoChangedText.length !== 0) {
        if (characterInfoChanged) {
          postInLogChannel(
            'Character Info Changed',
            '**Changed by:** ' + userMention(interaction.user.id) + '\n\n' +
            'Character: `' + player.character.name + '`\n\n' +
            characterInfoChangedText.join('\n'),
            0xD98C00
          )
        }
        const characterName = player.character ? player.character.name : 'N/A';
        characterInfoChangedText.unshift('**The following Character info was changed for ' + inlineCode(characterName) + ':**');
      }

      let changedText = '';
      if (!playerInfoChanged && !characterInfoChanged) {
        if (characterInfoChangedText.length !== 0) {
          changedText = characterInfoChangedText;
        }
        else {
          changedText = 'Please specify what to change.'
        }
      }
      else {
        changedText = playerInfoChangedText.join('\n') + '\n' + characterInfoChangedText.join('\n');
      }

      return interaction.reply({ content: changedText, flags: MessageFlags.Ephemeral })
    }
    else if (interaction.options.getSubcommand() === 'character') {
      const characterId = interaction.options.getString('name');
      const newName = interaction.options.getString('name_new');
      const newSex = interaction.options.getString('sex_new');
      const newAffiliationId = interaction.options.getString('affiliation_new');
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

      let changedText = [];

      if (newName) {
        const oldName = character.name;
        await character.update({ name: newName });
        changedText.push('Name: ' + inlineCode(oldName) + ' -> ' + inlineCode(newName));
      }

      if (newSex) {
        const oldSex = character.sex;
        await character.update({ sex: newSex });
        changedText.push('Sex: ' + inlineCode(oldSex) + ' -> ' + inlineCode(newSex));
      }

      if (newAffiliationId) {
        const oldAffiliation = await Affiliations.findOne({ where: { id: character.affiliationId } });
        const newAffiliation = await Affiliations.findOne({ where: { id: newAffiliationId } });

        await character.update({ affiliationId: newAffiliationId });

        // If currently played, update Discord role
        if (isCurrentlyPlayed) {
          // Update Discord role
          await member.roles.remove([roles.eshaeryn, roles.firstLanding, roles.riverhelm, roles.theBarrowlands, roles.theHeartlands, roles.velkharaan, roles.vernados, roles.wanderer]);
          await member.roles.add(newAffiliation.roleId);
        }

        changedText.push('Affiliation: ' + inlineCode(oldAffiliation.name) + ' -> ' + inlineCode(newAffiliation.name));
      }

      if (newSocialClassName) {
        const oldSocialClass = await SocialClasses.findOne({ where: { name: character.socialClassName } });
        const newSocialClass = await SocialClasses.findOne({ where: { name: newSocialClassName } });

        await character.update({ socialClassName: newSocialClassName });

        // If currently played, update Discord role
        if (isCurrentlyPlayed) {
          await member.roles.remove([roles.notable, roles.noble, roles.ruler]);

          if (newSocialClass.name === 'Ruler') {
            await member.roles.add([roles.notable, roles.noble, roles.ruler]);
          }
          else if (newSocialClass.name === 'Noble') {
            await member.roles.add([roles.notable, roles.noble]);
          }
          else if (newSocialClass.name === 'Notable') {
            await member.roles.add(roles.notable);
          }
        }

        changedText.push('Social class: ' + inlineCode(oldSocialClass.name) + ' -> ' + inlineCode(newSocialClass.name));
      }

      if (newYearOfMaturity) {
        const oldYearOfMaturity = character.yearOfMaturity;
        await character.update({ yearOfMaturity: newYearOfMaturity });
        changedText.push('Year of Maturity: ' + inlineCode(oldYearOfMaturity) + ' -> ' + inlineCode(newYearOfMaturity));
      }

      if (newPvEDeaths) {
        const oldPvEDeaths = character.pveDeaths;
        await character.update({ pveDeaths: newPvEDeaths });
        changedText.push('PvE Deaths: ' + inlineCode(oldPvEDeaths) + ' -> ' + inlineCode(newPvEDeaths));
      }

      if (newRole) {
        const oldRole = character.role;
        await character.update({ role: newRole });
        changedText.push('Role: ' + inlineCode(oldRole) + ' -> ' + inlineCode(newRole));
      }

      if (newIsSteelbearer !== null) {
        const oldIsSteelbearer = character.isSteelbearer;
        await character.update({ isSteelbearer: newIsSteelbearer });

        if (isCurrentlyPlayed) {
          await member.roles.remove(roles.steelbearer);
          if (character.isSteelbearer) await member.roles.add(roles.steelbearer);
        }

        changedText.push('Is Steelbearer: ' + inlineCode(oldIsSteelbearer) + ' -> ' + inlineCode(newIsSteelbearer));
      }

      if (changedText.length === 0) {
        changedText.push('Please specify what to change.');
      }
      else {
        postInLogChannel(
          'Character Info Changed',
          '**Changed by:** ' + userMention(interaction.user.id) + '\n\n' +
          'Character: ' + inlineCode(character.name) + '\n\n' +
          changedText.join('\n'),
          0xD98C00
        )
        changedText.unshift('**The following was changed for ' + inlineCode(character.name) + ':**');
      }

      return interaction.reply({ content: changedText.join('\n'), flags: MessageFlags.Ephemeral })
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
    else if (interaction.options.getSubcommand() === 'affiliation') {
      const affilationId = interaction.options.getString('name');
      const newAffiliationName = interaction.options.getString('name_new');
      const newEmojiName = interaction.options.getString('emoji_new');

      if (!(newAffiliationName || newEmojiName)) interaction.reply({ content: 'Please specify what to change.' });

      const affiliation = await Affiliations.findOne({ where: { id: affilationId } });

      const changes = []

      if (newAffiliationName) {
        const oldAffiliationName = affiliation.name;
        await affiliation.update({ name: newAffiliationName });

        changes.push('Name: ' + inlineCode(oldAffiliationName) + ' -> ' + inlineCode(newAffiliationName));
      }

      if (newEmojiName) {
        const oldEmojiName = affiliation.emojiName;
        await affiliation.update({ emojiName: newEmojiName });

        changes.push('Emoji name: ' + inlineCode(oldEmojiName) + ' -> ' + inlineCode(newEmojiName));
      }

      postInLogChannel(
        'Affiliation Changed',
        '**Changed by:** ' + userMention(interaction.user.id) + '\n\n' +
        'Affiliation: ' + inlineCode(affiliation.name) + '\n\n' +
        changes.join('\n'),
        0xD98C00
      )

      changes.unshift('**The following was changed for ' + inlineCode(affiliation.name) + ':**');
      return interaction.reply({ content: changes.join('\n'), flags: MessageFlags.Ephemeral });
    }

    return interaction.reply({ content: 'Hmm, whatever you just did shouldn\'t be possible. What did you do?', flags: MessageFlags.Ephemeral })
  }
}