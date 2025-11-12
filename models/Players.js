const { format } = require("sequelize/lib/utils");

module.exports = (sequelize, DataTypes) => {
  return sequelize.define('players', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      unique: true,
    },
    ign: {
      type: DataTypes.STRING,
      unique: true,
    },
    timezone: {
      type: DataTypes.STRING,
    },
    characterId: {
      type: DataTypes.UUID
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    formattedDescription: {
      type: DataTypes.VIRTUAL,
      get() {
        return `ID: \`${this.id}\`\n\nDiscord User: <@${this.id}>\nVS Username: \`${this.ign}\`\nTimezone: \`${this.timezone ? this.timezone : '-'}\`\nCharacter ID: \`${this.characterId ? this.characterId : '-'}\`\nActive: \`${this.isActive ? 'Yes' : 'No'}\``;
      },
      set(value) {
        throw new Error('Do not try to set the formattedDescription value!')
      }
    }
  });
}