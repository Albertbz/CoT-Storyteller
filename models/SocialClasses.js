module.exports = (sequelize, DataTypes) => {
  return sequelize.define('socialclasses', {
    roleId: {
      type: DataTypes.STRING,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      unique: true,
      primaryKey: true,
    },
  });
}