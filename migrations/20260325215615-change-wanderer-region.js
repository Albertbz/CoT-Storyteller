'use strict';

const { WANDERER_REGION_ID } = require('../constants');
const crypto = require('crypto'); // Native Node.js module for UUIDs

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Fetch the full row using a standard query to get both id and roleId
      const [regions] = await queryInterface.sequelize.query(
        `SELECT id, "roleId" FROM regions WHERE name = 'Wanderer' LIMIT 1;`,
        { transaction }
      );
      const wandererRegion = regions[0];

      if (wandererRegion) {
        // 2. Insert the new region FIRST to satisfy foreign key constraints
        await queryInterface.bulkInsert('regions', [{
          id: WANDERER_REGION_ID,
          name: 'Temp Name',
          roleId: wandererRegion.roleId,
          createdAt: new Date(), // Standard Sequelize requirement
          updatedAt: new Date()
        }], { transaction });

        // 3. Re-point characters to the new region
        await queryInterface.bulkUpdate('characters',
          { regionId: WANDERER_REGION_ID },
          { regionId: wandererRegion.id },
          { transaction }
        );

        // 4. Delete the old region
        await queryInterface.bulkDelete('regions',
          { id: wandererRegion.id },
          { transaction }
        );

        // 5. Rename the new region
        await queryInterface.bulkUpdate('regions',
          { name: 'Wanderer' },
          { id: WANDERER_REGION_ID },
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [regions] = await queryInterface.sequelize.query(
        `SELECT id, "roleId" FROM regions WHERE id = '${WANDERER_REGION_ID}' LIMIT 1;`,
        { transaction }
      );
      const wandererRegion = regions[0];

      if (wandererRegion) {
        // Use crypto.randomUUID() to generate a valid string UUID
        const newWandererRegionId = crypto.randomUUID();

        await queryInterface.bulkInsert('regions', [{
          id: newWandererRegionId,
          name: 'Wanderer',
          roleId: wandererRegion.roleId,
          createdAt: new Date(),
          updatedAt: new Date()
        }], { transaction });

        await queryInterface.bulkUpdate('characters',
          { regionId: newWandererRegionId },
          { regionId: WANDERER_REGION_ID },
          { transaction }
        );

        await queryInterface.bulkDelete('regions',
          { id: WANDERER_REGION_ID },
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};