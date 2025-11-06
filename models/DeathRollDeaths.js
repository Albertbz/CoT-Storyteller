module.exports = (sequelize, DataTypes) => {
  return sequelize.define('deathrolldeaths', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4,
    },
    characterId: {
      type: DataTypes.UUID,
      notNull: true,
    },
    dayOfDeath: {
      type: DataTypes.INTEGER,
      notNull: true,
    },
    monthOfDeath: {
      type: DataTypes.STRING,
      notNull: true,
    },
    yearOfDeath: {
      type: DataTypes.INTEGER,
      notNull: true,
    },
    playedById: {
      type: DataTypes.STRING,
    }
  });
}