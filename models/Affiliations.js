const { NOTFOUND } = require("sqlite3");

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
      unique: true,
      notNull: true
    },
    isRuling: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    roleId: {
      type: DataTypes.STRING,
    },
    emojiName: {
      type: DataTypes.STRING,
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
    formattedDescription: {
      type: DataTypes.VIRTUAL,
      get() {
        return `ID: \`${this.id}\`\n\nName: \`${this.name}\`\nIs Ruling: \`${this.isRuling ? 'Yes' : 'No'}\`\nRole ID: \`${this.roleId ? this.roleId : '-'}\`\nEmoji Name: \`${this.emojiName ? this.emojiName : '-'}\`\nState: \`${this.state}\`\nRole 1: \`${this.role1}\`\nRole 2: \`${this.role2}\`\nRole 3: \`${this.role3}\``;
      },
      set(value) {
        throw new Error('Do not try to set the formattedDescription value!')
      }
    }
  });
}