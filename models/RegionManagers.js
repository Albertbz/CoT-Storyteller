module.exports = (sequelize, DataTypes) => {
  return sequelize.define('regionmanagers', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4,
    },
    characterId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'characters',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    regionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'regions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    logInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const character = await this.getCharacter();
        const region = await this.getRegion();
        return (
          `id: ${this.id}\n` +
          `\n` +
          `character: ${character.name} (${character.id})\n` +
          `region: ${region.name} (${region.id})`
        )
      },
      set(value) {
        throw new Error('Do not try to set the logInfo value!');
      }
    },
    formattedInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const character = await this.getCharacter();
        const region = await this.getRegion();
        return (
          `**Character:** ${character.name}\n` +
          `**Region:** ${region.name}`
        )
      },
      set(value) {
        throw new Error('Do not try to set the formattedInfo value!');
      }
    }
  });
};