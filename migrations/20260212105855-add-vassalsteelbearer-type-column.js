'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('vassalsteelbearers', 'type', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Unknown'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('vassalsteelbearers', 'type');
  }
};
