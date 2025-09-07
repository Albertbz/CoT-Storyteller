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

Characters.belongsTo(Affiliations, { foreignKey: 'affiliationName', as: 'affiliation' });
Characters.belongsTo(SocialClasses, { foreignKey: 'socialClassName', as: 'socialClass' });

Players.belongsTo(Characters, { foreignKey: 'characterId', as: 'character' });


module.exports = { Players, Characters, Affiliations, SocialClasses, Worlds };