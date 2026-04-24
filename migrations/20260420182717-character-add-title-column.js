'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add a title column to the Characters table
    await queryInterface.addColumn('Characters', 'title', {
      type: Sequelize.STRING(100),
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the title column from the Characters table
    await queryInterface.removeColumn('Characters', 'title');
  }
};
