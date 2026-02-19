const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode } = require('discord.js');
const { Players, Characters, Regions, Houses, SocialClasses, Relationships, Worlds, PlayableChildren, Deceased } = require('../../dbObjects.js');
const { roles } = require('../../configs/ids.json');
const { Op, Sequelize } = require('sequelize');
const { addPlayerToDatabase, addCharacterToDatabase, assignCharacterToPlayer, postInLogChannel, addRelationshipToDatabase, addHouseToDatabase, addVassalToDatabase, addPlayableChildToDatabase } = require('../../misc.js')


module.exports = {
  data: new SlashCommandBuilder()
    .setName('create')
    .setDescription('Create a new player or character.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addSubcommand(subcommand =>
      subcommand
        .setName('player')
        .setDescription('Create a new player and (optionally) a character for them to play.')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user of the player.')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('ign')
            .setDescription('The VS username of the player.')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('timezone')
            .setDescription('The timezone of the player.')
        )
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the character.')
        )
        .addStringOption(option =>
          option
            .setName('sex')
            .setDescription('The sex of the character.')
            .addChoices(
              { name: 'Male', value: 'Male' },
              { name: 'Female', value: 'Female' },
              { name: 'Undefined', value: 'Undefined' }
            )
        )
        .addStringOption(option =>
          option
            .setName('region')
            .setDescription('The region of the character.')
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('house')
            .setDescription('The house of the character. If not specified, will be set based on the region.')
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('socialclass')
            .setDescription('The social class of the character.')
            .addChoices(
              { name: 'Commoner', value: 'Commoner' },
              { name: 'Notable', value: 'Notable' },
              { name: 'Noble', value: 'Noble' },
              { name: 'Ruler', value: 'Ruler' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('character')
        .setDescription('Create a new character and (optionally) set it to a player.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the character.')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('sex')
            .setDescription('The sex of the character.')
            .addChoices(
              { name: 'Male', value: 'Male' },
              { name: 'Female', value: 'Female' },
              { name: 'Undefined', value: 'Undefined' }
            )
        )
        .addStringOption(option =>
          option
            .setName('region')
            .setDescription('The region of the character.')
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('house')
            .setDescription('The house of the character. If not specified, will be set based on the region.')
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('socialclass')
            .setDescription('The social class of the character.')
            .addChoices(
              { name: 'Commoner', value: 'Commoner' },
              { name: 'Notable', value: 'Notable' },
              { name: 'Noble', value: 'Noble' },
              { name: 'Ruler', value: 'Ruler' }
            )
        )
        .addUserOption(option =>
          option
            .setName('player')
            .setDescription('The player to set the character to.')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('relationship')
        .setDescription('Create a new relationship.')
        .addStringOption(option =>
          option
            .setName('bearingcharacter')
            .setDescription('The character bearing the offspring.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('conceivingcharacter')
            .setDescription('The character conceiving the offspring.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('committed')
            .setDescription('Whether the relationship is committed or not.')
            .setRequired(true)
            .addChoices(
              { name: 'Yes', value: 'Yes' },
              { name: 'No', value: 'No' }
            )
        )
        .addStringOption(option =>
          option
            .setName('inheritedtitle')
            .setDescription('The inherited title that offspring of this relationship will receive.')
            .addChoices(
              { name: 'Noble', value: 'Noble' },
              { name: 'None', value: 'None' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('house')
        .setDescription('Create a new house.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the house.')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('emojiname')
            .setDescription('The emoji name of the house.')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('vassal')
        .setDescription('Create a new vassal-liege relationship.')
        .addStringOption(option =>
          option
            .setName('vassal')
            .setDescription('The vassal region.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('liege')
            .setDescription('The liege region.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('child')
        .setDescription('Make a character into a playable child.')
        .addStringOption(option =>
          option
            .setName('character')
            .setDescription('The character to make into a playable child.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('legitimacy')
            .setDescription('The legitimacy of the child.')
            .setRequired(true)
            .addChoices(
              { name: 'Illegitimate', value: 'Illegitimate' },
              { name: 'Legitimate', value: 'Legitimate' },
              { name: 'Legitimised', value: 'Legitimised' }
            )
        )
        .addUserOption(option =>
          option
            .setName('contact1')
            .setDescription('The first contact of the child.')
            .setRequired(true)
        )
        .addUserOption(option =>
          option
            .setName('contact2')
            .setDescription('The second contact of the child.')
        )
    )
  ,
  async autocomplete(interaction) {
    let choices;

    const subcommand = interaction.options.getSubcommand();
    const focusedOption = interaction.options.getFocused(true);

    if (subcommand === 'child') {
      const focusedValue = interaction.options.getFocused();

      const world = await Worlds.findOne({ where: { name: "Elstrand" } });

      // Get all characters that are less than 4 years old, are not already a
      // playable child (exists in the PlayableChildren table), are not dead 
      // (exists in the Deceased table), and are not currently being played by
      // someone else (), and whose name starts with the focused value
      const characters = await Characters.findAll({
        where: {
          name: { [Op.startsWith]: focusedValue },
          yearOfMaturity: { [Op.gt]: world.currentYear - 4 },
          id: {
            [Op.notIn]: Sequelize.literal(`(
              SELECT "characterId" FROM "PlayableChildren"
              UNION
              SELECT "characterId" FROM "Deceaseds"
              UNION
              SELECT "characterId" FROM "Players" WHERE "characterId" IS NOT NULL
            )`)
          }
        },
        attributes: ['name', 'id'],
        limit: 25
      });

      choices = characters.map(character => ({ name: character.name, value: character.id }));
    }


    // Autocomplete for regions, check which option is being autocompleted
    if (focusedOption.name === 'region') {
      const focusedValue = interaction.options.getFocused();

      const regions = await Regions.findAll({
        where: { name: { [Op.startsWith]: focusedValue } },
        attributes: ['name', 'id'],
        limit: 25
      });

      choices = regions.map(region => ({ name: region.name, value: region.id }));
    }

    // Autocomplete for houses
    else if (focusedOption.name === 'house') {
      const focusedValue = interaction.options.getFocused();

      const houses = await Houses.findAll({
        where: { name: { [Op.startsWith]: focusedValue } },
        attributes: ['name', 'id'],
        limit: 25
      });

      choices = houses.map(house => ({ name: house.name, value: house.id }));;
    }

    // Autocomplete for relationships
    else if (focusedOption.name === 'bearingcharacter' || focusedOption.name === 'conceivingcharacter') {
      const focusedValue = interaction.options.getFocused();

      const characters = await Characters.findAll({
        where: { name: { [Op.startsWith]: focusedValue } },
        attributes: ['name', 'id'],
        limit: 25
      });

      choices = characters.map(character => ({ name: character.name, value: character.id }));
    }

    // Autocomplete for vassal-liege relationship
    else if (focusedOption.name === 'vassal' || focusedOption.name === 'liege') {
      const focusedValue = interaction.options.getFocused();

      // All regions except for the Wanderer region, since the Wanderer region cannot be a vassal or liege
      const regions = await Regions.findAll({
        where: { name: { [Op.startsWith]: focusedValue }, name: { [Op.not]: 'Wanderer' } },
        attributes: ['name', 'id'],
        limit: 25
      });

      choices = regions.map(region => ({ name: region.name, value: region.id }));
    }

    await interaction.respond(choices);
  },
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'player') {
      // For creating the player
      const user = interaction.options.getUser('user');
      const ign = interaction.options.getString('ign');
      const timezone = interaction.options.getString('timezone');

      let givenPlayerValues = {};
      if (user) givenPlayerValues.id = user.id;
      if (ign) givenPlayerValues.ign = ign;
      if (timezone) givenPlayerValues.timezone = timezone;

      // For creating the character, if one is to be created for the player
      const name = interaction.options.getString('name');
      const sex = interaction.options.getString('sex');
      const regionId = interaction.options.getString('region');
      const houseId = interaction.options.getString('house');
      const socialClassName = interaction.options.getString('socialclass');

      let givenCharacterValues = {};
      if (name) givenCharacterValues.name = name;
      if (sex) givenCharacterValues.sex = sex;
      if (regionId) givenCharacterValues.regionId = regionId;
      if (houseId) givenCharacterValues.houseId = houseId;
      if (socialClassName) givenCharacterValues.socialClassName = socialClassName;

      // Create the player
      try {
        const { player, embed: playerCreatedEmbed } = await addPlayerToDatabase(interaction.user, givenPlayerValues);

        // If something went wrong with creating the player, finish here
        if (!player) return interaction.editReply({ embeds: [playerCreatedEmbed], flags: MessageFlags.Ephemeral });

        // If not creating a character, finish here
        const isCreatingCharacter = Object.keys(givenCharacterValues).length > 0;
        if (!isCreatingCharacter) return interaction.editReply({ embeds: [playerCreatedEmbed], flags: MessageFlags.Ephemeral });

        // Create the character if any of the arguments were provided
        const { character, embed: characterCreatedEmbed } = await addCharacterToDatabase(interaction.user, givenCharacterValues);

        // If something went wrong with creating the character, finish here
        if (!character) return interaction.editReply({ embeds: [playerCreatedEmbed, characterCreatedEmbed], flags: MessageFlags.Ephemeral });

        // And lastly assign the character to the player
        const assignedEmbed = await assignCharacterToPlayer(character.id, player.id, interaction.user);

        return interaction.editReply({ embeds: [playerCreatedEmbed, characterCreatedEmbed, assignedEmbed], flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        return interaction.editReply({ content: error.message, flags: MessageFlags.Ephemeral });
      }

    }
    else if (subcommand === 'character') {
      const name = interaction.options.getString('name');
      const sex = interaction.options.getString('sex');
      const regionId = interaction.options.getString('region');
      const houseId = interaction.options.getString('house');
      const socialClassName = interaction.options.getString('socialclass');

      let givenValues = {}
      if (name) givenValues.name = name;
      if (sex) givenValues.sex = sex;
      if (regionId) givenValues.regionId = regionId;
      if (houseId) givenValues.houseId = houseId;
      if (socialClassName) givenValues.socialClassName = socialClassName;

      const user = interaction.options.getUser('player');

      const linkToUser = user !== null;

      try {

        let character, characterCreatedEmbed;
        try {
          const result = await addCharacterToDatabase(interaction.user, givenValues);
          character = result.character;
          characterCreatedEmbed = result.embed;
          // If something went wrong with creating the character, finish here
          if (!character) return interaction.editReply({ embeds: [characterCreatedEmbed], flags: MessageFlags.Ephemeral });
        }
        catch (error) {
          console.log(error);
          return interaction.editReply({ content: error.message, flags: MessageFlags.Ephemeral });
        }

        // If not linking to a user, finish here
        if (!linkToUser) return interaction.editReply({ embeds: [characterCreatedEmbed], flags: MessageFlags.Ephemeral });

        try {
          const assignedEmbed = await assignCharacterToPlayer(character.id, user.id, interaction.user);
          return interaction.editReply({ embeds: [characterCreatedEmbed, assignedEmbed], flags: MessageFlags.Ephemeral })
        }
        catch (error) {
          console.log(error);
          return interaction.editReply({ content: error.message, flags: MessageFlags.Ephemeral })
        }
      }
      catch (error) {
        console.log(error);
        return interaction.editReply({ content: error.message, flags: MessageFlags.Ephemeral })
      }
    }
    else if (subcommand === 'relationship') {
      const bearingCharacterId = interaction.options.getString('bearingcharacter');
      const conceivingCharacterId = interaction.options.getString('conceivingcharacter');
      const isCommitted = interaction.options.getString('committed');
      const inheritedTitle = interaction.options.getString('inheritedtitle');

      let givenValues = {};
      if (bearingCharacterId) givenValues.bearingCharacterId = bearingCharacterId;
      if (conceivingCharacterId) givenValues.conceivingCharacterId = conceivingCharacterId;
      if (isCommitted) givenValues.isCommitted = isCommitted === 'Yes' ? true : false;
      if (inheritedTitle) givenValues.inheritedTitle = inheritedTitle;

      try {
        const { relationship, embed: relationshipCreatedEmbed } = await addRelationshipToDatabase(interaction.user, givenValues);
        return interaction.editReply({ embeds: [relationshipCreatedEmbed], flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        console.log(error);
        return interaction.editReply({ content: error.message, flags: MessageFlags.Ephemeral });
      }
    }
    else if (subcommand === 'house') {
      const name = interaction.options.getString('name');
      const emojiName = interaction.options.getString('emojiname');

      let givenValues = {};
      if (name) givenValues.name = name;
      if (emojiName) givenValues.emojiName = emojiName;

      try {
        const { house, embed: houseCreatedEmbed } = await addHouseToDatabase(interaction.user, givenValues);
        return interaction.editReply({ embeds: [houseCreatedEmbed], flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        console.log(error);
        return interaction.editReply({ content: error.message, flags: MessageFlags.Ephemeral });
      }
    }
    else if (subcommand === 'vassal') {
      const vassalRegionId = interaction.options.getString('vassal');
      const liegeRegionId = interaction.options.getString('liege');

      let givenValues = {};
      if (vassalRegionId) givenValues.vassalId = vassalRegionId;
      if (liegeRegionId) givenValues.liegeId = liegeRegionId;

      try {
        const { vassal, embed: vassalCreatedEmbed } = await addVassalToDatabase(interaction.user, givenValues);
        return interaction.editReply({ embeds: [vassalCreatedEmbed], flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        console.log(error);
        return interaction.editReply({ content: error.message, flags: MessageFlags.Ephemeral });
      }
    }
    else if (subcommand === 'child') {
      const characterId = interaction.options.getString('character');
      const legitimacy = interaction.options.getString('legitimacy');
      const contact1User = interaction.options.getUser('contact1');
      const contact2User = interaction.options.getUser('contact2');

      let givenValues = {};
      if (characterId) givenValues.characterId = characterId;
      if (legitimacy) givenValues.legitimacy = legitimacy;
      if (contact1User) givenValues.contact1Snowflake = contact1User.id;
      if (contact2User) givenValues.contact2Snowflake = contact2User.id;

      try {
        const { playableChild, embed: playableChildCreatedEmbed } = await addPlayableChildToDatabase(interaction.user, givenValues);
        return interaction.editReply({ embeds: [playableChildCreatedEmbed], flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        console.log(error);
        return interaction.editReply({ content: error.message, flags: MessageFlags.Ephemeral });
      }
    }
  }
}