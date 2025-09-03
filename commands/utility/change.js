const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention } = require('discord.js');
const { Players, Characters, Affiliations } = require('../../dbObjects.js');
const { roles } = require('../../configs/ids.json');
const { Op } = require('sequelize');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('change')
    .setDescription('Change something about a player or character.')
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
          option
            .setName('socialclass_new')
            .setDescription('The new social class.')
            .addChoices(
              { name: 'Commoner', value: roles.commoner },
              { name: 'Notable', value: roles.notable },
              { name: 'Noble', value: roles.noble },
              { name: 'Ruler', value: roles.ruler }
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
          option
            .setName('socialclass_new')
            .setDescription('The new social class.')
            .addChoices(
              { name: 'Commoner', value: roles.commoner },
              { name: 'Notable', value: roles.notable },
              { name: 'Noble', value: roles.noble },
              { name: 'Ruler', value: roles.ruler }
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
    // Change player info
    if (interaction.options.getSubcommand() === 'player') {
      const user = interaction.options.getUser('user');
      const newIgn = interaction.options.getString('ign_new');
      const newTimezone = interaction.options.getString('timezone_new');

      const newName = interaction.options.getString('name_new');
      const newSex = interaction.options.getString('sex_new');
      const newAffiliationId = interaction.options.getString('affiliation_new');
      const newSocialClassId = interaction.options.getString('socialclass_new');
      const newYearOfMaturity = interaction.options.getNumber('yearofmaturity_new');
      const newPvEDeaths = interaction.options.getNumber('pvedeaths_new');
      const newRole = interaction.options.getString('role_new');

      const player = await Players.findOne({
        where: { id: user.id },
        include: { model: Characters, as: 'character' }
      }
      );

      let characterInfoChangedText = '';
      let playerInfoChangedText = '';

      if (newIgn) {
        const oldIgn = player.ign;
        await player.update({ ign: newIgn });
        playerInfoChangedText = playerInfoChangedText + 'IGN: ' + '`' + oldIgn + '` -> `' + newIgn + '`\n';
      }

      if (newTimezone) {
        const oldTimezone = player.timezone;
        await player.update({ timezone: newTimezone });
        playerInfoChangedText = playerInfoChangedText + 'Timezone: ' + '`' + oldTimezone + '` -> `' + newTimezone + '`\n';
      }

      if (player.character) {
        const character = player.character;

        if (newName) {
          const oldName = character.name;
          await character.update({ name: newName });
          const member = await interaction.guild.members.fetch(user);
          // member.setNickname(newName); // Crashes the bot if used on owner of server
          characterInfoChangedText = characterInfoChangedText + 'Name: ' + '`' + oldName + '` -> `' + newName + '`\n';
        }

        if (newSex) {
          const oldSex = character.sex;
          await character.update({ sex: newSex });
          characterInfoChangedText = characterInfoChangedText + 'Sex: ' + '`' + oldSex + '` -> `' + newSex + '`\n';
        }

        if (newAffiliationId) {
          const oldAffiliationRole = await interaction.guild.roles.fetch(character.affiliationId);
          const newAffiliationRole = await interaction.guild.roles.fetch(newAffiliationId);
          await character.update({ affiliationId: newAffiliationId });
          characterInfoChangedText = characterInfoChangedText + 'Affiliation: ' + '`' + oldAffiliationRole.name + '` -> `' + newAffiliationRole.name + '`\n';
        }

        if (newSocialClassId) {
          const oldSocialClassRole = await interaction.guild.roles.fetch(character.socialClassId);
          const newSocialClassRole = await interaction.guild.roles.fetch(newSocialClassId);
          await character.update({ socialClassId: newSocialClassId });
          characterInfoChangedText = characterInfoChangedText + 'Social class: ' + '`' + oldSocialClassRole.name + '` -> `' + newSocialClassRole.name + '`\n';
        }

        if (newYearOfMaturity) {
          const oldYearOfMaturity = character.yearOfMaturity;
          await character.update({ yearOfMaturity: newYearOfMaturity });
          characterInfoChangedText = characterInfoChangedText + 'Year of Maturity: ' + '`' + oldYearOfMaturity + '` -> `' + newYearOfMaturity + '`\n';
        }

        if (newPvEDeaths) {
          const oldPvEDeaths = character.pveDeaths;
          await character.update({ pveDeaths: newPvEDeaths });
          characterInfoChangedText = characterInfoChangedText + 'PvE Deaths: ' + '`' + oldPvEDeaths + '` -> `' + newPvEDeaths + '`\n';
        }

        if (newRole) {
          const oldRole = character.role;
          await character.update({ role: newRole });
          characterInfoChangedText = characterInfoChangedText + 'Role: ' + '`' + oldRole + '` -> `' + newRole + '`\n';
        }
      }
      else if (newName || newSex || newAffiliationId || newSocialClassId || newYearOfMaturity || newPvEDeaths || newRole) {
        characterInfoChangedText = 'This player is currently not playing a character, and as such nothing was changed.'
      }

      // Handle different cases of changed info
      if (playerInfoChangedText !== '') {
        playerInfoChangedText = '**The following Player info was changed for ' + userMention(user.id) + ':**\n' + playerInfoChangedText;
      }

      if (characterInfoChangedText !== '') {
        characterInfoChangedText = '**The following Character info was changed for `' + player.character.name + '`:**\n' + characterInfoChangedText;
      }


      let changedText = '';
      if (playerInfoChangedText === '' && characterInfoChangedText === '') {
        changedText = '**Please specify what to change.**'
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
      const newAffiliationId = interaction.options.getString('affiliation_new');
      const newSocialClassId = interaction.options.getString('socialclass_new');
      const newYearOfMaturity = interaction.options.getNumber('yearofmaturity_new');
      const newPvEDeaths = interaction.options.getNumber('pvedeaths_new');
      const newRole = interaction.options.getString('role_new');

      const character = await Characters.findOne({
        include: { model: Affiliations, as: 'affiliation' },
        where: { id: characterId }
      })

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

      if (newAffiliationId) {
        const oldAffiliationRole = await interaction.guild.roles.fetch(character.affiliationId);
        const newAffiliationRole = await interaction.guild.roles.fetch(newAffiliationId);
        await character.update({ affiliationId: newAffiliationId });
        changedText = changedText + 'Affiliation: ' + '`' + oldAffiliationRole.name + '` -> `' + newAffiliationRole.name + '`\n';
      }

      if (newSocialClassId) {
        const oldSocialClassRole = await interaction.guild.roles.fetch(character.socialClassId);
        const newSocialClassRole = await interaction.guild.roles.fetch(newSocialClassId);
        await character.update({ socialClassId: newSocialClassId });
        changedText = changedText + 'Social class: ' + '`' + oldSocialClassRole.name + '` -> `' + newSocialClassRole.name + '`\n';
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

      changedText = changedText.replace(/\n$/, '');
      if (changedText === '') {
        changedText = 'Please specify what to change.'
      }
      else {
        changedText = '**The following was changed for `' + character.name + '`:**\n' + changedText;
      }

      return interaction.reply({ content: changedText, flags: MessageFlags.Ephemeral })
    }

    return interaction.reply({ content: 'Hmm, whatever you just did shouldn\'t be possible. What did you do?', flags: MessageFlags.Ephemeral })
  }
}