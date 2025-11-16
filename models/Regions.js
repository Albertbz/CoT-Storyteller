module.exports = (sequelize, DataTypes) => {
  return sequelize.define('regions', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    rulingHouseId: {
      type: DataTypes.UUID
    },
    roleId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    recruitmentId: {
      type: DataTypes.UUID,
      allowNull: true
    }
  });
}