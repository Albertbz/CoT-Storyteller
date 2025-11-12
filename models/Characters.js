module.exports = (sequelize, DataTypes) => {
  return sequelize.define('characters', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      defaultValue: 'Unnamed'
    },
    sex: {
      type: DataTypes.STRING,
      defaultValue: 'Undefined',
    },
    affiliationId: {
      type: DataTypes.UUID,
      notNull: true
    },
    socialClassName: {
      type: DataTypes.STRING,
      notNull: true,
      defaultValue: 'Commoner'
    },
    yearOfMaturity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    role: {
      type: DataTypes.STRING,
    },
    pveDeaths: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    comments: {
      type: DataTypes.STRING,
    },
    parent1Id: {
      type: DataTypes.UUID,
    },
    parent2Id: {
      type: DataTypes.UUID
    },
    isRollingForBastards: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    steelbearerState: {
      type: DataTypes.STRING,
    },
    deathRoll1: {
      type: DataTypes.INTEGER
    },
    deathRoll2: {
      type: DataTypes.INTEGER
    },
    deathRoll3: {
      type: DataTypes.INTEGER
    },
    deathRoll4: {
      type: DataTypes.INTEGER
    },
    deathRoll5: {
      type: DataTypes.INTEGER
    },
    formattedDescription: {
      type: DataTypes.VIRTUAL,
      async get() {
        const deathRolls = [this.deathRoll1, this.deathRoll2, this.deathRoll3, this.deathRoll4, this.deathRoll5].filter(roll => roll !== null && roll !== undefined);
        const affiliation = await this.getAffiliation();
        const parent1 = await this.getParent1();
        const parent2 = await this.getParent2();
        return `ID: \`${this.id}\`\n\nName: \`${this.name}\`\nSex: \`${this.sex}\`\nAffiliation: ${affiliation ? `\`${affiliation.name}\` (\`${this.affiliationId}\`)` : '`-`'}\nSocial Class: \`${this.socialClassName}\`\nYear of Maturity: \`${this.yearOfMaturity}\`\nRole: \`${this.role ? this.role : '-'}\`\nPvE Deaths: \`${this.pveDeaths}\`\nComments: \`${this.comments ? this.comments : '-'}\`\nParent1: ${parent1 ? `${parent1.name} (\`${this.parent1Id}\`)` : '`-`'}\nParent2: ${parent2 ? `${parent2.name} (\`${this.parent2Id}\`)` : '`-`'}\nIs Rolling for Bastards: \`${this.isRollingForBastards ? `Yes` : `No`}\`\nSteelbearer State: \`${this.steelbearerState ? this.steelbearerState : '-'}\`\nDeath Rolls: \`${deathRolls.length > 0 ? deathRolls.join(', ') : '-'}\``;
      },
      set(value) {
        throw new Error('Do not try to set the formattedDescription value!')
      }
    }
  });
}