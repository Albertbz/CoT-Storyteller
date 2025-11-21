module.exports = (sequelize, DataTypes) => {
  return sequelize.define('vassals', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4
    },
    vassalId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    liegeId: {
      type: DataTypes.STRING,
      allowNull: false
    }
  });
}