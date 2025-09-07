module.exports = (sequelize, DataTypes) => {
  return sequelize.define('affiliations', {
    name: {
      type: DataTypes.STRING,
      primaryKey: true,
      unique: true
    },
    roleId: {
      type: DataTypes.STRING,
      unique: true,
    },
    state: {
      type: DataTypes.STRING,
      defaultValue: 'Open'
    },
    role1: {
      type: DataTypes.STRING,
      defaultValue: 'Miners'
    },
    role2: {
      type: DataTypes.STRING,
      defaultValue: 'Lumberjacks'
    },
    role3: {
      type: DataTypes.STRING,
      defaultValue: 'Farmers'
    },
  });
}