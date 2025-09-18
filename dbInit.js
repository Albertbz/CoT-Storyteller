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
  await Worlds.create({ name: 'Elstrand', currentYear: 17 });

  await Affiliations.create({ roleId: roles.dayne, name: 'Dayne', emojiName: 'dayne', state: 'Almost Full', role1: 'Builders', role2: 'Miners', role3: 'Clockmakers' });
  await Affiliations.create({ roleId: roles.ayrin, name: 'Du Vēzos', emojiName: 'duvezos', state: 'Open', role1: 'Hunters', role2: 'Soldiers', role3: 'Carpenters' });
  await Affiliations.create({ roleId: roles.farring, name: 'Farring', emojiName: 'farring', state: 'Urgent', role1: 'Builders', role2: 'Miners', role3: 'Soldiers' });
  await Affiliations.create({ roleId: roles.locke, name: 'Locke', emojiName: 'locke', state: 'Almost Full', role1: 'Builders', role2: 'Lumberjacks', role3: 'Farmers' });
  await Affiliations.create({ roleId: roles.merrick, name: 'Merrick', emojiName: 'merrick', state: 'Open', role1: 'Lumberjacks', role2: 'Builders', role3: 'Soldiers' });
  await Affiliations.create({ roleId: roles.aetos, name: 'Stout', emojiName: 'stout', state: 'Urgent', role1: 'Tailors', role2: 'Miners', role3: 'Soldiers' });
  await Affiliations.create({ roleId: roles.wildhart, name: 'Wildhart', emojiName: 'wildhart', state: 'Open', role1: 'Builders', role2: 'Miners', role3: 'Farmers' });
  await Affiliations.create({ roleId: roles.wanderer, name: 'Wanderer' });

  await SocialClasses.create({ roleId: roles.commoner, name: 'Commoner' });
  await SocialClasses.create({ roleId: roles.notable, name: 'Notable' });
  await SocialClasses.create({ roleId: roles.noble, name: 'Noble' });
  await SocialClasses.create({ roleId: roles.ruler, name: 'Ruler' });

  console.log('Database synced.');
  sequelize.close();
}).catch(console.error);