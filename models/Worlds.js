module.exports = (sequelize, DataTypes) => {
  return sequelize.define('worlds', {
    name: {
      type: DataTypes.STRING,
      primaryKey: true,
      unique: true,
    },
    currentYear: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  });
}