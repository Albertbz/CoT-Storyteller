const { Op } = require('sequelize');

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
    regionId: {
      type: DataTypes.UUID,
    },
    houseId: {
      type: DataTypes.UUID,
    },
    socialClassName: {
      type: DataTypes.STRING,
      allowNull: false,
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
      defaultValue: 'None',
      allowNull: false
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
    logInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const region = await this.getRegion();
        const house = await this.getHouse();
        const parent1 = await this.getParent1();
        const parent2 = await this.getParent2();
        return (
          `id: \`${this.id}\`\n` +
          `\n` +
          `name: \`${this.name}\`\n` +
          `sex: \`${this.sex}\`\n` +
          `region: ${region ? `\`${region.name}\` (\`${this.regionId}\`)` : '`-`'}\n` +
          `house: ${house ? `\`${house.name}\` (\`${this.houseId}\`)` : '`-`'}\n` +
          `socialClass: \`${this.socialClassName}\`\n` +
          `yearOfMaturity: \`${this.yearOfMaturity}\`\n` +
          `role: \`${this.role ? this.role : '-'}\`\n` +
          `pveDeaths: \`${this.pveDeaths}\`\n` +
          `comments: \`${this.comments ? this.comments : '-'}\`\n` +
          `parent1: ${parent1 ? `${parent1.name} (\`${this.parent1Id}\`)` : '`-`'}\n` +
          `parent2: ${parent2 ? `${parent2.name} (\`${this.parent2Id}\`)` : '`-`'}\n` +
          `isRollingforBastards: \`${this.isRollingForBastards ? `Yes` : `No`}\`\n` +
          `steelbearerState: \`${this.steelbearerState}\`\n` +
          `deathRoll1: \`${this.deathRoll1 ? this.deathRoll1 : '-'}\`\n` +
          `deathRoll2: \`${this.deathRoll2 ? this.deathRoll2 : '-'}\`\n` +
          `deathRoll3: \`${this.deathRoll3 ? this.deathRoll3 : '-'}\`\n` +
          `deathRoll4: \`${this.deathRoll4 ? this.deathRoll4 : '-'}\`\n` +
          `deathRoll5: \`${this.deathRoll5 ? this.deathRoll5 : '-'}\``);
      },
      set(value) {
        throw new Error('Do not try to set the logInfo value!')
      }
    },
    formattedInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const region = await this.getRegion();
        const house = await this.getHouse();

        const generalInfo = (
          `**Name:** ${this.name}\n` +
          // `**Sex:** ${this.sex}\n` +
          `**Region:** ${region ? region.name : `-`}\n` +
          `**House:** ${house ? house.name : `-`}\n` +
          `**Social Class:** ${this.socialClassName}\n` +
          `**Role:** ${this.role ? this.role : '-'}\n` +
          `**Comments:** ${this.comments ? this.comments : '-'}`);

        // Show all info for non-commoners and wanderers
        if (this.socialClassName !== 'Commoner' || region.name === 'Wanderer') {
          const infoList = [generalInfo];

          const agingInfo = (
            `### Aging Info\n` +
            `**Year of Maturity:** ${this.yearOfMaturity}\n` +
            `**PvE Deaths:** ${this.pveDeaths}\n` +
            `**Death rolls:**\n` +
            `- Age 4: ${this.deathRoll1 ? `${this.deathRoll1} (${this.deathRoll1 < 6 ? `:x:` : `:white_check_mark:`})` : `-`} \n` +
            `- Age 5: ${this.deathRoll2 ? `${this.deathRoll2} (${this.deathRoll2 < 26 ? `:x:` : `:white_check_mark:`})` : `-`} \n` +
            `- Age 6: ${this.deathRoll3 ? `${this.deathRoll3} (${this.deathRoll3 < 51 ? `:x:` : `:white_check_mark:`})` : `-`} \n` +
            `- Age 7: ${this.deathRoll4 ? `${this.deathRoll4} (${this.deathRoll4 < 76 ? `:x:` : `:white_check_mark:`})` : `-`} \n` +
            `- Age 8+: ${this.deathRoll5 ? `${this.deathRoll5} (${this.deathRoll5 < 91 ? `:x:` : `:white_check_mark:`})` : `-`}`
          );
          infoList.push(agingInfo);

          // Check whether character is dead, add death info if so
          const deceasedRecord = await sequelize.models.deceased.findOne({ where: { characterId: this.id } });
          if (deceasedRecord) {
            const deathInfo = (
              `### Death Info\n` +
              `**Date of Death:** ${deceasedRecord.dateOfDeath}\n` +
              `**Cause of Death:** ${deceasedRecord.causeOfDeath}\n` +
              `**Played By:** <@${deceasedRecord.playedById}>`
            );
            infoList.push(deathInfo);
          }

          // Check whether character is dying (exists in DeathRollDeaths), add dying info if so
          const dyingRecord = await sequelize.models.deathrolldeaths.findOne({ where: { characterId: this.id } });
          if (dyingRecord) {
            const dyingInfo = (
              `### Death Info\n` +
              `**Date of Death:** ${dyingRecord.dateOfDeath}\n` +
              `**Cause of Death:** Age\n` +
              `**Played By:** <@${dyingRecord.playedById}>`
            );
            infoList.push(dyingInfo);
          }

          const parent1 = await this.getParent1();
          const parent2 = await this.getParent2();

          const parents = [];
          if (parent1) parents.push(`\`${parent1.name}\``);
          if (parent2) parents.push(`\`${parent2.name}\``);

          const relationships = await sequelize.models.relationships.findAll({
            where: { [Op.or]: [{ bearingCharacterId: this.id }, { conceivingCharacterId: this.id }] }
          })

          // Make a list of relationships with the names of the characters involved
          const relationshipList = [];
          for (const relationship of relationships) {
            const bearingCharacter = await relationship.getBearingCharacter();
            const conceivingCharacter = await relationship.getConceivingCharacter();
            relationshipList.push(`${bearingCharacter.name} & ${conceivingCharacter.name}`);
          }

          // Only add offspring info if they are not commoner
          if (this.socialClassName !== 'Commoner') {
            const offspringInfo = (
              `### Offspring Info\n` +
              `**Parents:** ${parents.length > 0 ? parents.join(', ') : `Unknown`}\n` +
              `**Rolling for Bastards:** ${this.isRollingForBastards ? `Yes` : `No`}\n` +
              `**Relationships:** ${relationshipList.length > 0 ? `\n- ${relationshipList.join('\n- ')}` : `None`}`
            )
            infoList.push(offspringInfo);
          }


          // Only add other info if steelbearer state is set
          if (this.steelbearerState !== 'None') {
            const otherInfo = (
              `### Other Info\n` +
              `**Steelbearer Type:** ${this.steelbearerState ? this.steelbearerState : `-`}`
            )
            infoList.push(otherInfo);
          }


          return infoList.join('\n');
        } // Show limited info for commoners
        else {
          return generalInfo;
        }
      },
      set(value) {
        throw new Error('Do not try to set the formattedInfo value!')
      }
    }
  });
}