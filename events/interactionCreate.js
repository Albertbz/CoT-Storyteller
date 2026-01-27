const { Events, MessageFlags } = require('discord.js');

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
    else if (interaction.isButton()) {
      // Check whether a button handler exists for this customId
      const buttonHandler = interaction.client.buttons.get(interaction.customId);

      // If not, ignore button and return (this assumes that the button was
      // a temporary button, and not one of the permanent ones registered in buttons/)
      if (!buttonHandler) return;

      // Otherwise, handle the button interaction
      try {
        await buttonHandler.execute(interaction);
      }
      catch (error) {
        console.error(error);
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this interaction!', flags: MessageFlags.Ephemeral });
          } else {
            await interaction.reply({ content: 'There was an error while executing this interaction!', flags: MessageFlags.Ephemeral });
          }
        }
        catch (error) {
          console.error(error);
          return null;
        }
      }
    }
    else if (interaction.isModalSubmit()) {
      // Check whether a modal handler exists for this customId
      const modalHandler = interaction.client.modals.get(interaction.customId);

      // If not, ignore modal and return
      if (!modalHandler) return;

      // Otherwise, handle the modal interaction
      try {
        await modalHandler.execute(interaction);
      }
      catch (error) {
        console.error(error);
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this interaction!', flags: MessageFlags.Ephemeral });
          } else {
            await interaction.reply({ content: 'There was an error while executing this interaction!', flags: MessageFlags.Ephemeral });
          }
        }
        catch (error) {
          console.error(error);
          return null;
        }
      }
    }
  },
};