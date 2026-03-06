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
                    model: 'deceased',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            note: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            scheduledPostTime: {
                type: Sequelize.TIME,
                allowNull: false
            },
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('deathPosts');
    }
};
