const Sequelize = require('sequelize');
const { WANDERER_REGION_ID, WORLD_ID } = require('./constants.js');

// Create connection to database
const sequelize = new Sequelize('database', 'user', 'password', {
  host: 'localhost',
  dialect: 'sqlite',
  logging: false,
  // SQLite only
  storage: 'database.sqlite',
});

const Worlds = require('./models/Worlds.js')(sequelize, Sequelize.DataTypes);
require('./models/Houses.js')(sequelize, Sequelize.DataTypes);
require('./models/Recruitments.js')(sequelize, Sequelize.DataTypes);
const Regions = require('./models/Regions.js')(sequelize, Sequelize.DataTypes);
require('./models/Duchies.js')(sequelize, Sequelize.DataTypes);
require('./models/Vassals.js')(sequelize, Sequelize.DataTypes);
const SocialClasses = require('./models/SocialClasses.js')(sequelize, Sequelize.DataTypes);
require('./models/Characters.js')(sequelize, Sequelize.DataTypes);
require('./models/Players.js')(sequelize, Sequelize.DataTypes);
require('./models/Relationships.js')(sequelize, Sequelize.DataTypes);
require('./models/PlayableChildren.js')(sequelize, Sequelize.DataTypes);
require('./models/Deceased.js')(sequelize, Sequelize.DataTypes);
require('./models/DeathRollDeaths.js')(sequelize, Sequelize.DataTypes);
require('./models/Steelbearers.js')(sequelize, Sequelize.DataTypes);
require('./models/VassalSteelbearers.js')(sequelize, Sequelize.DataTypes);
require('./models/DeathPosts.js')(sequelize, Sequelize.DataTypes);
require('./models/DiscordChannels.js')(sequelize, Sequelize.DataTypes);
require('./models/DiscordRoles.js')(sequelize, Sequelize.DataTypes);
require('./models/LegitimisationRequests.js')(sequelize, Sequelize.DataTypes);
require('./models/OffspringChangeNameRequests.js')(sequelize, Sequelize.DataTypes);

const force = process.argv.includes('--force') || process.argv.includes('-f');

sequelize.sync({ force }).then(async () => {
  // Create the default world if it doesn't exist
  await Worlds.create({ id: WORLD_ID, name: 'World' });

  // Create the default region, Wanderer, which will be used for characters without a specified region
  await Regions.create({
    id: WANDERER_REGION_ID, // Hardcoded ID for the Wanderer region, which should never be deleted
    name: 'Wanderer',
    roleId: 0 // This is a placeholder value that can and should be changed using /change region once the bot is running.
  });

  // Create the default social classes
  await SocialClasses.create({ name: 'Commoner', roleId: 1 }); // The roleId is a placeholder value that can and should be changed using /change socialclass once the bot is running.
  await SocialClasses.create({ name: 'Notable', roleId: 2 }); // The roleId is a placeholder value that can and should be changed using /change socialclass once the bot is running.
  await SocialClasses.create({ name: 'Noble', roleId: 3 }); // The roleId is a placeholder value that can and should be changed using /change socialclass once the bot is running.
  await SocialClasses.create({ name: 'Ruler', roleId: 4 }); // The roleId is a placeholder value that can and should be changed using /change socialclass once the bot is running.

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