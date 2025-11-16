const Sequelize = require('sequelize');

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
const SocialClasses = require('./models/SocialClasses.js')(sequelize, Sequelize.DataTypes);
const Characters = require('./models/Characters.js')(sequelize, Sequelize.DataTypes);
const Players = require('./models/Players.js')(sequelize, Sequelize.DataTypes);
const Relationships = require('./models/Relationships.js')(sequelize, Sequelize.DataTypes);
const PlayableChildren = require('./models/PlayableChildren.js')(sequelize, Sequelize.DataTypes);
const Deceased = require('./models/Deceased.js')(sequelize, Sequelize.DataTypes);
const DeathRollDeaths = require('./models/DeathRollDeaths.js')(sequelize, Sequelize.DataTypes);

Regions.belongsTo(Houses, { foreignKey: 'rulingHouseId', as: 'rulingHouse' });
Regions.belongsTo(Recruitments, { foreignKey: 'recruitmentId', as: 'recruitment' });


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


module.exports = { Players, Characters, Houses, Recruitments, Regions, SocialClasses, Worlds, Relationships, PlayableChildren, Deceased, DeathRollDeaths };