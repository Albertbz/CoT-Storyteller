const { TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ContainerBuilder, MessageFlags, StringSelectMenuOptionBuilder } = require("discord.js");
const { Players, Relationships, Characters } = require("../../dbObjects");
const { Op } = require("sequelize");
const { getIntercharacterRollManagerContainer } = require("../../helpers/containerCreator");

module.exports = {
  customId: 'character-intercharacter-rolls-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    /**
     * Create a container with the following parts:
     * - A text display component that explains what intercharacter rolls are
     * - Separator
     * - A text display component with the current intercharacter rolls that the character is rolling in (shorthand)
     * - A button to create a new intercharacter roll
     * - A button to edit existing intercharacter rolls (if any exist)
     * - A button to cancel and return to the character manager
     */

    // Get the character of the player
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();

    const container = await getIntercharacterRollManagerContainer(character);

    // Respond with the container
    await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}