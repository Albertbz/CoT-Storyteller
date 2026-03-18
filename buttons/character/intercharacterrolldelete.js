const { ContainerBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder, MessageFlags } = require("discord.js");
const { Players, Relationships, Characters } = require("../../dbObjects");
const { Op } = require("sequelize");

module.exports = {
  customId: 'intercharacter-roll-delete-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    /**
     * Create a container with a text display explaining that the user is about
     * to delete an intercharacter roll, as well as a select menu to select
     * which intercharacter roll to delete. Also add a cancel button
     */
    const container = new ContainerBuilder();

    // Create the text display component and add it to the container
    container.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        "# Delete Intercharacter Roll\n" +
        "You are about to delete an intercharacter roll. Please select the intercharacter roll that you would like to delete from the select menu below, and then confirm your choice."
      )
    );

    // Create the select menu to select which intercharacter roll to delete
    // Get the character of the player
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();

    // Get the intercharacter rolls (relationships) that the character is rolling in
    const intercharacterRolls = await Relationships.findAll({
      where: {
        [Op.or]: [
          { bearingCharacterId: character.id },
          { conceivingCharacterId: character.id }
        ]
      },
      include: [
        { model: Characters, as: 'bearingCharacter' },
        { model: Characters, as: 'conceivingCharacter' }
      ]
    });

    // Add the select menu to the container
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('intercharacter-roll-delete-select')
      .setPlaceholder('Select an intercharacter roll to delete')
      .addOptions(
        intercharacterRolls.map((roll) => {
          const otherCharacter = roll.bearingCharacter.id === character.id ? roll.conceivingCharacter : roll.bearingCharacter;
          const option = new StringSelectMenuOptionBuilder()
            .setLabel(`Roll with ${otherCharacter.name}`)
            .setValue(roll.id)
            .setDescription(
              `Bearing: ${roll.bearingCharacter.name} | ${roll.isCommitted ? `Committed` : `Not Committed`} | ${roll.inheritedTitle !== 'None' ? `Inherited Title: ${roll.inheritedTitle}` : `No Inherited Title`}`
            )

          return option;
        })
      );

    const selectMenuActionRow = new ActionRowBuilder()
      .addComponents(selectMenu);

    container.addActionRowComponents(selectMenuActionRow);

    // Add a cancel button to the container
    const cancelButton = new ButtonBuilder()
      .setCustomId('character-manager-return-button')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger);

    const cancelButtonActionRow = new ActionRowBuilder()
      .addComponents(cancelButton);

    container.addActionRowComponents(cancelButtonActionRow);

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}