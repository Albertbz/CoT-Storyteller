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
    }
  });
};