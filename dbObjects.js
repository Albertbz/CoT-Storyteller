const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
  host: 'localhost',
  dialect: 'sqlite',
  logging: false,
  // SQLite only
  storage: 'database.sqlite',
});

const Affiliations = require('./models/Affiliations.js')(sequelize, Sequelize.DataTypes);
const SocialClasses = require('./models/SocialClasses.js')(sequelize, Sequelize.DataTypes);
const Players = require('./models/Players.js')(sequelize, Sequelize.DataTypes);
const Characters = require('./models/Characters.js')(sequelize, Sequelize.DataTypes);
const ActiveCharacters = require('./models/ActiveCharacters.js')(sequelize, Sequelize.DataTypes);

Characters.belongsTo(Affiliations, { foreignKey: 'affiliationId', as: 'affiliation' });
Characters.belongsTo(SocialClasses, { foreignKey: 'socialClassId', as: 'socialClass' });

ActiveCharacters.belongsTo(Players, { foreignKey: 'playerId', as: 'player' });
ActiveCharacters.belongsTo(Characters, { foreignKey: 'characterId', as: 'character' });

module.exports = { Players, Characters, ActiveCharacters, Affiliations, SocialClasses };