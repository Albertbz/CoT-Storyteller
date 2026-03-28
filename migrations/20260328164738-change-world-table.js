'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Create a new table with the new schema, migrate data, and then drop the 
     * old table.
     */
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Create a new temporary table with the updated schema
      await queryInterface.createTable('worlds_temp', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          unique: true,
          defaultValue: 1
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        currentYear: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // 2. Migrate data from the old 'worlds' table to the new 'worlds_temp' table
      await queryInterface.sequelize.query(
        `INSERT INTO worlds_temp (name, currentYear, createdAt, updatedAt)
         SELECT name, currentYear, createdAt, updatedAt FROM worlds;`,
        { transaction }
      );

      // 3. Drop the old 'worlds' table
      await queryInterface.dropTable('worlds', { transaction });

      // 4. Rename the new 'worlds_temp' table to 'worlds'
      await queryInterface.renameTable('worlds_temp', 'worlds', { transaction });

      await transaction.commit();
    }
    catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    /**
     * Revert the changes by creating the old table schema, migrating data back, and dropping the new table.
     */
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Create the old 'worlds' table schema
      await queryInterface.createTable('worlds_old', {
        name: {
          type: Sequelize.STRING,
          allowNull: false,
          primaryKey: true,
          unique: true,
        },
        currentYear: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // 2. Migrate data from the current 'worlds' table back to the old 'worlds_old' table
      await queryInterface.sequelize.query(
        `INSERT INTO worlds_old (name, currentYear, createdAt, updatedAt)
         SELECT name, currentYear, createdAt, updatedAt FROM worlds;`,
        { transaction }
      );

      // 3. Drop the current 'worlds' table
      await queryInterface.dropTable('worlds', { transaction });

      // 4. Rename the 'worlds_old' table back to 'worlds'
      await queryInterface.renameTable('worlds_old', 'worlds', { transaction });

      await transaction.commit();
    }
    catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
