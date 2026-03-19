'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create a new table that stores discord channels, with a name as the 
    // primary key to easily search for the channel, and then a channelId to
    // store the actual discord channel id
    await queryInterface.createTable('discordchannels', {
      name: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false
      },
      channelId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop the DiscordChannels table
    await queryInterface.dropTable('discordchannels');
  }
};
