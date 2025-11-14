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
      allowNull: false,
    },
    dayOfDeath: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    monthOfDeath: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    yearOfDeath: {
      type: DataTypes.INTEGER,
      allowNull: false,
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