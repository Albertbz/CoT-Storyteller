'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add a new column to the Players table for gamertag. This will be a string that can be null.
    await queryInterface.addColumn('players', 'gamertag', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the gamertag column from the Players table if we need to roll back this migration.
    await queryInterface.removeColumn('players', 'gamertag');
  }
};
