module.exports = (sequelize, DataTypes) => {
  return sequelize.define('socialclasses', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      unique: true,
    },
  });
}