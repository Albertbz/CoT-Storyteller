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
  await Worlds.create({ name: 'Elstrand', currentYear: 21 });

  await Affiliations.create({ roleId: roles.eshaeryn, name: 'Du Vēzos', emojiName: 'duvezos', isRuling: true, state: 'Open', role1: 'Farmers', role2: 'Miners', role3: 'Lumberjacks' });
  await Affiliations.create({ roleId: roles.firstLanding, name: 'Farring', emojiName: 'farring', isRuling: true, state: 'Open', role1: 'Soldiers', role2: 'Farmers', role3: 'Builders' });
  await Affiliations.create({ roleId: roles.theBarrowlands, name: 'Nightlocke', emojiName: 'nightlocke', isRuling: true, state: 'Open', role1: 'Builders', role2: 'Lumberjacks', role3: 'Farmers' });
  await Affiliations.create({ roleId: roles.riverhelm, name: 'Rivertal', emojiName: 'rivertal', isRuling: true, state: 'Open', role1: 'Builders', role2: 'Farmers', role3: 'Cooks' });
  await Affiliations.create({ roleId: roles.theHeartlands, name: 'Sabr', emojiName: 'sabr', isRuling: true, state: 'Open', role1: 'Tailors', role2: 'Builders', role3: 'Cooks' });
  await Affiliations.create({ roleId: roles.vernados, name: 'Stout', emojiName: 'stout', isRuling: true, state: 'Open', role1: 'Cooks', role2: 'Builders', role3: 'Soldiers' });
  await Affiliations.create({ roleId: roles.velkharaan, name: 'Wildhart', emojiName: 'wildhart', isRuling: true, state: 'Open', role1: 'Builders', role2: 'Carpenters', role3: 'Soldiers' });
  await Affiliations.create({ roleId: roles.wanderer, name: 'Wanderer' });

  await SocialClasses.create({ roleId: roles.commoner, name: 'Commoner' });
  await SocialClasses.create({ roleId: roles.notable, name: 'Notable' });
  await SocialClasses.create({ roleId: roles.noble, name: 'Noble' });
  await SocialClasses.create({ roleId: roles.ruler, name: 'Ruler' });

  console.log('Database synced.');
  await sequelize.close();
}).catch(async (err) => {
  console.error(err);
  try {
    await sequelize.close();
  } catch (closeErr) {
    console.error('Error closing sequelize after failure:', closeErr);
  }
  process.exit(1);
});