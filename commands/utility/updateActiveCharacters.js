const { SlashCommandBuilder, InteractionContextType, EmbedBuilder, Embed, MessageFlags, userMention } = require('discord.js');
const { Players, Characters, ActiveCharacters } = require('../../dbObjects.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('update-active-characters')
    .setDescription('Updates the active characters embed.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0),
  async execute(interaction) {
    const activeCharactersList = await ActiveCharacters.findAll({
      include: [
        { model: Characters, as: 'character', attributes: ['name'] },
        { model: Players, as: 'player', attributes: ['id'] },
      ],
      attributes: []
    });

    activeCharactersList.forEach(activeCharacter => {
      console.log(activeCharacter.toJSON());
    });

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle('Active Characters')
      .addFields(
        { name: ''}
      )
    return interaction.reply({ 'content': 'The active characters embed has been updated.', flags: MessageFlags.Ephemeral })
  }
}