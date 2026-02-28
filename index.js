// Require the necessary discord.js classes
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./configs/config.json');
const { syncSpreadsheetsToDatabase } = require('./spreadsheetSync.js');
const { updateRecruitmentPost } = require('./misc.js');
const cron = require('node-cron');

// Create a new client instance
global.client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent] });

/**
 * Load commands
 */
client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath).filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

/**
 * Load events
 */
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

/**
 * Load buttons
 */
// Create a new collection for buttons
client.buttons = new Collection();

// Read button files from the buttons directory
const buttonsPath = path.join(__dirname, 'buttons');
const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'));

// Loop through button files and set them in the collection
for (const file of buttonFiles) {
  const filePath = path.join(buttonsPath, file);
  const button = require(filePath);
  // Set a new item in the Collection with the key as the button customId and the value as the exported module
  if ('customId' in button && 'execute' in button) {
    client.buttons.set(button.customId, button);
  } else {
    console.log(`[WARNING] The button at ${filePath} is missing a required "customId" or "execute" property.`);
  }
}

/**
 * Load modals
 */
// Create a new collection for modals
client.modals = new Collection();

// Read modal files from the modals directory
const modalsPath = path.join(__dirname, 'modals');
const modalFiles = fs.readdirSync(modalsPath).filter(file => file.endsWith('.js'));

// Loop through modal files and set them in the collection
for (const file of modalFiles) {
  const filePath = path.join(modalsPath, file);
  const modal = require(filePath);
  // Set a new item in the Collection with the key as the modal customId and the value as the exported module
  if ('customId' in modal && 'execute' in modal) {
    client.modals.set(modal.customId, modal);
  } else {
    console.log(`[WARNING] The modal at ${filePath} is missing a required "customId" or "execute" property.`);
  }
}

/**
 * Load string select menus
 */
// Create a new collection for string select menus
client.stringSelectMenus = new Collection();

// Read string select menu files from the stringselectmenus directory
const stringSelectMenusPath = path.join(__dirname, 'stringselectmenus');
const stringSelectMenuFiles = fs.readdirSync(stringSelectMenusPath).filter(file => file.endsWith('.js'));

// Loop through string select menu files and set them in the collection
for (const file of stringSelectMenuFiles) {
  const filePath = path.join(stringSelectMenusPath, file);
  const stringSelectMenu = require(filePath);
  // Set a new item in the Collection with the key as the string select menu customId and the value as the exported module
  if ('customId' in stringSelectMenu && 'execute' in stringSelectMenu) {
    client.stringSelectMenus.set(stringSelectMenu.customId, stringSelectMenu);
  } else {
    console.log(`[WARNING] The string select menu at ${filePath} is missing a required "customId" or "execute" property.`);
  }
}

/**
 * Load user select menus
 */
// Create a new collection for user select menus
client.userSelectMenus = new Collection();

// Read user select menu files from the userselectmenus directory
const userSelectMenusPath = path.join(__dirname, 'userselectmenus');
const userSelectMenuFiles = fs.readdirSync(userSelectMenusPath).filter(file => file.endsWith('.js'));

// Loop through user select menu files and set them in the collection
for (const file of userSelectMenuFiles) {
  const filePath = path.join(userSelectMenusPath, file);
  const userSelectMenu = require(filePath);
  // Set a new item in the Collection with the key as the user select menu customId and the value as the exported module
  if ('customId' in userSelectMenu && 'execute' in userSelectMenu) {
    client.userSelectMenus.set(userSelectMenu.customId, userSelectMenu);
  } else {
    console.log(`[WARNING] The user select menu at ${filePath} is missing a required "customId" or "execute" property.`);
  }
}

/**
 * Daily update of recruitment post
 */
cron.schedule('0 0 * * *', async () => {
  console.log('Starting scheduled recruitment post update...');
  try {
    await updateRecruitmentPost();
    console.log('Recruitment post updated.');
  }
  catch (error) {
    console.error('Error during scheduled recruitment post update:', error.message);
  }
}, {
  scheduled: true,
  timezone: 'Etc/UTC'
});


/**
 * Hourly spreadsheet sync
 */
// Make function to check whether database was changed
const dbPath = './database.sqlite';
function getDatabaseLastModifiedTime() {
  const stats = fs.statSync(dbPath);
  return stats.mtime;
}

cron.schedule('0 * * * *', async () => {
  const lastModifiedTime = getDatabaseLastModifiedTime();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
  if (lastModifiedTime < oneHourAgo) {
    console.log('Database has not been modified in the last hour. Skipping spreadsheet sync.');
    return;
  }

  console.log('Starting scheduled spreadsheet sync...');
  try {
    await syncSpreadsheetsToDatabase();
    console.log('Scheduled spreadsheet sync complete.');
  }
  catch (error) {
    console.error('Error during scheduled spreadsheet sync:', error.message);
  }
}, {
  scheduled: true,
  timezone: 'Etc/UTC'
});

// Log in to Discord with the client's token
client.login(token);