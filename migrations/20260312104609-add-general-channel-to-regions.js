'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add a new column to the regions table called generalChannelId to store
    // the ID of the general discord channel for the region
    await queryInterface.addColumn('regions', 'generalChannelId', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the generalChannelId column from the regions table
    await queryInterface.removeColumn('regions', 'generalChannelId');
  }
};
