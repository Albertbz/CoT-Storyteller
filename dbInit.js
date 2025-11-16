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
const Houses = require('./models/Houses.js')(sequelize, Sequelize.DataTypes);
const Recruitments = require('./models/Recruitments.js')(sequelize, Sequelize.DataTypes);
const Regions = require('./models/Regions.js')(sequelize, Sequelize.DataTypes);
const SocialClasses = require('./models/SocialClasses.js')(sequelize, Sequelize.DataTypes);
require('./models/Characters.js')(sequelize, Sequelize.DataTypes);
require('./models/Players.js')(sequelize, Sequelize.DataTypes);
require('./models/Relationships.js')(sequelize, Sequelize.DataTypes);
require('./models/PlayableChildren.js')(sequelize, Sequelize.DataTypes);
require('./models/Deceased.js')(sequelize, Sequelize.DataTypes);
require('./models/DeathRollDeaths.js')(sequelize, Sequelize.DataTypes);

const force = process.argv.includes('--force') || process.argv.includes('-f');

sequelize.sync({ force }).then(async () => {
  await Worlds.create({ name: 'Elstrand', currentYear: 22 });

  const ayrinHouse = await Houses.create({ name: 'Ayrin', emojiName: 'ayrin' });
  const farringHouse = await Houses.create({ name: 'Farring', emojiName: 'farring' });
  const nightlockeHouse = await Houses.create({ name: 'Nightlocke', emojiName: 'nightlocke' });
  const rivertalHouse = await Houses.create({ name: 'Rivertal', emojiName: 'rivertal' });
  const sabrHouse = await Houses.create({ name: 'Sabr', emojiName: 'sabr' });
  const stoutHouse = await Houses.create({ name: 'Stout', emojiName: 'stout' });
  const wildhartHouse = await Houses.create({ name: 'Wildhart', emojiName: 'wildhart' });

  const eshaerynRecruitment = await Recruitments.create({ state: 'Open', role1: 'Farmers', role2: 'Miners', role3: 'Lumberjacks' });
  const firstLandingRecruitment = await Recruitments.create({ state: 'Almost Full', role1: 'Soldiers', role2: 'Farmers', role3: 'Builders' });
  const barrowlandsRecruitment = await Recruitments.create({ state: 'Almost Full', role1: 'Builders', role2: 'Lumberjacks', role3: 'Farmers' });
  const rivertalRecruitment = await Recruitments.create({ state: 'Open', role1: 'Builders', role2: 'Farmers', role3: 'Cooks' });
  const heartlandsRecruitment = await Recruitments.create({ state: 'Urgent', role1: 'Builders', role2: 'Soldiers', role3: 'Miners' });
  const vernadosRecruitment = await Recruitments.create({ state: 'Almost Full', role1: 'Cooks', role2: 'Builders', role3: 'Soldiers' });
  const velkharaanRecruitment = await Recruitments.create({ state: 'Open', role1: 'Builders', role2: 'Carpenters', role3: 'Soldiers' });

  await Regions.create({ name: 'Eshaeryn', rulingHouseId: ayrinHouse.id, roleId: roles.eshaeryn, recruitmentId: eshaerynRecruitment.id });
  await Regions.create({ name: 'First Landing', rulingHouseId: farringHouse.id, roleId: roles.firstLanding, recruitmentId: firstLandingRecruitment.id });
  await Regions.create({ name: 'The Barrowlands', rulingHouseId: nightlockeHouse.id, roleId: roles.theBarrowlands, recruitmentId: barrowlandsRecruitment.id });
  await Regions.create({ name: 'Riverhelm', rulingHouseId: rivertalHouse.id, roleId: roles.riverhelm, recruitmentId: rivertalRecruitment.id });
  await Regions.create({ name: 'The Heartlands', rulingHouseId: sabrHouse.id, roleId: roles.theHeartlands, recruitmentId: heartlandsRecruitment.id });
  await Regions.create({ name: 'Vernados', rulingHouseId: stoutHouse.id, roleId: roles.vernados, recruitmentId: vernadosRecruitment.id });
  await Regions.create({ name: 'Velkharaan', rulingHouseId: wildhartHouse.id, roleId: roles.velkharaan, recruitmentId: velkharaanRecruitment.id });
  await Regions.create({ name: 'Wanderer', roleId: roles.wanderer });

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