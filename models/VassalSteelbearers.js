module.exports = (sequelize, DataTypes) => {
  return sequelize.define('vassalsteelbearers', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4
    },
    vassalId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    steelbearerId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    logInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const vassal = await this.getVassal();
        const steelbearer = await this.getSteelbearer();
        const character = await steelbearer.getCharacter();

        const vassalRegion = await vassal.getVassalRegion();
        const liegeRegion = await vassal.getLiegeRegion();

        return (
          `id: \`${this.id}\`\n` +
          `\n` +
          `vassal: \`${vassalRegion.name}\` (\`${vassalRegion.id}\`)\n` +
          `liege: \`${liegeRegion.name}\` (\`${liegeRegion.id}\`)\n` +
          `steelbearer: \`${character.name}\` (\`${steelbearer.id}\`)`
        );
      },
      set(value) {
        throw new Error('Do not try to set the logInfo value!')
      }
    },
    formattedInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const vassal = await this.getVassal();
        const steelbearer = await this.getSteelbearer();
        const character = await steelbearer.getCharacter();

        const vassalRegion = await vassal.getVassalRegion();
        const liegeRegion = await vassal.getLiegeRegion();

        return (
          `**Vassal:** ${vassalRegion.name}\n` +
          `**Liege:** ${liegeRegion.name}\n` +
          `**Steelbearer:** ${character.name}`
        );
      },
      set(value) {
        throw new Error('Do not try to set the formattedInfo value!')
      }
    }
  });
}