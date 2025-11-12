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
    formattedDescription: {
      type: DataTypes.VIRTUAL,
      async get() {
        const character = await this.getCharacter();
        return `ID: \`${this.id}\`\n\nCharacter: \`${character.name}\` (\`${character.id}\`)\nContact 1 Discord User: ${this.contact1Snowflake ? `<@${this.contact1Snowflake}>` : '-'}\nContact 2 Discord User: ${this.contact2Snowflake ? `<@${this.contact2Snowflake}>` : '-'}\nComments: \`${this.comments ? this.comments : '-'}\`\nLegitimacy: \`${this.legitimacy ? this.legitimacy : '-'}\``;
      },
      set(value) {
        throw new Error('Do not try to set the formattedDescription value!')
      }
    }
  });
}