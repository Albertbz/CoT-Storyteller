const { ContainerBuilder, MessageFlags } = require('discord.js');
const { guildId } = require('../configs/config.json');

async function sendCharacterJoinMessage(player, character, region) {
  // Get ruling house of new region to include in message
  const rulingHouse = await region.getRulingHouse();

  // Get emoji for ruling house to include in message
  const guild = await client.guilds.fetch(guildId);
  const guildEmojis = await guild.emojis.fetch();

  let rulingHouseEmojiText = '';
  if (rulingHouse && rulingHouse.emojiName) {
    const rulingHouseEmojiCustom = guildEmojis.find(emoji => emoji.name === rulingHouse.emojiName);
    rulingHouseEmojiText = rulingHouseEmojiCustom ? rulingHouseEmojiCustom.toString() : `:${rulingHouse.emojiName}:`;
  }

  const regionChannel = client.channels.cache.get(region.generalChannelId);
  if (regionChannel) {
    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          // `## Character joined House ${rulingHouse.name}\n` +
          `### *${character.name}*, played by <@${player.id}>, has joined ${rulingHouse ? `${rulingHouseEmojiText}House ${rulingHouse.name}${rulingHouseEmojiText}` : region.name}! Welcome!\n` +
          `-# This is OOC information.`
        ))
      .setAccentColor(0x00A300);
    regionChannel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  }
}

module.exports = {
  sendCharacterJoinMessage
};