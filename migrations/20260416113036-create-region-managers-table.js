'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create a new table for region managers. This table will have a foreign key
    // to the Characters table and a foreign key to the Regions table.
    await queryInterface.createTable('regionmanagers', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      characterId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'Characters',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      regionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Regions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop the RegionManagers table if we need to roll back this migration.
    await queryInterface.dropTable('regionmanagers');
  }
};
