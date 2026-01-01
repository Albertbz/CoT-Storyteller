const { Events } = require('discord.js');
const { Deceased, Players, Characters, Worlds } = require('../dbObjects.js');
const { postInLogChannel, COLORS, addDeceasedToDatabase } = require('../misc');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    // When a member leaves, then if they were playing a character, note it in
    // the storyteller log and set them as inactive in the database.
    const player = await Players.findByPk(member.id);
    if (player) {
      const character = await player.getCharacter();
      if (character) {
        await postInLogChannel(
          'Player Left Server',
          `Player **${member.user.tag}** (ID: ${member.id}) has left the server.\n\n` +
          `They were playing the character **${character.name}** (ID: ${character.id}).`,
          COLORS.RED
        );

        const world = await Worlds.findOne({ where: { name: 'Elstrand' } });

        // Set character as deceased
        const { deceased, embed } = await addDeceasedToDatabase(client.application.id, false, { characterId: character.id, yearOfDeath: world.currentYear, monthOfDeath: 1, dayOfDeath: 1, causeOfDeath: 'Left the continent', playedById: player.id })
        if (!deceased && character.socialClassName === 'Commoner') {
          // If character is commoner, delete them from the database
          await character.destroy();
        }
      }
    }
  }
};