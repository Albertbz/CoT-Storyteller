'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add columns to the Players table to track nickname. Should two rows to 
    // keep track of whether to enable character title prefix and whether to enable
    // gamertag suffix. Should also have a default nickname that is used when
    // not playing a character
    await queryInterface.addColumn('Players', 'enableNicknameCharacterTitlePrefix', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('Players', 'enableNicknameGamertagSuffix', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('Players', 'defaultNickname', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the columns added in the up function
    await queryInterface.removeColumn('Players', 'enableNicknameCharacterTitlePrefix');
    await queryInterface.removeColumn('Players', 'enableNicknameGamertagSuffix');
    await queryInterface.removeColumn('Players', 'defaultNickname');
  }
};
