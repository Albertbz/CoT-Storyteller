'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create a new table for keeping track of legitimisation requests for
    // offspring characters. This will include the ID of the offspring, the ID
    // of the player that made the request, and any new name for the offspring
    // that the player wants to set in the legitimisation request.
    await queryInterface.createTable('legitimisationrequests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      offspringId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'playablechildren',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      requestedById: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'players',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      newName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    })
  },

  async down(queryInterface, Sequelize) {
    // Drop the legitimisation requests table if we need to roll back this migration
    await queryInterface.dropTable('legitimisationrequests');
  }
};
