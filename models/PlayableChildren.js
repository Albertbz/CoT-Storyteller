module.exports = (sequelize, DataTypes) => {
  return sequelize.define('playablechildren', {
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
    contact1Snowflake: {
      type: DataTypes.STRING
    },
    contact2Snowflake: {
      type: DataTypes.STRING
    },
    comments: {
      type: DataTypes.STRING
    },
    legitimacy: {
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
          `contact1: ${this.contact1Snowflake ? `<@${this.contact1Snowflake}> (\`${this.contact1Snowflake}\`)` : '`-`'}\n` +
          `contact2: ${this.contact2Snowflake ? `<@${this.contact2Snowflake}> (\`${this.contact2Snowflake}\`)` : '`-`'}\n` +
          `comments: \`${this.comments ? this.comments : '-'}\`\n` +
          `legitimacy: \`${this.legitimacy ? this.legitimacy : '-'}\``
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
        const region = await character.getRegion();
        const house = await character.getHouse();
        const world = await sequelize.models.worlds.findOne({ where: { name: 'Elstrand' } });
        const parents = [];
        const parent1 = await character.getParent1();
        const parent2 = await character.getParent2();
        if (parent1) parents.push(parent1.name);
        if (parent2) parents.push(parent2.name);
        const contacts = [];
        if (this.contact1Snowflake) contacts.push(`<@${this.contact1Snowflake}>`);
        if (this.contact2Snowflake) contacts.push(`<@${this.contact2Snowflake}>`);
        return (
          `**Name:** ${character ? character.name : '-'}\n` +
          `**Sex:** ${character ? character.sex : '-'}\n` +
          `**Region:** ${region ? region.name : '-'}\n` +
          `${region && region.name === `Wanderer` ? `` : `**House:** ${house ? house.name : `-`}\n`}` +
          `**Social Class:** ${character ? character.socialClassName : '-'}\n\n` +
          `**Year of Maturity:** ${character ? character.yearOfMaturity : '-'}\n` +
          `**Current Age:** ${character ? world.currentYear - character.yearOfMaturity : '-'}\n\n` +
          `**Legitimacy:** ${this.legitimacy ? this.legitimacy : '-'}\n` +
          `**Parents:** ${parents.length > 0 ? parents.join(' & ') : '-'}\n` +
          `**Comments:** ${this.comments ? this.comments : '-'}\n` +
          `**Contacts:** ${contacts.length > 0 ? contacts.join(', ') : '-'}`
        );
      },
      set(value) {
        throw new Error('Do not try to set the formattedInfo value!')
      }
    }
  });
}