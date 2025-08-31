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
      defaultValue: '',
    },
    affiliation: {
      type: DataTypes.STRING,
      defaultValue: 'Wanderer',
    },
    socialClass: {
      type: DataTypes.STRING,
      defaultValue: 'Commoner',
    },
    yearOfMaturity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    pveDeaths: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  });
}