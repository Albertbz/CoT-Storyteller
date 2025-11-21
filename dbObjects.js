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

Duchies.belongsTo(Regions, { foreignKey: 'regionId', as: 'region' });
Duchies.belongsTo(Steelbearers, { foreignKey: 'steelbearerId', as: 'steelbearer' });

Vassals.belongsTo(Regions, { foreignKey: 'vassalId', as: 'vassalRegion' });
Vassals.belongsTo(Regions, { foreignKey: 'liegeId', as: 'liegeRegion' });

Steelbearers.belongsTo(Characters, { foreignKey: 'characterId', as: 'character' });
Steelbearers.belongsTo(Regions, { foreignKey: 'regionId', as: 'region' });

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
          const member = await guild.members.fetch(player.id);
          if (member) {
            console.log('Removing steelbearer from ' + member.user.username);
            // console.log(member.user.username + ' is losing the steelbearer role due to steelbearer deletion.');
            await member.roles.remove(roles.steelbearer);
          }
        }
      }
    }
  }
});

Characters.belongsTo(Regions, { foreignKey: 'regionId', as: 'region' });
Characters.belongsTo(Houses, { foreignKey: 'houseId', as: 'house' });
Characters.belongsTo(SocialClasses, { foreignKey: 'socialClassName', as: 'socialClass' });
Characters.belongsTo(Characters, { foreignKey: 'parent1Id', as: 'parent1' })
Characters.belongsTo(Characters, { foreignKey: 'parent2Id', as: 'parent2' })

Relationships.belongsTo(Characters, { foreignKey: 'bearingCharacterId', as: 'bearingCharacter' })
Relationships.belongsTo(Characters, { foreignKey: 'conceivingCharacterId', as: 'conceivingCharacter' })

Deceased.belongsTo(Characters, { foreignKey: 'characterId', as: 'character' });
Deceased.belongsTo(Players, { foreignKey: 'playedById', as: 'playedBy' });

DeathRollDeaths.belongsTo(Characters, { foreignKey: 'characterId', as: 'character' });

PlayableChildren.belongsTo(Characters, { foreignKey: 'characterId', as: 'character' });

Players.belongsTo(Characters, { foreignKey: 'characterId', as: 'character' });


module.exports = { Players, Characters, Houses, Recruitments, Regions, Duchies, Vassals, Steelbearers, SocialClasses, Worlds, Relationships, PlayableChildren, Deceased, DeathRollDeaths };