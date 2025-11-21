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
    },
    formattedInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        return (
          `**Recruitment State:** ${this.state}\n` +
          `**Role 1:** ${this.role1}\n` +
          `**Role 2:** ${this.role2}\n` +
          `**Role 3:** ${this.role3}`
        )
      },
      set(value) {
        throw new Error('Do not try to set the `formattedInfo` value!');
      }
    }
  });
}