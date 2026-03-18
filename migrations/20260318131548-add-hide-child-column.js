'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add a column to the PlayableChildren table called "hidden" that is a
    // boolean and defaults to false
    await queryInterface.addColumn('playablechildren', 'hidden', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the "hidden" column from the PlayableChildren table
    await queryInterface.removeColumn('playablechildren', 'hidden');
  }
};
