const { ContainerBuilder, MessageFlags, TextDisplayBuilder, SeparatorBuilder, TimestampStyles, time } = require('discord.js');
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

/**
 * Shows a message in an interaction reply, waits for a specified amount of time,
 * and then runs a function that creates a container and changes the message to
 * that container. The message also includes a line that says it is returning to
 * a specified thing (like a menu) and includes a relative timestamp for when it
 * will return.
 * 
 * @param {*} interaction The interaction that made this run.
 * @param {string} message The text to put in the main part of the message.
 * @param {number} waitTime The time, in ms, to wait until the message is changed to the container gotten through the containerFunction.
 * @param {string} returningTo The thing that the message should say it is returning to.
 * @param {Function} containerFunction The function that will be run after the wait time, which should return a container to change the message to. This is a function rather than a container directly because sometimes the container needs to be generated with updated information at the time of generation, rather than at the time of calling this function.
 */
async function showMessageThenReturnToContainer(interaction, message, waitTime, returningTo, containerFunction) {
  // Convert to seconds for Discord timestamp, but add a buffer of 1 second to ensure the message doesn't show "in 0 seconds"
  const waitTimeExpiry = Math.floor((new Date().getTime() + waitTime) / 1000) + 1;

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        message +
        `\n\n-# Returning to ${returningTo} ${time(waitTimeExpiry, TimestampStyles.RelativeTime)}...`
      )
    )

  await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  setTimeout(async () => {
    const newContainer = await containerFunction();
    await interaction.editReply({ components: [newContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2], allowedMentions: { parse: [] } });
  }, waitTime);
}

module.exports = {
  sendCharacterJoinMessage,
  showMessageThenReturnToContainer
};