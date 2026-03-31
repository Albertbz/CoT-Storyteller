'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Get all characters, and the Sex for all characters that have it set to "Undefined"
    // and change it to null
    await queryInterface.bulkUpdate('characters',
      { sex: null },
      { sex: 'Undefined' }
    )
  },

  async down(queryInterface, Sequelize) {
    // Get all characters, and the Sex for all characters that have it set to null
    // and change it to "Undefined"
    await queryInterface.bulkUpdate('characters',
      { sex: 'Undefined' },
      { sex: null }
    )
  }
};
