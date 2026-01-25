const { Events, MessageFlags } = require('discord.js');
const { handleStringSelectMenuInteraction } = require('../helpers/stringSelectHelper.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
          } else {
            await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
          }
        }
        catch (error) {
          console.error(error);
          return null;
        }
      }
    }
    else if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      // Guard: only call autocomplete if the command exports it
      if (typeof command.autocomplete !== 'function') {
        // Nothing to do for this command's autocomplete
        return;
      }

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(error);
      }
    }
    else if (interaction.isStringSelectMenu()) {
      handleStringSelectMenuInteraction(interaction.customId, interaction);
    }
  },
};