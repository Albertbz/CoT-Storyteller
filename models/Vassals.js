module.exports = (sequelize, DataTypes) => {
  return sequelize.define('vassals', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      defaultValue: DataTypes.UUIDV4
    },
    vassalId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    liegeId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    logInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const vassal = await this.getVassalRegion();
        const liege = await this.getLiegeRegion();

        return (
          `id: \`${this.id}\`\n` +
          `\n` +
          `vassal: \`${vassal.name}\` (\`${vassal.id}\`)\n` +
          `liege: \`${liege.name}\` (\`${liege.id}\`)`
        );
      },
      set(value) {
        throw new Error('Do not try to set the logInfo value!')
      }
    },
    formattedInfo: {
      type: DataTypes.VIRTUAL,
      async get() {
        const vassal = await this.getVassalRegion();
        const liege = await this.getLiegeRegion();

        return (
          `**Vassal:** ${vassal.name}\n` +
          `**Liege:** ${liege.name}`);
      },
      set(value) {
        throw new Error('Do not try to set the formattedInfo value!')
      }
    }
  }, {
    hooks: {
      beforeDestroy: async (instance, options) => {
        // Check if any vassalsteelbearers with this vassal exist and throw an
        // error if any do to prevent orphaned steelbearers
        const vassalSteelbearers = await sequelize.models.vassalsteelbearers.findAll({ where: { vassalId: instance.id } });
        if (vassalSteelbearers.length > 0) {
          const error = new Error('Cannot delete vassal with existing vassal/liege steelbearers');
          error.code = 'VassalSteelbearersExist';
          throw error;
        }
      }
    }
  }
  );
}