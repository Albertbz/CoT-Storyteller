module.exports = (sequelize, DataTypes) => {
  return sequelize.define('discordchannels', {
    name: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    channelId: {
      type: DataTypes.STRING,
      allowNull: false
    }
  });
}