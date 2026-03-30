const { Events } = require('discord.js');
const { Deceased, Players, Characters, Worlds } = require('../dbObjects.js');
const { postInLogChannel, COLORS, addDeceasedToDatabase } = require('../misc');
const { WORLD_ID } = require('../constants.js');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    // When a member leaves, then if they were playing a character, note it in
    // the storyteller log and set the character as deceased in the database.
    try {
      const user = await client.users.fetch(member.id);
      const player = await Players.findByPk(user.id);
      if (player) {
        const character = await player.getCharacter();
        if (character) {
          await postInLogChannel(
            'Player Left Server',
            `Player **${user}** (ID: ${user.id}) has left the server.\n\n` +
            `They were playing the character **${character.name}** (ID: ${character.id}).`,
            COLORS.RED
          );

          const world = await Worlds.findByPk(WORLD_ID);

          // Set character as deceased
          const { deceased, embed } = await addDeceasedToDatabase(client.user, false, { characterId: character.id, yearOfDeath: world.currentYear, monthOfDeath: 'January', dayOfDeath: 1, causeOfDeath: 'Left the continent', playedById: player.id })
          if (!deceased && character.socialClassName === 'Commoner') {
            // If character is commoner, delete them from the database
            await character.destroy();
          }
        }
      }
    }
    catch (error) {
      console.error('Error handling guildMemberRemove event:', error);
    }
  }
};