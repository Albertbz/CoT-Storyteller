const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, roleMention, EmbedBuilder } = require('discord.js');
const { roles, channels } = require('../../configs/ids.json');
const { postInLogChannel } = require('../../misc.js');
const { Players } = require('../../dbObjects.js');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Purge inactive members (remove from sheets, change Discord roles).')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addAttachmentOption(option =>
      option
        .setName('file')
        .setDescription('The file with the names of all players.')
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const attachment = interaction.options.getAttachment('file');

    const response = await fetch(attachment.attachment);
    const data = await response.text();
    const dataArray = data.split('\r\n')

    const whitelistChannel = interaction.client.channels.cache.get('1327928742080675870');
    let messages = [];

    // Create message pointer
    let message = await whitelistChannel.messages
      .fetch({ limit: 1 })
      .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));

    while (message) {
      await whitelistChannel.messages
        .fetch({ limit: 100, before: message.id })
        .then(messagePage => {
          messagePage.forEach(msg => messages.push(msg));

          // Update the message pointer to be the last message on the page of messages
          message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
        });
    }

    const userIds = []

    for (const ign of dataArray) {
      const res = messages.find(message => {
        try {
          const hasEmbeds = message.embeds.length != 0;
          if (hasEmbeds) {
            const hasDescription = message.embeds[0].description;
            if (hasDescription) {
              return message.embeds[0].description.split('Did you read')[0].toLowerCase().includes(ign.toLowerCase())
            }
          }
          return false;
        }
        catch (error) {
          console.log(error)
        }
      })
      try {
        const userId = res.embeds[0].fields[0].value.split('`')[1].split('`')[0];
        userIds.push(userId);
      }
      catch (error) {
        console.log('Could not find for: ' + ign);
        console.log(error)
      }
    };

    let existingMembers = []
    for (const userId of userIds) {
      try {
        const member = await interaction.guild.members.fetch(userId);
        if (member) {
          let roles = [];
          member.roles.cache.forEach(role => {
            roles.push(role)
          })
          existingMembers.push({ member: member, roles: roles });
        }
        else {
          console.log('skibidi')
          // console.log('Could not find user for: ' + userId);
        }
      }
      catch (error) {
        if (error.name === 'DiscordAPIError[10007]') {
          console.log('Unknown member: ' + userId);
        }
      }
    }

    const filteredExistingMembers = existingMembers.filter(member => !member.roles.some(role => role.name === 'New Member'));

    console.log('\nThe following Discord users have been set back to new member: ');
    for (const member of filteredExistingMembers) {
      await member.member.roles.set(['1327929160320159814']);
      console.log(member.member.user.username);
    }

    // const playersWithCharacters = [];
    // for (const member of filteredExistingMembers) {
    //   const roleNames = member.roles.map(role => role.name);
    //   console.log(member.member.user.username + ': ' + roleNames);

    //   const player = await Players.findOne({ where: { id: member.member.id } });
    //   if (player) {
    //     playersWithCharacters.push(player);
    //   }
    // }

    // console.log('\nPlayers to be removed from spreadsheets:')
    // for (const player of playersWithCharacters) {
    //   console.log(player.ign)
    // }



    return interaction.editReply({ content: 'The players have been purged.', flags: MessageFlags.Ephemeral })
  }
}