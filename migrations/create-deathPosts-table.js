'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('deathPosts', {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                unique: true,
                defaultValue: Sequelize.UUIDV4
            },
            characterId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'players',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            note: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            posted: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            scheduledPostTime: {
                type: Sequelize.DATE,
                allowNull: false
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
              },
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('deathPosts');
    }
};
