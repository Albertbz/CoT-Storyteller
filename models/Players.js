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
          `**Discord User:** <@${this.id}>\n` +
          `**VS Username:** ${this.ign}\n` +
          `**Timezone:** ${this.timezone ? this.timezone : '-'}\n` +
          `**Character:** ${character ? `${character.name}` : '-'}\n`);
      },
      set(value) {
        throw new Error('Do not try to set the formattedInfo value!')
      }
    }
  });
}