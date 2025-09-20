module.exports = (sequelize, DataTypes) => {
  return sequelize.define('playablechildren', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4
    },
    characterId: {
      type: DataTypes.UUID
    },
    contact1Snowflake: {
      type: DataTypes.STRING
    },
    contact2Snowflake: {
      type: DataTypes.STRING
    },
  });
}