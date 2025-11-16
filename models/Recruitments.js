module.exports = (sequelize, DataTypes) => {
  return sequelize.define('recruitments', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4
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
    }
  });
}