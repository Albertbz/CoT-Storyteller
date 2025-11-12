const { format } = require("sequelize/lib/utils");

module.exports = (sequelize, DataTypes) => {
  return sequelize.define('relationships', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4
    },
    bearingCharacterId: {
      type: DataTypes.UUID
    },
    conceivingCharacterId: {
      type: DataTypes.UUID
    },
    isCommitted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    inheritingTitle: {
      type: DataTypes.STRING,
      defaultValue: 'None'
    },
    formattedDescription: {
      type: DataTypes.VIRTUAL,
      get() {
        return `ID: \`${this.id}\`\n\nBearing Character ID: \`${this.bearingCharacterId}\`\nConceiving Character ID: \`${this.conceivingCharacterId}\`\nIs Committed: \`${this.isCommitted ? 'Yes' : 'No'}\`\nInheriting Title: \`${this.inheritingTitle}\``;
      },
      set(value) {
        throw new Error('Do not try to set the formattedDescription value!')
      }
    }
  });
}