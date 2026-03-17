module.exports = (sequelize, DataTypes) => {
    return sequelize.define('deathPosts', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            unique: true,
            defaultValue: DataTypes.UUIDV4
        },
        deceasedId: {
            type: DataTypes.UUID,
            unique: true
        },
        note: {
            type: DataTypes.TEXT
        },
        scheduledPostTime: {
            type: DataTypes.DATE,
            validate: { isDate: true }
        },
        logInfo: {
            type: DataTypes.VIRTUAL,
            async get() {
                const character = await this.getDeceased();
                return (
                    `id: \`${this.id}\`\n` +
                    `\n` +
                    `character: \`${character.name}\` (\`${character.id}\`)\n` +
                    `note: \`${this.note}\`\n` +
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
                    `**Scheduled Post Time**: ${this.scheduledPostTime}`
                );
            },
            set(value) {
                throw new Error('Do not try to set the formattedInfo value!')
            }
        }
    });
}