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
    }
  });
}