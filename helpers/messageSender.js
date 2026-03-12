const { ContainerBuilder, MessageFlags } = require('discord.js');
const { guildId } = require('../configs/config.json');

async function sendCharacterJoinMessage(player, character, region) {
  // Get ruling house of new region to include in message
  const rulingHouse = await region.getRulingHouse();
  if (!rulingHouse) {
    console.error(`Region ${region.name} does not have a ruling house! Cannot send character join message to region channel.`);
    return;
  }

  // Get emoji for ruling house to include in message
  const guild = await client.guilds.fetch(guildId);
  const rulingHouseEmoji = guild.emojis.cache.find(emoji => emoji.name === rulingHouse.emojiName);

  const regionChannel = client.channels.cache.get(region.generalChannelId);
  // const regionChannel = client.channels.cache.get('1465003174418055168'); // TEMPORARY: hardcoded for testing purposes
  if (regionChannel) {
    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          // `## Character joined House ${rulingHouse.name}\n` +
          `### *${character.name}*, played by <@${player.id}>, has joined ${rulingHouseEmoji.toString()}House ${rulingHouse.name}${rulingHouseEmoji.toString()}! Welcome!\n` +
          `-# This is OOC information.`
        ))
      .setAccentColor(0x00A300);
    regionChannel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  }
}

module.exports = {
  sendCharacterJoinMessage
};