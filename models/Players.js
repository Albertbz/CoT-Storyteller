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
      defaultValue: 'Undefined',
    },
    characterId: {
      type: DataTypes.UUID
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  });
}