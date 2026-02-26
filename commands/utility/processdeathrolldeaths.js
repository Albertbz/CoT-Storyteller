const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode, EmbedBuilder } = require('discord.js');
const { Players, Characters, SocialClasses, Worlds, Regions, DeathRollDeaths } = require('../../dbObjects.js');
const { channels } = require('../../configs/ids.json');
const { addDeceasedToDatabase, postInLogChannel, COLORS } = require('../../misc.js');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('processdeathrolldeaths')
    .setDescription('Process all characters that are marked as dying, and make them deceased.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
  ,
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Get all characters marked as dying
    const dyingCharacters = await DeathRollDeaths.findAll();

    if (dyingCharacters.length === 0) {
      return interaction.editReply('There are no characters marked as dying.');
    }

    // Process each dying character, and add a summary of the results. Also,
    // create a message that can be sent in the graveyard channel that pings
    // those who had characters die.
    const graveyardLines = [];
    const summaryLines = [];
    const logLines = [];

    for (const deathRecord of dyingCharacters) {
      const character = await deathRecord.getCharacter();

      const player = await character.getPlayer();
      if (player) {
        graveyardLines.push(`${character.name} (|| ${userMention(player.id)} ||)`);
        summaryLines.push(`${inlineCode(character.name)} (${userMention(player.id)}) - Marked as deceased.`);
        logLines.push(`${inlineCode(character.name)} (${character.id}) | ${userMention(player.id)}`);
        await addDeceasedToDatabase(interaction.user, true, { characterId: character.id, yearOfDeath: deathRecord.yearOfDeath, monthOfDeath: deathRecord.monthOfDeath, dayOfDeath: deathRecord.dayOfDeath, causeOfDeath: 'Age', playedById: player.id });
      }
      else {
        summaryLines.push(`${inlineCode(character.name)} (${character.id}) - No player assigned. Must mark as deceased manually.`);
      }
    }

    // Post message in graveyard channel
    const graveyardChannel = await client.channels.fetch(channels.graveyard);
    if (graveyardLines.length > 0) {
      const message = `# The following characters have died of old age this year, but have not posted their graveyard post yet.\nIf you are tagged in this message, then your character has been marked as deceased and your roles updated to reflect this. You do not need to do anything else, but you can post a graveyard post if you wish. If your character is listed here but you believe this is a mistake, please contact a storyteller for assistance.`;
      await graveyardChannel.send(`${message}\n\n${graveyardLines.join('\n')}`);
    }

    // Post in log channel
    await postInLogChannel(
      'Death Roll Deaths Processed',
      'The following characters have been marked as deceased due to not yet having posted their graveyard post after dying of old age.\n\n' + logLines.join('\n'),
      COLORS.RED
    )

    // Create embed to return as reply with the summary
    const embed = new EmbedBuilder()
      .setTitle('Processed Death Roll Deaths Summary')
      .setDescription(`Processed ${dyingCharacters.length} death roll deaths.:\n\n${summaryLines.join('\n')}`)
      .setColor(COLORS.GREEN);

    return interaction.editReply({ embeds: [embed] });
  }
}