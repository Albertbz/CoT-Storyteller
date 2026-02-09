module.exports = (sequelize, DataTypes) => {
  return sequelize.define('vassals', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4
    },
    vassalId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    liegeId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    logInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const vassal = await this.getVassalRegion();
        const liege = await this.getLiegeRegion();

        return (
          `id: \`${this.id}\`\n` +
          `\n` +
          `vassal: \`${vassal.name}\` (\`${vassal.id}\`)\n` +
          `liege: \`${liege.name}\` (\`${liege.id}\`)`
        );
      },
      set(value) {
        throw new Error('Do not try to set the logInfo value!')
      }
    },
    formattedInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const vassal = await this.getVassalRegion();
        const liege = await this.getLiegeRegion();

        return (
          `**Vassal:** ${vassal.name}\n` +
          `**Liege:** ${liege.name}`);
      },
      set(value) {
        throw new Error('Do not try to set the formattedInfo value!')
      }
    }
  });
}