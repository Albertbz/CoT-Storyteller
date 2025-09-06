const Sequelize = require('sequelize');
const { roles } = require('./configs/ids.json');

// Create connection to database
const sequelize = new Sequelize('database', 'user', 'password', {
  host: 'localhost',
  dialect: 'sqlite',
  logging: false,
  // SQLite only
  storage: 'database.sqlite',
});

const Affiliations = require('./models/Affiliations.js')(sequelize, Sequelize.DataTypes);
const SocialClasses = require('./models/SocialClasses.js')(sequelize, Sequelize.DataTypes);
require('./models/Characters.js')(sequelize, Sequelize.DataTypes);
require('./models/Players.js')(sequelize, Sequelize.DataTypes);

const force = process.argv.includes('--force') || process.argv.includes('-f');

sequelize.sync({ force }).then(async () => {
  await Affiliations.create({ id: roles.aetos, name: 'Aetos' });
  await Affiliations.create({ id: roles.ayrin, name: 'Ayrin' });
  await Affiliations.create({ id: roles.dayne, name: 'Dayne' });
  await Affiliations.create({ id: roles.farring, name: 'Farring' });
  await Affiliations.create({ id: roles.merrick, name: 'Merrick' });
  await Affiliations.create({ id: roles.locke, name: 'Locke' });
  await Affiliations.create({ id: roles.wildhart, name: 'Wildhart' });
  await Affiliations.create({ id: roles.wanderer, name: 'Wanderer' });

  await SocialClasses.create({ id: roles.commoner, name: 'Commoner' });
  await SocialClasses.create({ id: roles.notable, name: 'Notable' });
  await SocialClasses.create({ id: roles.noble, name: 'Noble' });
  await SocialClasses.create({ id: roles.ruler, name: 'Ruler' });

  console.log('Database synced.');
  sequelize.close();
}).catch(console.error);