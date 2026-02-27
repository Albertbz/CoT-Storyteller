const { format } = require("sequelize/lib/utils");

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('deathPosts', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            unique: true,
            defaultValue: DataTypes.UUIDV4
        },
        characterId: {
            type: DataTypes.UUID,
            unique: true
        },
        note: {
            type: DataTypes.TEXT
        },
        posted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        scheduledPostTime: {
            type: DataTypes.DATE,
            validate: {isDate: true}
        },
        createdTime: {
            type: DataTypes.DATE
        },

        logInfo: {
            type: DataTypes.VIRTUAL,
            async get() {
                const character = await this.getCharacter();
                return (
                    `id: \`${this.id}\`\n` +
                    `\n` +
                    `character: \`${character.name}\` (\`${character.id}\`)\n` +
                    `note: \`${this.note}\`\n` +
                    `posted: \`${this.posted}\`\n` +
                    `scheduled: ${this.scheduledPostTime}`
                );
            },
            set(value) {
                throw new Error('Do not try to set the logInfo value!')
            }
        },
        formattedInfo: {
            type: DataTypes.VIRTUAL,
            async get() {
                const character = await this.getCharacter();
                return (`**Character**: \`${character.name}\` (\`${character.id}\`)\n` +
                    `**Final Note**: \`${this.note}\`\n` +
                    `**Posted**: \`${this.posted}\`\n` +
                    `**Scheduled Post Time**: ${this.scheduledPostTime}`
                );
            },
            set(value) {
                throw new Error('Do not try to set the formattedInfo value!')
            }
        }
    });
}