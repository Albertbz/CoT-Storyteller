module.exports = (sequelize, DataTypes) => {
  return sequelize.define('relationships', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4
    },
    bearingCharacterId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    conceivingCharacterId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    isCommitted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    inheritedTitle: {
      type: DataTypes.STRING,
      defaultValue: 'None'
    },
    formattedDescription: {
      type: DataTypes.VIRTUAL,
      async get() {
        const bearingCharacter = await this.getBearingCharacter();
        const conceivingCharacter = await this.getConceivingCharacter();
        return `ID: \`${this.id}\`\n\nBearing Character: \`${bearingCharacter.name}\` (\`${bearingCharacter.id}\`)\nConceiving Character: \`${conceivingCharacter.name}\` (\`${conceivingCharacter.id}\`)\nIs Committed: \`${this.isCommitted ? 'Yes' : 'No'}\`\nInherited Title: \`${this.inheritedTitle}\``;
      },
      set(value) {
        throw new Error('Do not try to set the formattedDescription value!')
      }
    }
  });
}