const { SlashCommandBuilder, InteractionContextType, MessageFlags, time, TimestampStyles, strikethrough, hyperlink, bold, italic, inlineCode, userMention, EmbedBuilder } = require("discord.js");
const { channels, roles } = require('../../configs/ids.json');
const { Affiliations } = require("../../dbObjects.js");
const { Op } = require('sequelize');
const { postInLogChannel } = require('../../misc.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('update')
    .setDescription('Update recruitment, X, or X.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addSubcommand(subcommand =>
      subcommand
        .setName('recruitment')
        .setDescription('Update the recruitment post.')
        .addStringOption(option =>
          option
            .setName('house')
            .setDescription('The House to update the recruitment of.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('state')
            .setDescription('The state of the recruitment.')
            .addChoices(
              { name: 'Full', value: 'Full' },
              { name: 'Almost Full', value: 'Almost Full' },
              { name: 'Open', value: 'Open' },
              { name: 'Urgent', value: 'Urgent' }
            )
        )
        .addStringOption(option =>
          option
            .setName('role1')
            .setDescription('The first role that the House is in need of.')
            .addChoices(
              { name: 'Smiths', value: 'Smiths' },
              { name: 'Builders', value: 'Builders' },
              { name: 'Cooks', value: 'Cooks' },
              { name: 'Lumberjacks', value: 'Lumberjacks' },
              { name: 'Soldiers', value: 'Soldiers' },
              { name: 'Potters', value: 'Potters' },
              { name: 'Miners', value: 'Miners' },
              { name: 'Carpenters', value: 'Carpenters' },
              { name: 'Tailors', value: 'Tailors' },
              { name: 'Healears', value: 'Healers' },
              { name: 'Farmers', value: 'Farmers' },
              { name: 'Hunters', value: 'Hunters' },
              { name: 'Clockmakers', value: 'Clockmakers' }
            )
        )
        .addStringOption(option =>
          option
            .setName('role2')
            .setDescription('The second role that the House is in need of.')
            .addChoices(
              { name: 'Smiths', value: 'Smiths' },
              { name: 'Builders', value: 'Builders' },
              { name: 'Cooks', value: 'Cooks' },
              { name: 'Lumberjacks', value: 'Lumberjacks' },
              { name: 'Soldiers', value: 'Soldiers' },
              { name: 'Potters', value: 'Potters' },
              { name: 'Miners', value: 'Miners' },
              { name: 'Carpenters', value: 'Carpenters' },
              { name: 'Tailors', value: 'Tailors' },
              { name: 'Healears', value: 'Healers' },
              { name: 'Farmers', value: 'Farmers' },
              { name: 'Hunters', value: 'Hunters' },
              { name: 'Clockmakers', value: 'Clockmakers' }
            )
        )
        .addStringOption(option =>
          option
            .setName('role3')
            .setDescription('The third role that the House is in need of.')
            .addChoices(
              { name: 'Smiths', value: 'Smiths' },
              { name: 'Builders', value: 'Builders' },
              { name: 'Cooks', value: 'Cooks' },
              { name: 'Lumberjacks', value: 'Lumberjacks' },
              { name: 'Soldiers', value: 'Soldiers' },
              { name: 'Potters', value: 'Potters' },
              { name: 'Miners', value: 'Miners' },
              { name: 'Carpenters', value: 'Carpenters' },
              { name: 'Tailors', value: 'Tailors' },
              { name: 'Healears', value: 'Healers' },
              { name: 'Farmers', value: 'Farmers' },
              { name: 'Hunters', value: 'Hunters' },
              { name: 'Clockmakers', value: 'Clockmakers' }
            )
        )
    ),
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();

    const affilations = await Affiliations.findAll({
      where: { name: { [Op.startsWith]: focusedValue }, isRuling: true },
      attributes: ['name']
    })

    choices = affilations.splice(0, 25).map(affiliation => ({ name: affiliation.name, value: affiliation.name }));

    await interaction.respond(choices);
  },
  async execute(interaction) {
    if (interaction.options.getSubcommand() === 'recruitment') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const houseName = interaction.options.getString('house');
      const state = interaction.options.getString('state');
      const role1 = interaction.options.getString('role1');
      const role2 = interaction.options.getString('role2');
      const role3 = interaction.options.getString('role3');

      // If none of the optional arguments were given
      if (!(state || role1 || role2 || role3)) return interaction.reply({ content: 'You have to specify what to change.', flags: MessageFlags.Ephemeral });

      try {
        // Check whether the recruitment post exists already
        const houseInfoChannel = await interaction.client.channels.fetch(channels.housesInfo);
        const posts = (await houseInfoChannel.threads.fetch()).threads;
        const recruitmentPost = posts.find((post) => post.name === 'House Recruitment');
        const recruitmentPostExists = recruitmentPost != undefined;

        const updatedAffiliation = await Affiliations.findOne({
          where: { name: houseName }
        });

        let updatedFields = []

        // Update the specific house recruitment info in the database
        if (state) {
          const oldState = updatedAffiliation.state;
          await updatedAffiliation.update({
            state: state
          })
          updatedFields.push({
            fieldName: 'State',
            old: oldState,
            new: state
          })
        }
        if (role1) {
          const oldRole1 = updatedAffiliation.role1;
          await updatedAffiliation.update({
            role1: role1
          })
          updatedFields.push({
            fieldName: 'Role 1',
            old: oldRole1,
            new: role1
          })
        }
        if (role2) {
          const oldRole2 = updatedAffiliation.role2;
          await updatedAffiliation.update({
            role2: role2
          })
          updatedFields.push({
            fieldName: 'Role 2',
            old: oldRole2,
            new: role2
          })
        }
        if (role3) {
          const oldRole3 = updatedAffiliation.role3;
          await updatedAffiliation.update({
            role3: role3
          })
          updatedFields.push({
            fieldName: 'Role 3',
            old: oldRole3,
            new: role3
          })
        }

        // Create the message to be posted
        const lastUpdatedText = '## Last updated: ' + time(new Date(), TimestampStyles.LongDate);
        const descriptionText = italic('For new players joining, please prioritize the houses in need in order to ensure fun for everyone.');
        const overviewLink = '## ' + hyperlink('Detailed Roster Overview', '<https://docs.google.com/spreadsheets/d/1vPk2oXTCj5I6gMtMKNL6LpmL-qFX5LqM2J5oQHK-ZSo/edit?usp=sharing>');

        // Get all affiliations with their recruitment info
        const houses = await Affiliations.findAll({
          where: { name: { isRuling: true } }
        })

        const guildEmojis = await interaction.guild.emojis.fetch();
        let housesText = ''
        houses.forEach(house => {
          const houseEmoji = guildEmojis.find(emoji => emoji.name === house.emojiName);
          const houseText = houseEmoji.toString() + bold('House ' + house.name) + houseEmoji.toString();
          let rolesText = 'Need: ' + house.role1 + ', ' + house.role2 + ', ' + house.role3;

          let stateText = '';
          switch (house.state) {
            case 'Full':
              stateText = 'Closed Recruitment (:red_circle: - Full)';
              rolesText = strikethrough(rolesText);
              break;
            case 'Almost Full':
              stateText = 'Open Recruitment (:yellow_circle: - Almost Full)';
              break;
            case 'Open':
              stateText = 'Open Recruitment (:green_circle: - Players Needed)';
              break;
            case 'Urgent':
              stateText = 'Open Recruitment (:blue_circle: - Players Urgently Needed)';
              break;

          }
          housesText +=
            houseText + '\n' +
            stateText + '\n' +
            rolesText + '\n\n'
        });

        const fullMessage =
          lastUpdatedText + '\n' +
          housesText + '\n' +
          descriptionText + '\n\n' +
          overviewLink

        // const embed = new EmbedBuilder()
        //   .setTitle('House Recruitment')
        //   .setDescription(fullMessage)

        if (recruitmentPostExists) {
          const messages = await recruitmentPost.messages.fetch();
          const recruitmentPostMessage = messages.first();
          // recruitmentPostMessage.edit({ embeds: [embed] });
          recruitmentPostMessage.edit({ content: fullMessage });
        }
        else {
          // const newRecruitmentPost = await houseInfoChannel.threads.create({
          //   name: 'House Recruitment',
          //   message: {
          //     embeds: [embed]
          //   }
          // })
          const newRecruitmentPost = await houseInfoChannel.threads.create({
            name: 'House Recruitment',
            message: {
              content: fullMessage
            }
          })
        }

        let updatedFieldsText = '';

        updatedFields.forEach(updatedField => {
          updatedFieldsText +=
            updatedField.fieldName + ': ' + inlineCode(updatedField.old) + ' -> ' + inlineCode(updatedField.new) + '\n';
        })

        updatedFieldsText = updatedFieldsText.replace(/\n$/, '');

        postInLogChannel(
          'Recruitment Post Updated',
          '**Updated by: ' + userMention(interaction.user.id) + '**\n\n' +
          '**House ' + updatedAffiliation.name + '**:\n' +
          updatedFieldsText,
          0xD98C00
        );
        return interaction.editReply({ content: 'Updated the recruitment post for House ' + updatedAffiliation.name + ': \n' + updatedFieldsText, flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        console.log(error);
      }

    }
  }
}