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
require('./models/Relationships.js')(sequelize, Sequelize.DataTypes);
require('./models/PlayableChildren.js')(sequelize, Sequelize.DataTypes);
require('./models/Deceased.js')(sequelize, Sequelize.DataTypes);

const force = process.argv.includes('--force') || process.argv.includes('-f');

sequelize.sync({ force }).then(async () => {
  await Worlds.create({ name: 'Elstrand', currentYear: 17 });

  await Affiliations.create({ roleId: roles.dayne, name: 'Dayne', emojiName: 'dayne', isRuling: true, state: 'Almost Full', role1: 'Builders', role2: 'Miners', role3: 'Clockmakers' });
  await Affiliations.create({ roleId: roles.ayrin, name: 'Du Vēzos', emojiName: 'duvezos', isRuling: true, state: 'Open', role1: 'Hunters', role2: 'Farmers', role3: 'Cooks' });
  await Affiliations.create({ roleId: roles.farring, name: 'Farring', emojiName: 'farring', isRuling: true, state: 'Urgent', role1: 'Soldiers', role2: 'Farmers', role3: 'Builders' });
  await Affiliations.create({ roleId: roles.locke, name: 'Locke', emojiName: 'locke', isRuling: true, state: 'Almost Full', role1: 'Builders', role2: 'Lumberjacks', role3: 'Farmers' });
  await Affiliations.create({ roleId: roles.merrick, name: 'Merrick', emojiName: 'merrick', isRuling: true, state: 'Open', role1: 'Lumberjacks', role2: 'Builders', role3: 'Soldiers' });
  await Affiliations.create({ roleId: roles.aetos, name: 'Stout', emojiName: 'stout', isRuling: true, state: 'Urgent', role1: 'Cooks', role2: 'Farmers', role3: 'Soldiers' });
  await Affiliations.create({ roleId: roles.wildhart, name: 'Wildhart', emojiName: 'wildhart', isRuling: true, state: 'Open', role1: 'Builders', role2: 'Miners', role3: 'Farmers' });
  await Affiliations.create({ roleId: roles.wanderer, name: 'Wanderer' });

  await SocialClasses.create({ roleId: roles.commoner, name: 'Commoner' });
  await SocialClasses.create({ roleId: roles.notable, name: 'Notable' });
  await SocialClasses.create({ roleId: roles.noble, name: 'Noble' });
  await SocialClasses.create({ roleId: roles.ruler, name: 'Ruler' });

  console.log('Database synced.');
  sequelize.close();
}).catch(console.error);