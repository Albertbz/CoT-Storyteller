module.exports = (sequelize, DataTypes) => {
  return sequelize.define('discordroles', {
    name: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    roleId: {
      type: DataTypes.STRING,
      allowNull: false
    }
  });
}