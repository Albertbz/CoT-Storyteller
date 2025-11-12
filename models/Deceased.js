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
    formattedDescription: {
      type: DataTypes.VIRTUAL,
      async get() {
        const character = await this.getCharacter();
        return `ID: \`${this.id}\`\n\nCharacter: \`${character.name}\` (\`${character.id}\`)\nDate of Death: \`${this.dateOfDeath}\`\nCause of Death: \`${this.causeOfDeath ? this.causeOfDeath : '-'}\`\nPlayed By: ${this.playedById ? `<@${this.playedById}>` : '-'}`;
      },
      set(value) {
        throw new Error('Do not try to set the formattedDescription value!')
      }
    }
  });
}