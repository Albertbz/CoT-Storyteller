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
    }
  });
}