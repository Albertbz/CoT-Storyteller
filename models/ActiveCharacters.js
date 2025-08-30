module.exports = (sequelize, DataTypes) => {
  return sequelize.define('active_characters', {
    playerId: {
      type: DataTypes.STRING,
    },
    characterId: {
      type: DataTypes.UUID,
    },
  });
}