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
    logInfo: {
      type: DataTypes.VIRTUAL,
      get() {
        return (
          `id: \`${this.id}\`\n` +
          `\n` +
          `name: \`${this.name}\`\n` +
          `isRuling: \`${this.isRuling ? 'Yes' : 'No'}\`\n` +
          `roleId: \`${this.roleId ? this.roleId : '-'}\`\n` +
          `emojiName: \`${this.emojiName ? this.emojiName : '-'}\`\n` +
          `state: \`${this.state}\`\n` +
          `role1: \`${this.role1}\`\n` +
          `role2: \`${this.role2}\`\n` +
          `role3: \`${this.role3}\``
        );
      },
      set(value) {
        throw new Error('Do not try to set the logInfo value!')
      }
    }
  });
}