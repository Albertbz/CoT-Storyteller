module.exports = (sequelize, DataTypes) => {
  return sequelize.define('deceased', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4
    },
    characterId: {
      type: DataTypes.UUID,
      unique: true
    },
    dayOfDeath: {
      type: DataTypes.INTEGER
    },
    monthOfDeath: {
      type: DataTypes.STRING
    },
    yearOfDeath: {
      type: DataTypes.INTEGER
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
    causeOfDeath: {
      type: DataTypes.STRING
    },
    ageOfDeath: {
      type: DataTypes.INTEGER
    },
    playedById: {
      type: DataTypes.STRING
    }
  });
}