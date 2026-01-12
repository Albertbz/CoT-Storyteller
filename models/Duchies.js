module.exports = (sequelize, DataTypes) => {
  return sequelize.define('duchies', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    regionId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    steelbearerId: {
      type: DataTypes.UUID
    },
    logInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const region = await this.getRegion();
        const steelbearer = await this.getSteelbearer();
        let steelbearerCharacter = null;
        if (steelbearer) {
          steelbearerCharacter = await steelbearer.getCharacter();
        }
        return (
          `id: \`${this.id}\`\n` +
          `\n` +
          `name: \`${this.name}\`\n` +
          `region: ${region ? `\`${region.name}\` (\`${this.regionId}\`)` : '`-`'}\n` +
          `steelbearer: ${steelbearer ? `\`${steelbearerCharacter.name}\` (\`${this.steelbearerId}\`)` : '`-`'}`
        );
      },
      set(value) {
        throw new Error('Do not try to set the logInfo value!')
      }
    },
    formattedInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const region = await this.getRegion();
        const steelbearer = await this.getSteelbearer();
        let steelbearerCharacter = null;
        if (steelbearer) {
          steelbearerCharacter = await steelbearer.getCharacter();
        }
        return (
          `**Duchy Name:** ${this.name}\n` +
          `**Region:** ${region ? region.name : '-'}\n` +
          `**Steelbearer:** ${steelbearer ? steelbearerCharacter.name : '-'}\n`);
      },
      set(value) {
        throw new Error('Do not try to set the formattedInfo value!')
      }
    }
  });
}