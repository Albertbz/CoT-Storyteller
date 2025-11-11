const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, roleMention, EmbedBuilder, inlineCode, bold, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const { roles, channels } = require('../../configs/ids.json');
const { postInLogChannel, addDeceasedToDatabase } = require('../../misc.js');
const { Players, Characters, Deceased, Worlds } = require('../../dbObjects.js');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Purge inactive members (remove from sheets, change Discord roles). Returns list of affected players.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addAttachmentOption(option =>
      option
        .setName('player_file')
        .setDescription('The file with the names of all players.')
        .setRequired(true)
    )
    .addAttachmentOption(option =>
      option
        .setName('whitelist_file')
        .setDescription('The file with all of the whitelisted players.')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option
        .setName('dry_run')
        .setDescription('If true, does not change any roles or database entries, only returns the list of affected players.')
    )
  ,
  async execute(interaction) {
    await interaction.deferReply();

    const playerFile = interaction.options.getAttachment('player_file');
    const whitelistFile = interaction.options.getAttachment('whitelist_file');
    const dryRun = interaction.options.getBoolean('dry_run') ?? false;

    if (!playerFile || !whitelistFile) {
      return interaction.editReply('Both player and whitelist files are required.');
    }

    const interactionUser = interaction.user;

    // Get the contents of the files and make into arrays objects
    const playerResponse = await fetch(playerFile.attachment);
    const playerData = await playerResponse.json();
    const playerDataArray = Object.values(playerData);

    const whitelistResponse = await fetch(whitelistFile.attachment);
    const whitelistData = await whitelistResponse.json();
    const whitelistDataArray = Object.values(whitelistData);

    // Make a list of things to return in message
    const messageLines = [];

    // Note day to use for cutoff (45 days ago)
    const currentDate = new Date();
    const cutoffDate = new Date(currentDate);
    cutoffDate.setDate(cutoffDate.getDate() - 45);
    messageLines.push(`Cutoff Date (45 days ago): ${inlineCode(cutoffDate.toISOString().split('T')[0])}`);
    console.log(`Cutoff Date (45 days ago): ${cutoffDate.toISOString().split('T')[0]}`);

    // Log number of entries in files for comparison
    messageLines.push(`Player file contains: ${inlineCode(playerDataArray.length)} entries.`);
    messageLines.push(`Whitelist file contains: ${inlineCode(whitelistDataArray.length)} entries.`);
    console.log(`Player file contains: ${playerDataArray.length} entries.`);
    console.log(`Whitelist file contains: ${whitelistDataArray.length} entries.`);

    // Log that we are beginning to filter the whitelist data
    messageLines.push('\nFiltering whitelisted players...');
    console.log('\nFiltering whitelisted players...');

    // Remove Royal from the whitelist data array
    const filteredWhitelistDataArray = whitelistDataArray.filter(player => player.PlayerName !== 'Royal_X5');

    // Remove the players that were whitelisted within the 45 days, by using the
    // 'UntilDate' field, removing 50 years from it to account for the default
    // time added when whitelisting
    const finalWhitelistDataArray = filteredWhitelistDataArray.filter(player => {
      const untilDate = new Date(player.UntilDate);
      untilDate.setFullYear(untilDate.getFullYear() - 50);
      return untilDate < cutoffDate;
    });

    // Log number of players after removing recent whitelists
    messageLines.push(`Whitelisted Players after removing recent whitelists (whitelisted within last 45 days): ${inlineCode(finalWhitelistDataArray.length)}`);
    console.log(`Whitelisted Players after removing recent whitelists (whitelisted within last 45 days): ${finalWhitelistDataArray.length}`);

    // Find all of the players that are whitelisted, by checking that the PlayerUID is in both files
    const whitelistedPlayers = playerDataArray.filter(player => finalWhitelistDataArray.some(whitelistedPlayer => whitelistedPlayer.PlayerUID === player.PlayerUID));

    // Filter the whitelisted players to include only those whose 'LastJoinDate' 
    // is not within the last 45 days (use cutoff date)
    const filteredWhitelistedPlayers = whitelistedPlayers.filter(player => {
      const lastJoinDate = new Date(player.LastJoinDate);
      return lastJoinDate < cutoffDate;
    });

    // Sort the filtered whitelisted players by LastJoinDate ascending
    filteredWhitelistedPlayers.sort((a, b) => {
      const dateA = new Date(a.LastJoinDate);
      const dateB = new Date(b.LastJoinDate);
      return dateA - dateB;
    });

    // Write to console
    // filteredWhitelistedPlayers.forEach(player => {
    //   console.log(`- ${player.LastKnownPlayername} (Last Join: ${player.LastJoinDate})`);
    // });

    // Log the filtered whitelisted players
    messageLines.push(`Whitelisted Players after removing inactives (not active in last 45 days): ${inlineCode(filteredWhitelistedPlayers.length)}`);
    console.log(`Whitelisted Players after removing inactives (not active in last 45 days): ${filteredWhitelistedPlayers.length}`);

    // Log the whitelisted players
    messageLines.push(`${bold(`Final Whitelisted Players to be removed:`)} ${inlineCode(filteredWhitelistedPlayers.length)}`);
    console.log(`Final Whitelisted Players to be removed: ${filteredWhitelistedPlayers.length}`);

    // Make attachment with the list of final whitelisted players to be removed
    // with a command in the following format, one per line:
    // /player [LastKnownPlayername] whitelist off
    const whitelistRemovalCommands = filteredWhitelistedPlayers.map(player => `/player ${player.LastKnownPlayername} whitelist off`);;
    const whitelistRemovalAttachment = {
      attachment: Buffer.from(whitelistRemovalCommands.join('\n'), 'utf-8'),
      name: 'whitelist_removal_commands.txt'
    };


    // Begin finding members to change to New Member role
    messageLines.push('\nFinding members to set to New Member role...');
    console.log('\nFinding members to set to New Member role...');

    // Find the players that exist in the Players table and are currently playing
    // a character
    const players = await Players.findAll({
      include: [
        { model: Characters, as: 'character' }
      ]
    });

    const currentlyPlayingPlayers = filteredWhitelistedPlayers.filter(player => {
      return players.some(dbPlayer => dbPlayer.ign === player.LastKnownPlayername);
    });

    // Make attachment of all VS usernames whose characters need to be removed from sheets
    const characterRemovalUsernames = currentlyPlayingPlayers.map(player => player.LastKnownPlayername);
    const characterRemovalAttachment = {
      attachment: Buffer.from(characterRemovalUsernames.join('\n'), 'utf-8'),
      name: 'character_removal_usernames.txt'
    };


    // Log the currently playing players
    messageLines.push(`Members found in database: ${inlineCode(currentlyPlayingPlayers.length)}`);
    console.log(`Members found in database: ${currentlyPlayingPlayers.length}`);


    // Filter out those players from the filtered whitelist list that are in the
    // currently playing players list, and add their IDs to the affectedMembers list.
    // If found, remove from filteredWhitelistedPlayers list and add character
    // to playersToUpdate list
    const affectedMembers = [];
    const playersToUpdate = [];
    for (const player of currentlyPlayingPlayers) {
      const dbPlayer = players.find(dbP => dbP.ign === player.LastKnownPlayername);
      if (dbPlayer) {
        affectedMembers.push({ id: dbPlayer.id, ign: player.LastKnownPlayername });
        if (dbPlayer.character) {
          playersToUpdate.push(dbPlayer);
        }
        // Also remove from filteredWhitelistedPlayers list
        const index = filteredWhitelistedPlayers.indexOf(player);
        if (index > -1) {
          filteredWhitelistedPlayers.splice(index, 1);
        }
      }
    }

    // Edit the reply with the message lines so far, and get the message object
    const replyMessage = await interaction.editReply({ content: messageLines.join('\n') + '\n\n*Finding missing Discord members... please wait...*' });

    // Find the Discord members corresponding to all filtered whitelisted players
    // by getting all accepted whitelist embeds from the whitelist channel and
    // matching LastKnownPlayername to the embed description
    const whitelistChannel = interaction.client.channels.cache.get('1327928742080675870');

    let whitelistMessages = [];
    console.log('\nFetching messages from whitelist channel...');
    // Create message pointer
    let whitelistMessage = await whitelistChannel.messages
      .fetch({ limit: 1 })
      .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));

    while (whitelistMessage) {
      await whitelistChannel.messages
        .fetch({ limit: 100, before: whitelistMessage.id })
        .then(messagePage => {
          messagePage.forEach(msg => whitelistMessages.push(msg));

          // Update the message pointer to be the last message on the page of messages
          whitelistMessage = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
        });
    }

    // Filter messages to those that have embeds in them
    const filteredMessages = whitelistMessages.filter(msg => msg.embeds.length > 0);
    // Now filter to those that have been accepted or denied (message, not embed, includes "accepted" or "denied")
    const acceptedAndDeniedMessages = filteredMessages.filter(msg => msg.content.includes("accepted") || msg.content.includes("denied"));

    // Go through the embeds of these messages and look for the whitelisted players'
    // LastKnownPlayername in the embed description, specifically before the 
    // "Did you read" part. Also, save the names of the missing members
    const missingMembers = [];
    for (const player of filteredWhitelistedPlayers) {
      const matchingMessage = acceptedAndDeniedMessages.find(msg => {
        const embed = msg.embeds[0];
        if (embed) {
          const trimmedDescription = embed.description.split('Did you read')[0].trim();
          // Split by spaces and newlines to get just the name part
          const nameParts = trimmedDescription.split(/[\s\n]+/);
          return nameParts.some(part => part.toLowerCase() === player.LastKnownPlayername.toLowerCase());
        }
        return false;
      });
      if (matchingMessage) {
        const userId = matchingMessage.embeds[0].fields[0].value.split('`')[1].split('`')[0];
        affectedMembers.push({ id: userId, ign: player.LastKnownPlayername });
      }
      else {
        missingMembers.push(player.LastKnownPlayername);
      }
    }

    // Log the affected members
    messageLines.push(`Found Members: ${inlineCode(affectedMembers.length)}`);
    console.log(`Found Members: ${affectedMembers.length}`);

    // Log how many were missing
    messageLines.push(`Missing Members: ${inlineCode(missingMembers.length)}`);
    console.log(`Missing Members: ${missingMembers.length}`);

    // Make new list of missing members with inline code formatting,
    // taking into account it being empty
    if (missingMembers.length > 0) {
      const formattedMissingMembers = missingMembers.map(name => inlineCode(name));
      messageLines.push(`${formattedMissingMembers.join('\n')}`);
      missingMembers.forEach(name => console.log(name));
    }

    // Update the reply message with current progress
    await replyMessage.edit({ content: messageLines.join('\n') + '\n\n*Fetching Discord members and their roles... please wait...*' });

    // Make a new list of affected members with objects containing their member
    // object and roles
    const affectedMemberDetails = [];
    for (const { id, ign } of affectedMembers) {
      try {
        const member = await interaction.guild.members.fetch(id);
        if (member) {
          let roles = [];
          member.roles.cache.forEach(role => {
            roles.push(role);
          });
          affectedMemberDetails.push({ member: member, roles: roles, ign: ign });
        }
      }
      catch (error) {
        if (error.name === 'DiscordAPIError[10007]') {
          console.log('Unknown member: ' + id);
        }
      }
    }

    // Log the amount of members that were found
    messageLines.push(`Members still on the server: ${inlineCode(affectedMemberDetails.length)}`);
    console.log(`Members still on the server: ${affectedMemberDetails.length}`);

    // Filter to those that do not already have the New Member role
    const membersToSetNewMember = affectedMemberDetails.filter(memberDetail => {
      return !memberDetail.roles.some(role => role.id === roles.newMember);
    });

    // Log the amount of members to be changed to New Member role
    messageLines.push(`Members to be set to New Member role: ${inlineCode(membersToSetNewMember.length)}`);
    console.log(`Members to be set to New Member role: ${membersToSetNewMember.length}`);

    // Make attachment with the list of members to be changed to New Member role
    // with their username and their id, one per line in the following format:
    // [username] ([id])
    const newMemberLines = membersToSetNewMember.map(memberDetail => `${memberDetail.member.user.username} (${memberDetail.member.id})`);
    const newMemberAttachment = {
      attachment: Buffer.from(newMemberLines.join('\n'), 'utf-8'),
      name: 'members_set_to_new_member.txt'
    };


    if (!dryRun) {
      // Make a button to confirm proceeding with role changes and database updates
      const confirmButton = new ButtonBuilder()
        .setCustomId('confirm_purge')
        .setLabel('Confirm Purge')
        .setStyle('Danger');

      const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_purge')
        .setLabel('Cancel')
        .setStyle('Secondary');

      const buttonRow = new ActionRowBuilder()
        .addComponents(confirmButton, cancelButton);

      // Edit the reply message to include the buttons
      await replyMessage.edit({
        content: messageLines.join('\n') + '\n\n*Please confirm to proceed with role changes and database updates.*',
        components: [buttonRow]
      });

      // Wait for button interaction
      const filter = i => i.user.id === interactionUser.id;
      try {
        const buttonInteraction = await replyMessage.awaitMessageComponent({ filter, time: 60_000 });
        try {
          await buttonInteraction.deferUpdate();
        }
        catch (error) {
          console.error('Error deferring button interaction:', error);
        }

        if (buttonInteraction.customId === 'cancel_purge') {
          messageLines.push('\nPurge cancelled by user.');
          console.log('\nPurge cancelled by user.');
        }
        else if (buttonInteraction.customId === 'confirm_purge') {
          try {
            // Edit the reply message to indicate we are applying role changes
            await replyMessage.edit({ content: messageLines.join('\n') + '\n\n*Applying role changes... please wait...*' });
            // Finally, set the roles of the members to New Member role
            for (const memberDetail of membersToSetNewMember) {
              // If banned, keep banned role as well
              if (memberDetail.roles.includes(roles.banned)) {
                await memberDetail.member.roles.set([roles.newMember, roles.banned]);
              }
              else {
                await memberDetail.member.roles.set([roles.newMember]);
              }
            }
          }
          catch (error) {
            console.error('Error applying role changes:', error);
          }

          // Log that role changes have been applied
          messageLines.push('\nRole changes applied.');
          console.log('\nRole changes applied.');

          await replyMessage.edit({ content: messageLines.join('\n') });

          try {
            // Update the database to remove the characters of the affected players
            await replyMessage.edit({ content: messageLines.join('\n') + '\n\n*Updating characters in database... please wait...*' });

            const world = await Worlds.findOne({ where: { name: 'Elstrand' } });
            for (const player of playersToUpdate) {
              if (!player.character) continue;

              const socialClassName = await player.character.getSocialClassName();
              if (socialClassName === 'Commoner') {
                // Delete the character
                await player.character.destroy();
                console.log(`Character ${player.character.name} deleted from database (Commoner).`);
                // TODO: Consider also posting to log channel about character deletion
              }
              else {
                // Make deceased by adding to the Deceased table and removing character link from player
                await addDeceasedToDatabase(interactionUser, false, { characterId: player.character.id, causeOfDeath: 'Inactivity', yearOfDeath: world.currentYear, monthOfDeath: 'January', dayOfDeath: 1, playedById: player.id });
                console.log(`Character ${player.character.name} marked as deceased in database (Notable or higher).`);
              }
            }
          }
          catch (error) {
            console.error('Error updating database:', error);
          }

          // Log that database updates have been applied
          messageLines.push('\nDatabase updates applied.');
          console.log('\nDatabase updates applied.');
        }
      }
      catch (error) {
        console.log(error);
        // If time runs out, log and continue as dry run
        messageLines.push('\nNo confirmation received within time limit. Continued as dry run.');
        console.log('\nNo confirmation received within time limit. Continued as dry run.');
      }
    }
    else {
      messageLines.push('\nDry run enabled; no role changes or database updates were applied.');
      console.log('\nDry run enabled; no role changes or database updates were applied.');
    }



    // Log the members to be changed to console only, with roles
    // for (const memberDetail of membersToSetNewMember) {
    //   const roleNames = memberDetail.roles.map(role => role.name);
    //   console.log(`${memberDetail.member.user.username}: ${roleNames.join(', ')} (IGN: ${memberDetail.ign})`);
    // }

    // Edit the reply message with the final results
    return replyMessage.edit({ content: messageLines.join('\n'), components: [], files: [whitelistRemovalAttachment, characterRemovalAttachment, newMemberAttachment] });
  }
}