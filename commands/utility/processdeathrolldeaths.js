const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode, EmbedBuilder, ContainerBuilder, TextDisplayBuilder } = require('discord.js');
const { DeathRollDeaths } = require('../../dbObjects.js');
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
    const summaryLines = [];
    const logLines = [];

    for (const deathRecord of dyingCharacters) {
      const character = await deathRecord.getCharacter();

      const player = await character.getPlayer();
      if (player) {
        try {
          const user = await interaction.client.users.fetch(player.id);

          const container = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `### Your character, *${character.name}*, has been marked as deceased.\n` +
                `Hi ${user}! Your character, *${character.name}*, failed their death roll for this year, and the date of death has passed. However, you have not yet posted in the graveyard channel. As such, your character has been marked as deceased, and your roles have been updated to reflect this. You do not need to do anything else.\n` +
                `-# If you believe this is a mistake, please make a ticket so staff can help you.`
              )
            )

          await user.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });

          summaryLines.push(`${inlineCode(character.name)} (${userMention(player.id)}) - Marked as deceased.`);
        }
        catch (error) {
          summaryLines.push(`${inlineCode(character.name)} (${userMention(player.id)}) - Marked as deceased, but failed to send DM.`);
        }

        logLines.push(`${inlineCode(character.name)} (${character.id}) | ${userMention(player.id)}`);
        await addDeceasedToDatabase(interaction.user, true, { characterId: character.id, yearOfDeath: deathRecord.yearOfDeath, monthOfDeath: deathRecord.monthOfDeath, dayOfDeath: deathRecord.dayOfDeath, causeOfDeath: 'Age', playedById: player.id });
      }
      else {
        summaryLines.push(`${inlineCode(character.name)} (${character.id}) - No player assigned. Must mark as deceased manually.`);
      }
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