module.exports = (sequelize, DataTypes) => {
  return sequelize.define('houses', {
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
    emojiName: {
      type: DataTypes.STRING
    },
  });
}