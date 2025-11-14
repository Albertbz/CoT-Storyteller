module.exports = (sequelize, DataTypes) => {
  return sequelize.define('playablechildren', {
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
    contact1Snowflake: {
      type: DataTypes.STRING
    },
    contact2Snowflake: {
      type: DataTypes.STRING
    },
    comments: {
      type: DataTypes.STRING
    },
    legitimacy: {
      type: DataTypes.STRING
    },
    logInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const character = await this.getCharacter();
        return (
          `id: \`${this.id}\`\n` +
          `\n` +
          `character: \`${character.name}\` (\`${character.id}\`)\n` +
          `contact1: ${this.contact1Snowflake ? `<@${this.contact1Snowflake}> (\`${this.contact1Snowflake}\`)` : '`-`'}\n` +
          `contact2: ${this.contact2Snowflake ? `<@${this.contact2Snowflake}> (\`${this.contact2Snowflake}\`)` : '`-`'}\n` +
          `comments: \`${this.comments ? this.comments : '-'}\`\n` +
          `legitimacy: \`${this.legitimacy ? this.legitimacy : '-'}\``
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
        return (
          `**Character:** ${character ? character.name : '-'}\n` +
          `**Contact 1:** ${this.contact1Snowflake ? `<@${this.contact1Snowflake}>` : '-'}\n` +
          `**Contact 2:** ${this.contact2Snowflake ? `<@${this.contact2Snowflake}>` : '-'}\n` +
          `**Comments:** ${this.comments ? this.comments : '-'}\n` +
          `**Legitimacy:** ${this.legitimacy ? this.legitimacy : '-'}\n`);
      },
      set(value) {
        throw new Error('Do not try to set the formattedInfo value!')
      }
    }
  });
}