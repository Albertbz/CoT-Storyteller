'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create a table that stores discord roles. Name should be "DiscordRoles"
    // with columns "name" (primary key, string), and "roleId" (string)
    await queryInterface.createTable('discordroles', {
      name: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false,
      },
      roleId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('discordroles');
  }
};
