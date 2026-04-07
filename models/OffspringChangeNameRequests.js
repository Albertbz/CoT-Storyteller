module.exports = (sequelize, DataTypes) => {
  return sequelize.define('offspringnamechangerequests', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4,
    },
    offspringId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    requestedById: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    newName: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  });
}