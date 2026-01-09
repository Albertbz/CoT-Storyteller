module.exports = (sequelize, DataTypes) => {
  return sequelize.define('houses', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    emojiName: {
      type: DataTypes.STRING
    },
    logInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        return (
          `id: \`${this.id}\`\n` +
          `\n` +
          `name: \`${this.name}\`\n` +
          `emojiName: \`${this.emojiName ? this.emojiName : '-'}\``
        );
      },
      set(value) {
        throw new Error('Do not try to set the logInfo value!')
      }
    },
    formattedInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        return (
          `**House Name:** ${this.name}\n` +
          `**Emoji Name:** ${this.emojiName ? this.emojiName : '-'}\n`);
      },
      set(value) {
        throw new Error('Do not try to set the formattedInfo value!')
      }
    }
  });
}