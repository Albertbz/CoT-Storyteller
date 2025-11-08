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
    dateOfDeath: {
      type: DataTypes.VIRTUAL,
      get() {
        return `${this.dayOfDeath} ${this.monthOfDeath}, '${this.yearOfDeath}`
      },
      set(value) {
        throw new Error('Do not try to set the dateOfDeath value!')
      }
    },
    playedById: {
      type: DataTypes.STRING,
    }
  });
}