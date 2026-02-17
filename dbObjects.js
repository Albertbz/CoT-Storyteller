const Sequelize = require('sequelize');
const { guilds, roles } = require('./configs/ids.json');

const sequelize = new Sequelize('database', 'user', 'password', {
  host: 'localhost',
  dialect: 'sqlite',
  logging: false,
  // SQLite only
  storage: 'database.sqlite',
});

const Worlds = require('./models/Worlds.js')(sequelize, Sequelize.DataTypes);
const Houses = require('./models/Houses.js')(sequelize, Sequelize.DataTypes);
const Recruitments = require('./models/Recruitments.js')(sequelize, Sequelize.DataTypes);
const Regions = require('./models/Regions.js')(sequelize, Sequelize.DataTypes);
const Duchies = require('./models/Duchies.js')(sequelize, Sequelize.DataTypes);
const Vassals = require('./models/Vassals.js')(sequelize, Sequelize.DataTypes);
const Steelbearers = require('./models/Steelbearers.js')(sequelize, Sequelize.DataTypes);
const VassalSteelbearers = require('./models/VassalSteelbearers.js')(sequelize, Sequelize.DataTypes);
const SocialClasses = require('./models/SocialClasses.js')(sequelize, Sequelize.DataTypes);
const Characters = require('./models/Characters.js')(sequelize, Sequelize.DataTypes);
const Players = require('./models/Players.js')(sequelize, Sequelize.DataTypes);
const Relationships = require('./models/Relationships.js')(sequelize, Sequelize.DataTypes);
const PlayableChildren = require('./models/PlayableChildren.js')(sequelize, Sequelize.DataTypes);
const Deceased = require('./models/Deceased.js')(sequelize, Sequelize.DataTypes);
const DeathRollDeaths = require('./models/DeathRollDeaths.js')(sequelize, Sequelize.DataTypes);

Regions.belongsTo(Houses, { foreignKey: 'rulingHouseId', as: 'rulingHouse' });
Regions.belongsTo(Recruitments, { foreignKey: 'recruitmentId', as: 'recruitment' });
Regions.hasMany(Duchies, { foreignKey: 'regionId', as: 'duchies' });
Regions.hasMany(Steelbearers, { foreignKey: 'regionId', as: 'steelbearers' });
Regions.hasMany(Vassals, { foreignKey: 'liegeId', as: 'vassals' });
Regions.hasOne(Vassals, { foreignKey: 'vassalId', as: 'vassalRecord' });
Regions.hasMany(Characters, { foreignKey: 'regionId', as: 'characters' });

Duchies.belongsTo(Regions, { foreignKey: 'regionId', as: 'region' });
Duchies.belongsTo(Steelbearers, { foreignKey: 'steelbearerId', as: 'steelbearer' });

Vassals.belongsTo(Regions, { foreignKey: 'vassalId', as: 'vassalRegion' });
Vassals.belongsTo(Regions, { foreignKey: 'liegeId', as: 'liegeRegion' });
Vassals.hasMany(VassalSteelbearers, { foreignKey: 'vassalId', as: 'steelbearers' });

Steelbearers.belongsTo(Characters, { foreignKey: 'characterId', as: 'character' });
Steelbearers.belongsTo(Regions, { foreignKey: 'regionId', as: 'region' });
Steelbearers.hasOne(VassalSteelbearers, { foreignKey: 'steelbearerId', as: 'vassalSteelbearer' });

VassalSteelbearers.belongsTo(Vassals, { foreignKey: 'vassalId', as: 'vassal' });
VassalSteelbearers.belongsTo(Steelbearers, { foreignKey: 'steelbearerId', as: 'steelbearer' });


// Add hook to update roles when steelbearer is destroyed
Steelbearers.addHook('afterDestroy', async (steelbearer, options) => {
  const region = await sequelize.models.regions.findOne({ where: { id: steelbearer.regionId } });
  if (region) {
    const character = await steelbearer.getCharacter();
    if (character) {
      const player = await sequelize.models.players.findOne({ where: { characterId: character.id } });
      if (player) {
        const guild = await client.guilds.fetch(guilds.cot);
        if (guild) {
          try {
            const member = await guild.members.fetch(player.id);
            if (member) {
              await member.roles.remove(roles.steelbearer);
            }
          }
          catch {
            // Catch when member not part of guild anymore
          }
        }
      }
    }
  }

  // If duchy steelbearer, remove steelbearerId from duchy
  if (steelbearer.type === 'Duchy') {
    const duchy = await sequelize.models.duchies.findOne({ where: { steelbearerId: steelbearer.id } });
    if (duchy) {
      await duchy.update({ steelbearerId: null });
    }
  }

  // If vassal or liege steelbearer, remove entry from VassalSteelbearers
  if (steelbearer.type === 'Vassal' || steelbearer.type === 'Liege') {
    const vassalSteelbearer = await sequelize.models.vassalsteelbearers.findOne({ where: { steelbearerId: steelbearer.id } });
    if (vassalSteelbearer) {
      await vassalSteelbearer.destroy();
    }
  }
});

Characters.belongsTo(Regions, { foreignKey: 'regionId', as: 'region' });
Characters.belongsTo(Houses, { foreignKey: 'houseId', as: 'house' });
Characters.belongsTo(SocialClasses, { foreignKey: 'socialClassName', as: 'socialClass' });
Characters.belongsTo(Characters, { foreignKey: 'parent1Id', as: 'parent1' })
Characters.belongsTo(Characters, { foreignKey: 'parent2Id', as: 'parent2' })
Characters.hasMany(Relationships, { foreignKey: 'bearingCharacterId', as: 'relationshipsBearing' })
Characters.hasMany(Relationships, { foreignKey: 'conceivingCharacterId', as: 'relationshipsConceiving' })
Characters.hasOne(Players, { foreignKey: 'characterId', as: 'player' })

Relationships.belongsTo(Characters, { foreignKey: 'bearingCharacterId', as: 'bearingCharacter' })
Relationships.belongsTo(Characters, { foreignKey: 'conceivingCharacterId', as: 'conceivingCharacter' })

Deceased.belongsTo(Characters, { foreignKey: 'characterId', as: 'character' });
Deceased.belongsTo(Players, { foreignKey: 'playedById', as: 'playedBy' });

DeathRollDeaths.belongsTo(Characters, { foreignKey: 'characterId', as: 'character' });

PlayableChildren.belongsTo(Characters, { foreignKey: 'characterId', as: 'character' });

Players.belongsTo(Characters, { foreignKey: 'characterId', as: 'character' });


module.exports = { Players, Characters, Houses, Recruitments, Regions, Duchies, Vassals, Steelbearers, VassalSteelbearers, SocialClasses, Worlds, Relationships, PlayableChildren, Deceased, DeathRollDeaths };