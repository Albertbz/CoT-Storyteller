'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vassalsteelbearers', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        unique: true,
        defaultValue: Sequelize.UUIDV4
      },
      vassalId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'vassals',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      steelbearerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'steelbearers',
          key: 'id'
        },
        onDelete: 'CASCADE'
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('vassalsteelbearers');
  }
};
