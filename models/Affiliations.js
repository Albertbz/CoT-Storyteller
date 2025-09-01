module.exports = (sequelize, DataTypes) => {
  return sequelize.define('affiliations', {
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