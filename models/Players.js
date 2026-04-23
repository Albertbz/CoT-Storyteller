const { Hooks } = require("sequelize/lib/hooks");
const { sendCharacterJoinMessage } = require("../helpers/messageSender");
const { formatCharacterName, getFullTimezoneString, truncateName } = require("../helpers/formatters");

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
    enableNicknameCharacterTitlePrefix: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    enableNicknameGamertagSuffix: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    defaultNickname: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    discordNickname: {
      type: DataTypes.VIRTUAL,
      async get() {
        const character = await this.getCharacter();

        // If no character is assigned, use the default nickname if it exists, otherwise use a placeholder
        const characterName = character ? character.name : null;
        const characterNamePart = characterName ? characterName : this.defaultNickname ? this.defaultNickname : '(no character)';

        // Get possible character title prefix and gamertag suffix based on player settings
        const prefix = this.enableNicknameCharacterTitlePrefix ? character && character.title ? `${character.title} ` : '' : '';
        const suffix = this.enableNicknameGamertagSuffix ? this.gamertag ? ` | ${this.gamertag}` : '' : '';

        // Construct the full nickname and check if it exceeds Discord's 32 character limit. If it does, truncate the character name part as needed.
        let nickname = `${prefix}${characterNamePart}${suffix}`;
        if (nickname.length > 32) {
          // If the combined length of the character name, prefix, and suffix exceeds 32 characters, truncate the character name
          const allowedCharacterNameLength = 32 - suffix.length - prefix.length;
          const truncatedCharacterName = truncateName(characterNamePart, allowedCharacterNameLength);
          const truncatedNewNickname = `${prefix}${truncatedCharacterName}${suffix}`;
          nickname = truncatedNewNickname;
        }
        return nickname;
      },
      set(value) {
        throw new Error('Do not try to set the discordNickname value!')
      }
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
          `enableNicknameCharacterTitlePrefix: \`${this.enableNicknameCharacterTitlePrefix}\`\n` +
          `enableNicknameGamertagSuffix: \`${this.enableNicknameGamertagSuffix}\`\n` +
          `defaultNickname: \`${this.defaultNickname ? this.defaultNickname : '-'}\`\n` +
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
          `**Gamertag:** ${this.gamertag ? this.gamertag : '*None*'}\n` +
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