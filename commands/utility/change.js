const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode } = require('discord.js');
const { Players, Characters, Affiliations, SocialClasses, Worlds, PlayableChildren, Relationships } = require('../../dbObjects.js');
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
        .setDescription('Change something about a player')
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
        .addStringOption(option =>
          option
            .setName('steelbearer_new')
            .setDescription('The type of steelbearer to change the character to.')
            .addChoices(
              { name: 'Ruler', value: 'Ruler' },
              { name: 'Duchy', value: 'Duchy' },
              { name: 'General-purpose', value: 'General-purpose' },
              { name: 'None', value: 'None' },
            )
        )
        .addStringOption(option =>
          option
            .setName('comments_new')
            .setDescription('The new comments.')
        )
        .addStringOption(option =>
          option
            .setName('rollingforbastards_new')
            .setDescription('The new rolling for bastards status.')
            .addChoices(
              { name: 'Yes', value: 'True' },
              { name: 'No', value: 'False' }
            )
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
    .addSubcommand(subcommand =>
      subcommand
        .setName('child')
        .setDescription('Change something about a playable child.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the child.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('name_new')
            .setDescription('The new name of the child.')
        )
        .addIntegerOption(option =>
          option
            .setName('yearofmaturity_new')
            .setDescription('The new year of maturity of the child.')
        )
        .addStringOption(option =>
          option
            .setName('sex_new')
            .setDescription('The new sex of the child.')
            .addChoices(
              { name: 'Male', value: 'Male' },
              { name: 'Female', value: 'Female' }
            )
        )
        .addStringOption(option =>
          option
            .setName('affiliation_new')
            .setDescription('The new affiliation of the child.')
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('legitimacy_new')
            .setDescription('The new legitimacy of the child.')
            .addChoices(
              { name: 'Illegitimate', value: 'Illegitimate' },
              { name: 'Legitimate', value: 'Legitimate' },
              { name: 'Legitimised', value: 'Legitimised' }
            )
        )
        .addStringOption(option =>
          option
            .setName('inheritedtitle_new')
            .setDescription('The new inherited title of the child.')
            .addChoices(
              { name: 'None', value: 'None' },
              { name: 'Noble', value: 'Noble' }
            )
        )
        .addStringOption(option =>
          option
            .setName('comments_new')
            .setDescription('The new comments of the child.')
            .setAutocomplete(true)
        )
        .addUserOption(option =>
          option
            .setName('contact1_new')
            .setDescription('The new first contact of the child.')
        )
        .addUserOption(option =>
          option
            .setName('contact2_new')
            .setDescription('The new second contact of the child.')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('relationship')
        .setDescription('Change something about a relationship.')
        .addStringOption(option =>
          option
            .setName('relationship')
            .setDescription('The relationship to change something about.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('committed_new')
            .setDescription('The new committed status of the relationship.')
            .addChoices(
              { name: 'Yes', value: 'Yes' },
              { name: 'No', value: 'No' }
            )
        )
        .addStringOption(option =>
          option
            .setName('inheritedtitle_new')
            .setDescription('The new inherited title for offspring of the relationship.')
            .addChoices(
              { name: 'None', value: 'None' },
              { name: 'Noble', value: 'Noble' }
            )
        )
    ),
  async autocomplete(interaction) {
    let choices;
    const subcommand = interaction.options.getSubcommand();

    // Handle autocompletes for character subcommand
    if (subcommand === 'character') {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === 'name') {
        const focusedValue = interaction.options.getFocused();

        const characters = await Characters.findAll({
          where: { name: { [Op.startsWith]: focusedValue } },
          attributes: ['name', 'id'],
          limit: 25
        });

        choices = characters.map(character => ({ name: character.name, value: character.id }));
      }

      if (focusedOption.name === 'affiliation_new') {
        const focusedValue = interaction.options.getFocused();

        const affilations = await Affiliations.findAll({
          where: { name: { [Op.startsWith]: focusedValue }, [Op.or]: { name: 'Wanderer', isRuling: true } },
          attributes: ['name', 'id'],
          limit: 25
        })

        choices = affilations.map(affiliation => ({ name: affiliation.name, value: affiliation.id }));
      }
    }

    // Handle autocompletes for affiliation subcommand
    if (subcommand === 'affiliation') {
      const focusedValue = interaction.options.getFocused();

      const affilations = await Affiliations.findAll({
        where: { name: { [Op.startsWith]: focusedValue } },
        attributes: ['name', 'id'],
        limit: 25
      })

      choices = affilations.map(affiliation => ({ name: affiliation.name, value: affiliation.id }));
    }

    // Handle autocompletes for child subcommand
    if (subcommand === 'child') {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === 'name') {
        const focusedValue = interaction.options.getFocused();

        const children = await PlayableChildren.findAll({
          include: {
            model: Characters, as: 'character',
            include: [
              { model: Characters, as: 'parent1' },
              { model: Characters, as: 'parent2' }
            ],
            where: { name: { [Op.startsWith]: focusedValue } },
          },
          attributes: ['id'],
          limit: 25
        });

        choices = children.map(child => {
          const parentNames = []
          parentNames.push(child.character.parent1.name)

          if (child.character.parent2) {
            parentNames.push(child.character.parent2.name.substring(0, 30))
          }

          return ({
            name: (child.character.name.substring(0, 30) + ' | ' + parentNames.join(' & ')),
            value: child.id
          })
        }
        );
      }
      else if (focusedOption.name === 'affiliation_new') {
        const focusedValue = interaction.options.getFocused();

        const affilations = await Affiliations.findAll({
          where: { name: { [Op.startsWith]: focusedValue }, [Op.or]: { name: 'Wanderer', isRuling: true } },
          attributes: ['name', 'id'],
          limit: 25
        })

        choices = affilations.map(affiliation => ({ name: affiliation.name, value: affiliation.id }));
      }
      else if (focusedOption.name === 'comments_new') {
        // Get the child to fetch current comments from
        const childCharacterId = interaction.options.getString('name');
        const childCharacter = await PlayableChildren.findOne({
          where: { id: childCharacterId }
        });

        const currentComments = childCharacter ? childCharacter.comments : '';

        // If no input yet, suggest current comments
        // Otherwise, suggest the input
        const focusedValue = interaction.options.getFocused();
        if (focusedValue.length > 0) {
          choices = [
            { name: focusedValue, value: focusedValue }
          ];
        }
        else {
          if (currentComments) {
            choices = [
              { name: currentComments ?? '', value: currentComments ?? '' }
            ];
          }
          else {
            choices = [];
          }
        }

      }
    }

    // Handle autocompletes for relationship subcommand
    if (subcommand === 'relationship') {
      const focusedValue = interaction.options.getFocused();

      // Find relationships where the focused character name is a parent
      const relationships = await Relationships.findAll({
        include: [
          { model: Characters, as: 'bearingCharacter' },
          { model: Characters, as: 'conceivingCharacter' }
        ],
        where: {
          [Op.or]: [
            { '$bearingCharacter.name$': { [Op.startsWith]: `%${focusedValue}%` } },
            { '$conceivingCharacter.name$': { [Op.startsWith]: `%${focusedValue}%` } }
          ]
        },
        limit: 25
      });

      choices = relationships.map(rel => {
        const bearingCharacterName = rel.bearingCharacter ? rel.bearingCharacter.name : 'Unknown';
        const conceivingCharacterName = rel.conceivingCharacter ? rel.conceivingCharacter.name : 'Unknown';
        return {
          name: `${bearingCharacterName} & ${conceivingCharacterName}`,
          value: rel.id
        };
      });
    }


    await interaction.respond(choices);
  },
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();

    /**
     * Handle changing player info
     */
    if (subcommand === 'player') {
      const user = interaction.options.getUser('user');
      const newIgn = interaction.options.getString('ign_new');
      const newTimezone = interaction.options.getString('timezone_new');

      const player = await Players.findOne({
        where: { id: user.id },
        include: { model: Characters, as: 'character' }
      }
      );

      if (!player) return interaction.editReply({ content: 'The specified player does not exist in the database.', flags: MessageFlags.Ephemeral });

      const playerInfoChangedText = [];
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

      // Handle different cases of changed info
      if (playerInfoChanged) {
        await postInLogChannel(
          'Player Info Changed',
          '**Changed by:** ' + userMention(interaction.user.id) + '\n\n' +
          'Player: ' + userMention(user.id) + '\n\n' +
          playerInfoChangedText.join('\n'),
          0xD98C00
        )
        playerInfoChangedText.unshift('**The following Player info was changed for ' + userMention(user.id) + ':**')
      }

      let changedText = '';
      if (!playerInfoChanged) {
        changedText = 'Please specify what to change.'
      }
      else {
        changedText = playerInfoChangedText.join('\n');
      }

      return interaction.editReply({ content: changedText, flags: MessageFlags.Ephemeral })
    }

    /**
     * Handle changing character info
     */
    if (subcommand === 'character') {
      const characterId = interaction.options.getString('name');
      const newName = interaction.options.getString('name_new');
      const newSex = interaction.options.getString('sex_new');
      const newAffiliationId = interaction.options.getString('affiliation_new');
      const newSocialClassName = interaction.options.getString('socialclass_new');
      const newYearOfMaturity = interaction.options.getNumber('yearofmaturity_new');
      const newPvEDeaths = interaction.options.getNumber('pvedeaths_new');
      const newRole = interaction.options.getString('role_new');
      const newSteelbearer = interaction.options.getString('steelbearer_new');
      const newComments = interaction.options.getString('comments_new');
      const newRollingForBastards = interaction.options.getString('rollingforbastards_new') === 'True' ? true : (interaction.options.getString('rollingforbastards_new') === 'False' ? false : null);

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
        try {
          member = await interaction.guild.members.fetch(player.id);
        }
        catch (error) {
          return interaction.editReply({ content: 'Could not find the Discord member for the player currently playing this character. Have they left the server?', flags: MessageFlags.Ephemeral });
        }
      }

      let changedText = [];

      if (newName !== null) {
        const oldName = character.name;
        await character.update({ name: newName });
        changedText.push('Name: ' + inlineCode(oldName ? oldName : 'Undefined') + ' -> ' + inlineCode(newName));
      }

      if (newSex !== null) {
        const oldSex = character.sex;
        await character.update({ sex: newSex });
        changedText.push('Sex: ' + inlineCode(oldSex ? oldSex : 'Undefined') + ' -> ' + inlineCode(newSex));
      }

      if (newAffiliationId !== null) {
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

      if (newSocialClassName !== null) {
        const oldSocialClass = await SocialClasses.findOne({ where: { name: character.socialClassName } });
        const newSocialClass = await SocialClasses.findOne({ where: { name: newSocialClassName } });

        // Check whether changing to commoner from non-commoner
        if (newSocialClassName === 'Commoner' && oldSocialClass.name !== 'Commoner') {
          changedText.push('Cannot change to Commoner from a higher social class.');
        }
        else {
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

      }

      if (newYearOfMaturity !== null) {
        const oldYearOfMaturity = character.yearOfMaturity;
        await character.update({ yearOfMaturity: newYearOfMaturity });
        changedText.push('Year of Maturity: ' + inlineCode(oldYearOfMaturity) + ' -> ' + inlineCode(newYearOfMaturity));
      }

      if (newPvEDeaths !== null) {
        const oldPvEDeaths = character.pveDeaths;
        await character.update({ pveDeaths: newPvEDeaths });
        changedText.push('PvE Deaths: ' + inlineCode(oldPvEDeaths) + ' -> ' + inlineCode(newPvEDeaths));
      }

      if (newRole !== null) {
        const oldRole = character.role;
        await character.update({ role: newRole });
        changedText.push('Role: ' + inlineCode(oldRole ? oldRole : 'Undefined') + ' -> ' + inlineCode(newRole));
      }

      if (newSteelbearer !== null) {
        const oldSteelbearer = character.steelbearer;

        if (newSteelbearer === 'None') {
          await character.update({ steelbearer: null });
        }
        else {
          await character.update({ steelbearer: newSteelbearer });
        }

        if (isCurrentlyPlayed) {
          await member.roles.remove(roles.steelbearer);
          if (character.steelbearer) await member.roles.add(roles.steelbearer);
        }

        changedText.push('Steelbearer: ' + inlineCode(oldSteelbearer) + ' -> ' + inlineCode(newSteelbearer));
      }

      if (newComments !== null) {
        const oldComments = character.comments;
        await character.update({ comments: newComments });
        changedText.push('Comments: ' + inlineCode(oldComments ? oldComments : 'None') + ' -> ' + inlineCode(newComments));
      }

      if (newRollingForBastards !== null) {
        // Check whether not commoner
        if (character.socialClassName === 'Commoner') {
          changedText.push('Cannot change Rolling for Bastards for Commoner characters.');
        }
        else {
          const oldRollingForBastards = character.isRollingForBastards;
          await character.update({ isRollingForBastards: newRollingForBastards });
          changedText.push('Rolling for Bastards: ' + inlineCode(oldRollingForBastards ? 'Yes' : 'No') + ' -> ' + inlineCode(newRollingForBastards ? 'Yes' : 'No'));
        }
      }

      if (changedText.length === 0) {
        changedText.push('Please specify what to change.');
      }
      else {
        await postInLogChannel(
          'Character Info Changed',
          '**Changed by:** ' + userMention(interaction.user.id) + '\n\n' +
          'Character: ' + inlineCode(character.name) + '\n\n' +
          changedText.join('\n'),
          0xD98C00
        )
        changedText.unshift('**The following was changed for ' + inlineCode(character.name) + ':**');
      }

      return interaction.editReply({ content: changedText.join('\n'), flags: MessageFlags.Ephemeral })
    }

    /**
     * Handle changing current year
     */
    if (subcommand === 'year') {
      const newYear = interaction.options.getNumber('year_new');

      const world = await Worlds.findOne({ where: { name: 'Elstrand' } });

      const oldYear = world.currentYear;
      await world.update({ currentYear: newYear });

      await postInLogChannel(
        'Current Year Changed',
        '**Changed by:** ' + userMention(interaction.user.id) + '\n\n' +
        'Year: ' + inlineCode(oldYear) + ' -> ' + inlineCode(newYear),
        0xD98C00
      )

      return interaction.editReply({ content: 'The current year has been changed to ' + newYear, flags: MessageFlags.Ephemeral });
    }

    /**
     * Handle changing affiliation info
     */
    if (subcommand === 'affiliation') {
      const affilationId = interaction.options.getString('name');
      const newAffiliationName = interaction.options.getString('name_new');
      const newEmojiName = interaction.options.getString('emoji_new');

      if (!(newAffiliationName || newEmojiName)) interaction.editReply({ content: 'Please specify what to change.' });

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

      await postInLogChannel(
        'Affiliation Changed',
        '**Changed by:** ' + userMention(interaction.user.id) + '\n\n' +
        'Affiliation: ' + inlineCode(affiliation.name) + '\n\n' +
        changes.join('\n'),
        0xD98C00
      )

      changes.unshift('**The following was changed for ' + inlineCode(affiliation.name) + ':**');
      return interaction.editReply({ content: changes.join('\n'), flags: MessageFlags.Ephemeral });
    }

    /**
     * Handle changing playable child info
     */
    if (subcommand === 'child') {
      const playableChildId = interaction.options.getString('name');
      const newName = interaction.options.getString('name_new');
      const newYearOfMaturity = interaction.options.getInteger('yearofmaturity_new');
      const newSex = interaction.options.getString('sex_new');
      const newAffiliationId = interaction.options.getString('affiliation_new');
      const newLegitimacy = interaction.options.getString('legitimacy_new');
      const newInheritedTitle = interaction.options.getString('inheritedtitle_new');
      const newComments = interaction.options.getString('comments_new');
      const newContact1 = interaction.options.getUser('contact1_new');
      const newContact2 = interaction.options.getUser('contact2_new');

      const playableChild = await PlayableChildren.findOne({
        include: {
          model: Characters, as: 'character',
          include: [
            { model: Characters, as: 'parent1' },
            { model: Characters, as: 'parent2' }
          ]
        },
        where: { id: playableChildId }
      });

      if (!playableChild) {
        return interaction.editReply({ content: 'The specified playable child does not exist in the database.', flags: MessageFlags.Ephemeral });
      }

      const changes = [];

      if (newName) {
        const oldName = playableChild.character.name;
        await playableChild.character.update({ name: newName });

        changes.push('Name: ' + inlineCode(oldName) + ' -> ' + inlineCode(newName));
      }

      if (newYearOfMaturity) {
        const oldYearOfMaturity = playableChild.character.yearOfMaturity;
        await playableChild.character.update({ yearOfMaturity: newYearOfMaturity });

        changes.push('Year of Maturity: ' + inlineCode(oldYearOfMaturity) + ' -> ' + inlineCode(newYearOfMaturity));
      }

      if (newSex) {
        const oldSex = playableChild.character.sex;
        await playableChild.character.update({ sex: newSex });

        changes.push('Sex: ' + inlineCode(oldSex) + ' -> ' + inlineCode(newSex));
      }

      if (newAffiliationId) {
        const oldAffiliation = await Affiliations.findOne({ where: { id: playableChild.character.affiliationId } });
        const newAffiliation = await Affiliations.findOne({ where: { id: newAffiliationId } });

        await playableChild.character.update({ affiliationId: newAffiliationId });

        changes.push('Affiliation: ' + inlineCode(oldAffiliation.name) + ' -> ' + inlineCode(newAffiliation.name));
      }

      if (newLegitimacy) {
        const oldLegitimacy = playableChild.legitimacy;
        await playableChild.update({ legitimacy: newLegitimacy });

        changes.push('Legitimacy: ' + inlineCode(oldLegitimacy) + ' -> ' + inlineCode(newLegitimacy));
      }

      if (newInheritedTitle) {
        const oldInheritedTitle = playableChild.inheritedTitle ? playableChild.inheritedTitle : 'None';
        const inheritedTitleValue = newInheritedTitle === 'None' ? null : newInheritedTitle;
        await playableChild.update({ inheritedTitle: inheritedTitleValue });

        changes.push('Inherited Title: ' + inlineCode(oldInheritedTitle) + ' -> ' + inlineCode(newInheritedTitle));
      }

      if (newComments) {
        const oldComments = playableChild.comments ? playableChild.comments : 'None';
        await playableChild.update({ comments: newComments });

        changes.push('Comments: ' + inlineCode(oldComments) + ' -> ' + inlineCode(newComments));
      }

      if (newContact1) {
        const oldContact1Snowflake = playableChild.contact1Snowflake;
        const newContact1Snowflake = newContact1 ? newContact1.id : null;
        await playableChild.update({ contact1Snowflake: newContact1Snowflake });

        changes.push('Contact 1: ' + (oldContact1Snowflake ? userMention(oldContact1Snowflake) : 'None') + ' -> ' + userMention(newContact1Snowflake));
      }

      if (newContact2) {
        const oldContact2Snowflake = playableChild.contact2Snowflake;
        const newContact2Snowflake = newContact2 ? newContact2.id : null;
        await playableChild.update({ contact2Snowflake: newContact2Snowflake });

        changes.push('Contact 2: ' + (oldContact2Snowflake ? userMention(oldContact2Snowflake) : 'None') + ' -> ' + userMention(newContact2Snowflake));
      }

      if (changes.length === 0) {
        return interaction.editReply({ content: 'Please specify what to change.', flags: MessageFlags.Ephemeral });
      }

      await postInLogChannel(
        'Playable Child Changed',
        '**Changed by:** ' + userMention(interaction.user.id) + '\n\n' +
        'Playable Child: ' + inlineCode(playableChild.character.name) + '\n\n' +
        changes.join('\n'),
        0xD98C00
      )

      changes.unshift('**The following was changed for the playable child ' + inlineCode(playableChild.character.name) + ':**');
      return interaction.editReply({ content: changes.join('\n'), flags: MessageFlags.Ephemeral });
    }

    /**
     * Handle changing relationship info
     */
    if (subcommand === 'relationship') {
      const relationshipId = interaction.options.getString('relationship');
      const newCommitted = interaction.options.getString('committed_new');
      const newInheritedTitle = interaction.options.getString('inheritedtitle_new');

      const relationship = await Relationships.findOne({
        include: [
          { model: Characters, as: 'bearingCharacter' },
          { model: Characters, as: 'conceivingCharacter' }
        ],
        where: { id: relationshipId }
      });

      const changes = []

      if (newCommitted) {
        const oldCommitted = relationship.isCommitted ? 'Yes' : 'No';
        const committedValue = newCommitted === 'Yes' ? true : false;
        await relationship.update({ isCommitted: committedValue });

        changes.push('Committed: ' + inlineCode(oldCommitted) + ' -> ' + inlineCode(newCommitted));
      }

      if (newInheritedTitle) {
        const oldInheritedTitle = relationship.inheritedTitle ? relationship.inheritedTitle : 'None';
        const inheritedTitleValue = newInheritedTitle === 'None' ? null : newInheritedTitle;
        await relationship.update({ inheritedTitle: inheritedTitleValue });

        changes.push('Inherited Title: ' + inlineCode(oldInheritedTitle) + ' -> ' + inlineCode(newInheritedTitle));
      }

      if (changes.length === 0) {
        return interaction.editReply({ content: 'Please specify what to change.', flags: MessageFlags.Ephemeral });
      }

      await postInLogChannel(
        'Relationship Changed',
        '**Changed by:** ' + userMention(interaction.user.id) + '\n\n' +
        'Relationship: ' + inlineCode(relationship.bearingCharacter.name + ' & ' + relationship.conceivingCharacter.name) + '\n\n' +
        changes.join('\n'),
        0xD98C00
      )

      changes.unshift('**The following was changed for the relationship between ' + inlineCode(relationship.bearingCharacter.name + ' & ' + relationship.conceivingCharacter.name) + ':**');
      return interaction.editReply({ content: changes.join('\n'), flags: MessageFlags.Ephemeral });
    }



    return interaction.editReply({ content: 'Hmm, whatever you just did shouldn\'t be possible. What did you do?', flags: MessageFlags.Ephemeral })
  }
}