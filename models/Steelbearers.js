module.exports = (sequelize, DataTypes) => {
  return sequelize.define('steelbearers', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4
    },
    characterId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    regionId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    logInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const character = await this.getCharacter();
        const region = await this.getRegion();

        let extraText = ''
        if (this.type === 'Duchy') {
          const duchy = await sequelize.models.duchies.findOne({ where: { steelbearerId: this.id } });
          extraText = `\nduchy: \`${duchy ? duchy.name : 'Unknown'}\` (\`${duchy ? duchy.id : 'Unknown'}\`)`;
        }
        else if (this.type === 'Vassal') {
          const vassalSteelbearer = await this.getVassalSteelbearer();
          if (!vassalSteelbearer) {
            extraText = `\nvassal: \`Unknown\``;
          }
          else {
            const vassal = await vassalSteelbearer.getVassal();
            const vassalRegion = await vassal.getVassalRegion();
            extraText = `\nvassal: \`${vassalRegion ? vassalRegion.name : 'Unknown'}\` (\`${vassalRegion ? vassalRegion.id : 'Unknown'}\`)`;
          }
        }
        else if (this.type === 'Liege') {
          const vassalSteelbearer = await this.getVassalSteelbearer();
          if (!vassalSteelbearer) {
            extraText = `\nliege: \`Unknown\``;
          }
          else {
            const vassal = await vassalSteelbearer.getVassal();
            if (!vassal) {
              extraText = `\nliege: \`Unknown\``;
            }
            else {
              const liegeRegion = await vassal.getLiegeRegion();
              extraText = `\nliege: \`${liegeRegion ? liegeRegion.name : 'Unknown'}\` (\`${liegeRegion ? liegeRegion.id : 'Unknown'}\`)`;
            }
          }
        }

        return (
          `id: \`${this.id}\`\n\n` +
          `character: \`${character.name}\` (\`${this.characterId}\`)\n` +
          `region: \`${region.name}\` (\`${this.regionId}\`)\n` +
          `type: \`${this.type}\`` +
          extraText
        );
      }
    },
    formattedInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const character = await this.getCharacter();
        const region = await this.getRegion();

        let extraText = '';
        if (this.type === 'Duchy') {
          const duchy = await sequelize.models.duchies.findOne({ where: { steelbearerId: this.id } });
          extraText = `\n**Duchy:** ${duchy ? duchy.name : 'Unknown'}`;
        }
        else if (this.type === 'Vassal') {
          const vassalSteelbearer = await this.getVassalSteelbearer();
          if (!vassalSteelbearer) {
            extraText = `\n**Vassal:** Unknown`;
          }
          else {
            const vassal = await vassalSteelbearer.getVassal();
            const vassalRegion = await vassal.getVassalRegion();
            extraText = `\n**Vassal:** ${vassalRegion ? vassalRegion.name : 'Unknown'}`;
          }
        }
        else if (this.type === 'Liege') {
          const vassalSteelbearer = await this.getVassalSteelbearer();
          if (!vassalSteelbearer) {
            extraText = `\n**Liege:** Unknown`;
          }
          else {
            const vassal = await vassalSteelbearer.getVassal();
            if (!vassal) {
              extraText = `\n**Liege:** Unknown`;
            }
            else {
              const liegeRegion = await vassal.getLiegeRegion();
              extraText = `\n**Liege:** ${liegeRegion ? liegeRegion.name : 'Unknown'}`;
            }
          }
        }

        return (
          `**Character:** ${character.name}\n` +
          `**Region:** ${region.name}\n` +
          `**Type:** ${this.type}` +
          extraText
        );
      },
      set(value) {
        throw new Error('Do not try to set the `formattedInfo` value!');
      }
    },
    fullType: {
      type: DataTypes.VIRTUAL,
      async get() {
        if (this.type === 'Duchy') {
          const duchy = await sequelize.models.duchies.findOne({ where: { steelbearerId: this.id } });
          return `Duchy | ${duchy ? duchy.name : 'Unknown'}`;
        }
        else if (this.type === 'Vassal') {
          const vassalSteelbearer = await this.getVassalSteelbearer();
          if (!vassalSteelbearer) {
            return 'Vassal | Unknown';
          }
          const vassal = await vassalSteelbearer.getVassal();
          const vassalRegion = await vassal.getVassalRegion();
          return `Vassal | ${vassalRegion.name}`;
        }
        else if (this.type === 'Liege') {
          const vassalSteelbearer = await this.getVassalSteelbearer();
          if (!vassalSteelbearer) {
            return 'Liege | Unknown';
          }
          const vassal = await vassalSteelbearer.getVassal();
          if (!vassal) {
            return 'Liege | Unknown';
          }
          else {
            const liegeRegion = await vassal.getLiegeRegion();
            return `Liege | ${liegeRegion.name}`;
          }
        }
        else {
          return this.type;
        }
      },
      set(value) {
        throw new Error('Do not try to set the `fullType` value!');
      }
    }
  });
}