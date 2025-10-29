module.exports = (sequelize, DataTypes) => {
  return sequelize.define('characters', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      defaultValue: 'Unnamed'
    },
    sex: {
      type: DataTypes.STRING,
      defaultValue: 'Undefined',
    },
    affiliationId: {
      type: DataTypes.UUID,
    },
    socialClassName: {
      type: DataTypes.STRING,
      defaultValue: 'Commoner'
    },
    yearOfMaturity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    role: {
      type: DataTypes.STRING,
    },
    pveDeaths: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    comments: {
      type: DataTypes.STRING,
    },
    parent1Id: {
      type: DataTypes.UUID,
    },
    parent2Id: {
      type: DataTypes.UUID
    },
    isRollingForBastards: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    steelbearerState: {
      type: DataTypes.STRING,
    },
    deathRoll1: {
      type: DataTypes.INTEGER
    },
    deathRoll2: {
      type: DataTypes.INTEGER
    },
    deathRoll3: {
      type: DataTypes.INTEGER
    },
    deathRoll4: {
      type: DataTypes.INTEGER
    },
    deathRoll5: {
      type: DataTypes.INTEGER
    },
  });
}