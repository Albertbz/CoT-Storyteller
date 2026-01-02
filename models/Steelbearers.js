module.exports = (sequelize, DataTypes) => {
  return sequelize.define('steelbearers', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4
    },
    characterId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    regionId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    logInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const character = await this.getCharacter();
        const region = await this.getRegion();
        const duchy = this.type === 'Duchy' ? await sequelize.models.duchies.findOne({ where: { steelbearerId: this.id } }) : null;

        return (
          `id: \`${this.id}\`\n\n` +
          `character: \`${character.name}\` (\`${this.characterId}\`)\n` +
          `region: \`${region.name}\` (\`${this.regionId}\`)\n` +
          `type: \`${this.type}\`` +
          (this.type === 'Duchy' ? `\nduchy: \`${duchy ? duchy.name : 'Unknown'}\` (\`${duchy ? duchy.id : 'Unknown'}\`)` : '')
        );
      }
    },
    formattedInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const character = await this.getCharacter();
        const region = await this.getRegion();
        const duchy = this.type === 'Duchy' ? await sequelize.models.duchies.findOne({ where: { steelbearerId: this.id } }) : null;

        return (
          `**Character:** ${character.name}\n` +
          `**Region:** ${region.name}\n` +
          `**Type:** ${this.type}` +
          (this.type === 'Duchy' ? `\n**Duchy:** ${duchy ? duchy.name : 'Unknown'}` : '')
        );
      },
      set(value) {
        throw new Error('Do not try to set the `formattedInfo` value!');
      }
    },
    fullType: {
      type: DataTypes.VIRTUAL,
      async get() {
        if (this.type === 'Duchy') {
          const duchy = await sequelize.models.duchies.findOne({ where: { steelbearerId: this.id } });
          return duchy.name;
        }
        else {
          return this.type;
        }
      },
      set(value) {
        throw new Error('Do not try to set the `fullType` value!');
      }
    }
  });
}