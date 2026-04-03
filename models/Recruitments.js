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
        const roles = [this.role1, this.role2, this.role3].filter(role => role !== "None");
        const formatter = new Intl.ListFormat('en-US', { style: 'long', type: 'conjunction' });

        return (
          `**Recruitment State:** ${this.state}\n` +
          `**Roles:** ${roles.length > 0 ? formatter.format(roles) : "None in particular"}`
        )
      },
      set(value) {
        throw new Error('Do not try to set the `formattedInfo` value!');
      }
    }
  });
}