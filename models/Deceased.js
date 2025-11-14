const { format } = require("sequelize/lib/utils");

module.exports = (sequelize, DataTypes) => {
  return sequelize.define('deceased', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4
    },
    characterId: {
      type: DataTypes.UUID,
      unique: true
    },
    dayOfDeath: {
      type: DataTypes.INTEGER
    },
    monthOfDeath: {
      type: DataTypes.STRING
    },
    yearOfDeath: {
      type: DataTypes.INTEGER
    },
    dateOfDeath: {
      type: DataTypes.VIRTUAL,
      get() {
        return `${this.dayOfDeath} ${this.monthOfDeath}, '${this.yearOfDeath}`
      },
      set(value) {
        throw new Error('Do not try to set the dateOfDeath value!')
      }
    },
    causeOfDeath: {
      type: DataTypes.STRING
    },
    playedById: {
      type: DataTypes.STRING
    },
    logInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const character = await this.getCharacter();
        return (
          `id: \`${this.id}\`\n` +
          `\n` +
          `character: \`${character.name}\` (\`${character.id}\`)\n` +
          `dateOfDeath: \`${this.dateOfDeath}\`\n` +
          `causeOfDeath: \`${this.causeOfDeath ? this.causeOfDeath : '-'}\`\n` +
          `playedBy: ${this.playedById ? `<@${this.playedById}> (\`${this.playedById}\`)` : '`-`'}`
        );
      },
      set(value) {
        throw new Error('Do not try to set the logInfo value!')
      }
    },
    formattedInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const character = await this.getCharacter();
        return (
          `**Character:** ${character ? character.name : '-'}\n` +
          `**Date of Death:** ${this.dateOfDeath}\n` +
          `**Cause of Death:** ${this.causeOfDeath ? this.causeOfDeath : '-'}\n` +
          `**Played By:** ${this.playedById ? `<@${this.playedById}>` : '-'}\n`);
      },
      set(value) {
        throw new Error('Do not try to set the formattedInfo value!')
      }
    }
  });
}