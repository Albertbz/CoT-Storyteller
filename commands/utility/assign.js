const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode } = require('discord.js');
const { Players, Characters, Affiliations, SocialClasses, Worlds } = require('../../dbObjects.js');
const { roles } = require('../../configs/ids.json');
const { Op } = require('sequelize');
const { postInLogChannel, assignCharacterToPlayer } = require('../../misc.js');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('assign')
    .setDescription('Assign a character to a player.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addStringOption(option =>
      option
        .setName('character')
        .setDescription('The character to be assigned to a player.')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addUserOption(option =>
      option
        .setName('player')
        .setDescription('The player that the character is to be assigned to.')
        .setRequired(true)
    )
  ,
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();

    const characters = await Characters.findAll({
      where: { name: { [Op.startsWith]: focusedValue } },
      attributes: ['name', 'id']
    });

    choices = characters.splice(0, 25).map(character => ({ name: character.name, value: character.id }));
    await interaction.respond(choices);
  },
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const characterId = interaction.options.getString('character');
    const user = interaction.options.getUser('player');

    try {
      const character = await Characters.findOne({ where: { id: characterId } });

      const playerExists = await assignCharacterToPlayer(characterId, user.id, interaction.user);

      if (!playerExists) return interaction.editReply({ content: '**Attempted to assign character to the specified player, but the player was not found in the database.**', flags: MessageFlags.Ephemeral });

      const replyText = 'The character ' + inlineCode(character.name) + ' was assigned to ' + userMention(user.id) + '.';
      return interaction.editReply({ content: replyText, flags: MessageFlags.Ephemeral });
    }
    catch (error) {
      console.log(error);
      return interaction.editReply({ content: 'Something went wrong with assigning the character to the player.', flags: MessageFlags.Ephemeral });
    }
  }
}