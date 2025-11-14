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
    logInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const bearingCharacter = await this.getBearingCharacter();
        const conceivingCharacter = await this.getConceivingCharacter();
        return (
          `id: \`${this.id}\`\n` +
          `\n` +
          `bearingCharacter: \`${bearingCharacter.name}\` (\`${bearingCharacter.id}\`)\n` +
          `conceivingCharacter: \`${conceivingCharacter.name}\` (\`${conceivingCharacter.id}\`)\n` +
          `isCommitted: \`${this.isCommitted ? `Yes` : `No`}\`\n` +
          `inheritedTitle: \`${this.inheritedTitle}\``
        );
      },
      set(value) {
        throw new Error('Do not try to set the logInfo value!')
      }
    },
    formattedInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const bearingCharacter = await this.getBearingCharacter();
        const conceivingCharacter = await this.getConceivingCharacter();
        return (
          `**Bearing Character:** ${bearingCharacter ? bearingCharacter.name : '-'}\n` +
          `**Conceiving Character:** ${conceivingCharacter ? conceivingCharacter.name : '-'}\n` +
          `**Committed:** ${this.isCommitted ? `Yes` : `No`}\n` +
          `**Inherited Title:** ${this.inheritedTitle}`
        );
      },
      set(value) {
        throw new Error('Do not try to set the formattedInfo value!')
      }
    }
  });
}