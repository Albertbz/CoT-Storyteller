const { roles } = require('../configs/ids.json');

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
    affiliationName: {
      type: DataTypes.STRING,
      defaultValue: 'Wanderer'
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
      defaultValue: 'Undefined',
    },
    pveDeaths: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isSteelbearer: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  });
}