const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
  host: 'localhost',
  dialect: 'sqlite',
  logging: false,
  // SQLite only
  storage: 'database.sqlite',
});

const Worlds = require('./models/Worlds.js')(sequelize, Sequelize.DataTypes);
const Affiliations = require('./models/Affiliations.js')(sequelize, Sequelize.DataTypes);
const SocialClasses = require('./models/SocialClasses.js')(sequelize, Sequelize.DataTypes);
const Characters = require('./models/Characters.js')(sequelize, Sequelize.DataTypes);
const Players = require('./models/Players.js')(sequelize, Sequelize.DataTypes);
const Relationships = require('./models/Relationships.js')(sequelize, Sequelize.DataTypes);
const Deceased = require('./models/Deceased.js')(sequelize, Sequelize.DataTypes);

Characters.belongsTo(Affiliations, { foreignKey: 'affiliationId', as: 'affiliation' });
Characters.belongsTo(SocialClasses, { foreignKey: 'socialClassName', as: 'socialClass' });
Characters.belongsTo(Characters, { foreignKey: 'parent1Id', as: 'parent1' })
Characters.belongsTo(Characters, { foreignKey: 'parent2Id', as: 'parent2' })

Relationships.belongsTo(Characters, { foreignKey: 'bearingCharacterId', as: 'bearingCharacter' })
Relationships.belongsTo(Characters, { foreignKey: 'conceivingCharacterId', as: 'conceivingCharacter' })

Deceased.belongsTo(Characters, { foreignKey: 'characterId', as: 'character' });
Deceased.belongsTo(Players, { foreignKey: 'playedById', as: 'playedBy' });

Players.belongsTo(Characters, { foreignKey: 'characterId', as: 'character' });


module.exports = { Players, Characters, Affiliations, SocialClasses, Worlds, Relationships, Deceased };