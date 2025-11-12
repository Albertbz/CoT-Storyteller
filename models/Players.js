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
      async get() {
        const character = await this.getCharacter();
        return `ID: \`${this.id}\`\n\nDiscord User: <@${this.id}>\nVS Username: \`${this.ign}\`\nTimezone: \`${this.timezone ? this.timezone : '-'}\`\nCharacter: ${character ? `\`${character.name}\` (\`${this.characterId}\`)` : '`-`'}\nActive: \`${this.isActive ? 'Yes' : 'No'}\``;
      },
      set(value) {
        throw new Error('Do not try to set the formattedDescription value!')
      }
    }
  });
}