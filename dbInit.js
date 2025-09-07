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

const Worlds = require('./models/Worlds.js')(sequelize, Sequelize.DataTypes);
const Affiliations = require('./models/Affiliations.js')(sequelize, Sequelize.DataTypes);
const SocialClasses = require('./models/SocialClasses.js')(sequelize, Sequelize.DataTypes);
require('./models/Characters.js')(sequelize, Sequelize.DataTypes);
require('./models/Players.js')(sequelize, Sequelize.DataTypes);

const force = process.argv.includes('--force') || process.argv.includes('-f');

sequelize.sync({ force }).then(async () => {
  await Worlds.create({ name: 'Elstrand', currentYear: 16 });

  await Affiliations.create({ roleId: roles.aetos, name: 'Aetos' });
  await Affiliations.create({ roleId: roles.ayrin, name: 'Ayrin' });
  await Affiliations.create({ roleId: roles.dayne, name: 'Dayne' });
  await Affiliations.create({ roleId: roles.farring, name: 'Farring' });
  await Affiliations.create({ roleId: roles.locke, name: 'Locke' });
  await Affiliations.create({ roleId: roles.merrick, name: 'Merrick' });
  await Affiliations.create({ roleId: roles.wildhart, name: 'Wildhart' });
  await Affiliations.create({ roleId: roles.wanderer, name: 'Wanderer' });

  await SocialClasses.create({ roleId: roles.commoner, name: 'Commoner' });
  await SocialClasses.create({ roleId: roles.notable, name: 'Notable' });
  await SocialClasses.create({ roleId: roles.noble, name: 'Noble' });
  await SocialClasses.create({ roleId: roles.ruler, name: 'Ruler' });

  console.log('Database synced.');
  sequelize.close();
}).catch(console.error);