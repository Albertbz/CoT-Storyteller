'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Get the Worlds entry with the name/primary key of 'Elstrand' and change
    // its name/primary key to 'World'
    const worldEntry = await queryInterface.rawSelect('worlds', {
      where: {
        name: 'Elstrand'
      },
    }, ['name']);

    if (worldEntry) {
      await queryInterface.bulkUpdate('worlds', { name: 'World' }, { name: 'Elstrand' });
    }
  },

  async down(queryInterface, Sequelize) {
    // Get the Worlds entry with the name/primary key of 'World' and change
    // its name/primary key back to 'Elstrand'
    const worldEntry = await queryInterface.rawSelect('worlds', {
      where: {
        name: 'World'
      },
    }, ['name']);

    if (worldEntry) {
      await queryInterface.bulkUpdate('worlds', { name: 'Elstrand' }, { name: 'World' });
    }
  }
};
