module.exports = (sequelize, DataTypes) => {
  return sequelize.define('regions', {
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
    rulingHouseId: {
      type: DataTypes.UUID
    },
    roleId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    recruitmentId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    formattedInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const rulingHouse = await this.getRulingHouse();
        const recruitment = await this.getRecruitment();

        // Get duchies
        const duchies = await this.getDuchies();
        const duchyNames = duchies.map(duchy => duchy.name).join(', ') || 'None';

        // Get liege region if applicable is a vassal
        const vassalRecord = await sequelize.models.vassals.findOne({ where: { vassalId: this.id } });
        const liegeRegion = vassalRecord ? await sequelize.models.regions.findOne({ where: { id: vassalRecord.liegeId } }) : null;

        // Get any vassal regions where this region is the liege
        const vassalRecords = await sequelize.models.vassals.findAll({ where: { liegeId: this.id } });
        const vassalRegions = [];
        for (const vassalRecord of vassalRecords) {
          const vassalRegion = await sequelize.models.regions.findOne({ where: { id: vassalRecord.vassalId } });
          if (vassalRegion) {
            vassalRegions.push(vassalRegion.name);
          }
        }
        const vassalRegionNames = vassalRegions.join(', ') || 'None';

        // Get all steelbearers in this region to list their names and type
        // For all duchy steelbearers, additionally add the duchy name in parentheses
        const steelbearers = await this.getSteelbearers();
        const steelbearerInfoList = [];
        for (const steelbearer of steelbearers) {
          // Get name and type
          const character = await steelbearer.getCharacter();
          let steelbearerInfo = `${character.name}: ${await steelbearer.fullType}`;
          // Check if steelbearer is associated with a duchy
          // const duchy = await sequelize.models.duchies.findOne({ where: { steelbearerId: steelbearer.id } });
          // if (duchy) {
          //   steelbearerInfo += ` (${duchy.name})`;
          // }
          steelbearerInfoList.push(steelbearerInfo);
        }
        const steelbearerInfo = steelbearerInfoList.length > 0 ? '\n- ' + steelbearerInfoList.join('\n- ') : 'None';

        return (
          `**Name:** ${this.name}\n` +
          `**Ruling House:** ${rulingHouse ? rulingHouse.name : 'None'}\n` +
          // `**Role ID:** ${this.roleId}\n` +
          `**Duchies:** ${duchyNames}\n` +
          `**Liege Region:** ${liegeRegion ? liegeRegion.name : 'None'}\n` +
          `**Vassal Regions:** ${vassalRegionNames}\n\n` +
          `**Steelbearers:** ${steelbearerInfo}\n\n` +
          `**-- Recruitment Info --**\n` +
          (recruitment ? await recruitment.formattedInfo : 'No recruitment information available.')
        );
      },
      set(value) {
        throw new Error('Do not try to set the `formattedInfo` value!');
      }
    }
  });
}