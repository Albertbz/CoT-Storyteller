const Sequelize = require('sequelize');

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
require('./models/Regions.js')(sequelize, Sequelize.DataTypes);
require('./models/Duchies.js')(sequelize, Sequelize.DataTypes);
require('./models/Vassals.js')(sequelize, Sequelize.DataTypes);
require('./models/SocialClasses.js')(sequelize, Sequelize.DataTypes);
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

const force = process.argv.includes('--force') || process.argv.includes('-f');

sequelize.sync({ force }).then(async () => {
  await Worlds.create({ name: 'Elstrand', currentYear: 25 });

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