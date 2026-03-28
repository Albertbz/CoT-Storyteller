module.exports = (sequelize, DataTypes) => {
  return sequelize.define('worlds', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      unique: true,
      defaultValue: 1
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    currentYear: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    hooks: {
      beforeValidate: (world) => {
        // Force the ID to 1 before Sequelize validates the payload
        world.id = 1;
      },
      beforeCreate: async (world) => {
        // Ensure only one world can be created
        const existingWorld = await sequelize.models.worlds.findOne();
        if (existingWorld) {
          throw new Error('A world already exists. Multiple worlds are not allowed.');
        }
      },
      beforeDestroy: async (world) => {
        // Prevent deletion of the world
        throw new Error('Deletion of the world is not allowed.');
      }
    }
  }
  );
}