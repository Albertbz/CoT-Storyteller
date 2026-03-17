const { Events } = require('discord.js');
const { initializeDeathPosts } = require('../helpers/deathPostScheduler.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    await initializeDeathPosts();
  },
};