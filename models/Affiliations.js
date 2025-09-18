module.exports = (sequelize, DataTypes) => {
  return sequelize.define('affiliations', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING,
      unique: true
    },
    roleId: {
      type: DataTypes.STRING,
      unique: true,
    },
    emojiName: {
      type: DataTypes.STRING,
      unique: true
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