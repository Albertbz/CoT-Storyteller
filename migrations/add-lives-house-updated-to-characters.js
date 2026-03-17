'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('characters', 'livesUpdatedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('characters', 'regionUpdatedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the generalChannelId column from the regions table
    await queryInterface.removeColumn('characters', 'livesUpdatedAt');
    await queryInterface.removeColumn('characters', 'regionUpdatedAt');
  }
};
