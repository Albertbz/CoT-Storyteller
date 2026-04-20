const { Hooks } = require("sequelize/lib/hooks");
const { sendCharacterJoinMessage } = require("../helpers/messageSender");
const { formatCharacterName, getFullTimezoneString } = require("../helpers/formatters");

module.exports = (sequelize, DataTypes) => {
  return sequelize.define('players', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      unique: true,
    },
    ign: {
      type: DataTypes.STRING,
      unique: true,
    },
    gamertag: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    timezone: {
      type: DataTypes.STRING,
    },
    characterId: {
      type: DataTypes.UUID
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    logInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const character = await this.getCharacter();
        return (
          `id: \`${this.id}\`\n` +
          `\n` +
          `user: <@${this.id}>\n` +
          `ign: \`${this.ign}\`\n` +
          `gamertag: \`${this.gamertag ? this.gamertag : '-'}\`\n` +
          `timezone: \`${this.timezone ? this.timezone : '-'}\`\n` +
          `character: ${character ? `\`${character.name}\` (\`${this.characterId}\`)` : '`-`'}\n` +
          `active: \`${this.isActive ? `Yes` : `No`}\``
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
          `### General Info\n` +
          `**Discord User:** <@${this.id}>\n` +
          `**VS Username:** ${this.ign}\n` +
          `**Gamertag:** ${this.gamertag ? this.gamertag : '-'}\n` +
          `**Timezone:** ${getFullTimezoneString(this.timezone)}\n\n` +
          `Currently ${character ? `playing ${formatCharacterName(character.name)}.` : 'not playing a character.'}`
        );
      },
      set(value) {
        throw new Error('Do not try to set the formattedInfo value!')
      }
    }
  }, {
    hooks: {
      beforeUpdate: async (player, options) => {
        // If character assignment is being changed, post in the character's
        // region channel about the character joining
        if (player.changed('characterId')) {
          const character = await player.getCharacter();
          if (character) {
            const region = await character.getRegion();
            if (region && region.generalChannelId) {
              sendCharacterJoinMessage(player, character, region);
            }
          }
        }
      }
    }
  }
  );
}