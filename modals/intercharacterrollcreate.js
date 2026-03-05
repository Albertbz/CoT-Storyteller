const { MessageFlags, ContainerBuilder, ButtonStyle, ButtonBuilder, userMention } = require("discord.js");
const { askForConfirmation } = require("../helpers/confirmations");
const { Characters } = require("../dbObjects");
const { addRelationshipToDatabase } = require("../misc");
const { intercharacterRollCreateModal } = require("../helpers/modalCreator");

async function intercharacterRollCreateConfirm(interaction, bearingCharacter, conceivingCharacter, committed, inheritedTitle) {
  // Defer reply to allow time to process
  await interaction.deferUpdate();

  /**
   * Imform the user that a message is being sent to the other player for
   * confirmation and that we are waiting for their response
   */
  const container = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# Intercharacter Roll Creation\n` +
        `A request for an intercharacter roll is being sent to the other player. They have 10 minutes to respond. Waiting for their response...`
      )
    );

  await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  /**
   * Ask the other player for confirmation of the intercharacter roll creation
   */
  // Get the player associated with the character not associated with the user who initiated the intercharacter roll creation
  const bearingCharacterPlayer = await bearingCharacter.getPlayer();
  const conceivingCharacterPlayer = await conceivingCharacter.getPlayer();
  const otherPlayer = bearingCharacterPlayer.id === interaction.user.id ? conceivingCharacterPlayer : bearingCharacterPlayer;

  // Create the message to be sent to the other player for confirmation
  // This message should include the details of the intercharacter roll and ask 
  // the other player to confirm or deny the creation of the intercharacter roll 
  // with buttons for each option
  const otherUserContainer = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# Intercharacter Roll Creation Request\n` +
        `Player **${interaction.user}** has requested to create an intercharacter roll with your character.\n\n` +
        `**Bearing Character:** ${bearingCharacter.name}\n` +
        `**Conceiving Character:** ${conceivingCharacter.name}\n` +
        `**Married:** ${committed ? 'Yes' : 'No'}\n` +
        `**Inherited Title:** ${inheritedTitle ? 'Nobility' : 'None'}`
      )
    )
    .addSeparatorComponents((separator) => separator)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `Do you confirm the creation of this intercharacter roll? You have 10 minutes to respond.`
      )
    )
    .addActionRowComponents((actionRow) =>
      actionRow
        .addComponents(
          new ButtonBuilder()
            .setCustomId('confirm-intercharacter-roll-create')
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('deny-intercharacter-roll-create')
            .setLabel('Deny')
            .setStyle(ButtonStyle.Danger)
        )
    );

  // Send the confirmation message to the other player's DMs
  // const otherUser = await interaction.client.users.fetch(otherPlayer.id);
  const otherUser = await interaction.client.users.fetch('249586641402986497'); // TEMPORARY - FETCH ALBERT FOR TESTING
  let response = null;
  try {
    response = await otherUser.send({
      components: [otherUserContainer],
      flags: [MessageFlags.IsComponentsV2]
    });
  }
  catch (error) {
    console.error('Error sending DM to other player for intercharacter roll confirmation:', error);
    // If there was an error sending the DM (e.g. because the other player has DMs disabled), inform the user who initiated the intercharacter roll creation and return
    await interaction.followUp({ content: 'There was an error sending a DM to the other player for confirmation. This may be because they have DMs disabled. Please ask them to enable DMs and try again.', flags: [MessageFlags.Ephemeral] });
    return;
  }

  /**
   * Create a collector to wait for the other player's response to the confirmation message
   * If the other player confirms, create the intercharacter roll and inform both players of the successful creation
   * If the other player denies, inform the user who initiated the intercharacter roll creation that their request was denied
   * If the other player does not respond within 10 minutes, inform the user who initiated the intercharacter roll creation that their request timed out
   */
  const collector = response.createMessageComponentCollector({
    filter: (i) => i.user.id === otherUser.id,
    time: 10 * 60 * 1000 // 10 minutes
  });

  collector.on('collect', async (i) => {
    if (i.customId === 'confirm-intercharacter-roll-create') {
      // Defer update to allow time to process the confirmation
      await i.deferUpdate();

      // Create the intercharacter roll in the database
      await addRelationshipToDatabase(interaction.user, {
        bearingCharacterId: bearingCharacter.id,
        conceivingCharacterId: conceivingCharacter.id,
        isCommitted: committed,
        inheritedTitle: inheritedTitle ? 'Noble' : 'None'
      });

      // Inform both players of the successful creation by editing the original
      // confirmation message sent to the other player and removing the ephemeral
      // message sent to the user who initiated the intercharacter roll creation
      // and sending a new one
      const userContainer = new ContainerBuilder()
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `# Intercharacter Roll Created\n` +
            `${interaction.user}, the other player has confirmed the creation of the intercharacter roll.\n` +
            `You can continue to manage your character and their intercharacter rolls using the Character Manager GUI above.`
          )
        )
      await interaction.deleteReply();
      await interaction.followUp({ components: [userContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

      // Reuse otherUserContainer to inform the other player of the successful 
      // creation by editing the original confirmation message sent to them
      otherUserContainer.spliceComponents(-2, 2); // Remove the action row with the buttons and the text asking for confirmation
      otherUserContainer.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `You have confirmed the creation of the intercharacter roll with player **${interaction.user}**. The intercharacter roll has been successfully created.`
        )
      );
      await response.edit({ components: [otherUserContainer], flags: [MessageFlags.IsComponentsV2] });

      // Stop the collector since the other player has responded
      collector.stop();
    }
    else if (i.customId === 'deny-intercharacter-roll-create') {
      // Inform the user who initiated the intercharacter roll creation that their request was denied by editing the original ephemeral message sent to them
      // and edit the confirmation message sent to the other player to indicate that they denied the request
      const userContainer = new ContainerBuilder()
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `# Intercharacter Roll Creation Denied\n` +
            `${interaction.user}, the other player has denied the creation of the intercharacter roll.\n` +
            `You can try again or manage your character using the Character Manager GUI above.`
          )
        )
      await interaction.deleteReply();
      await interaction.followUp({ components: [userContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

      // Reuse otherUserContainer to inform the other player that they denied the request by editing the original confirmation message sent to them
      otherUserContainer.spliceComponents(-2, 2); // Remove the action row with the buttons and the text asking for confirmation
      otherUserContainer.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `You have denied the creation of the intercharacter roll with player **${interaction.user}**. The intercharacter roll has not been created.`
        )
      );
      await response.edit({ components: [otherUserContainer], flags: [MessageFlags.IsComponentsV2] });

      // Stop the collector since the other player has responded
      collector.stop();
    }
  });

  collector.on('end', async (collected, reason) => {
    if (reason === 'time') {
      // Inform the user who initiated the intercharacter roll creation that their request timed out by editing the original ephemeral message sent to them
      // and edit the confirmation message sent to the other player to indicate that the request timed out
      const userContainer = new ContainerBuilder()
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `# Intercharacter Roll Creation Timed Out\n` +
            `${interaction.user}, the other player did not respond to the intercharacter roll creation request within 10 minutes. The request has timed out.\n` +
            `You can try again or manage your character using the Character Manager GUI above.`
          )
        )
      await interaction.deleteReply();
      await interaction.followUp({ components: [userContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

      // Reuse otherUserContainer to inform the other player that the request timed out by editing the original confirmation message sent to them
      otherUserContainer.spliceComponents(-2, 2); // Remove the action row with the buttons and the text asking for confirmation
      otherUserContainer.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `The intercharacter roll creation request from player **${interaction.user}** has timed out because you did not respond within 10 minutes. The request has expired.`
        )
      );
      await response.edit({ components: [otherUserContainer], flags: [MessageFlags.IsComponentsV2] });
    }
  });
}

async function intercharacterRollCreateEdit(interaction, bearingCharacter, conceivingCharacter, committed, inheritedTitle) {
  const modal = await intercharacterRollCreateModal(bearingCharacter, conceivingCharacter, { bearingCharacterPrev: bearingCharacter, committed: committed, inheritedTitle: inheritedTitle });

  return interaction.showModal(modal);
}

module.exports = {
  customId: 'intercharacter-roll-create-modal',
  async execute(interaction) {
    // Defer reply to allow time to process
    await interaction.deferUpdate();

    /**
     * Extract modal inputs first prior to confirmation
     */
    const bearingValue = interaction.fields.getStringSelectValues('intercharacter-roll-bearing-select')[0];
    const committedValue = interaction.fields.getStringSelectValues('intercharacter-roll-committed-select')[0];
    const conditionalSelectMenu = interaction.fields.fields.get('intercharacter-roll-inherit-titles-select');
    const inheritedTitleValue = conditionalSelectMenu ? interaction.fields.getStringSelectValues('intercharacter-roll-inherit-titles-select')[0] : null;

    // Convert to values that can be used
    const [bearingCharacterId, conceivingCharacterId] = bearingValue.split(':');
    const bearingCharacter = await Characters.findByPk(bearingCharacterId);
    const conceivingCharacter = await Characters.findByPk(conceivingCharacterId);
    const committed = committedValue === 'true' ? true : false;
    const inheritedTitle = inheritedTitleValue === 'true' ? (committed ? true : false) : false;

    /**
     * Ask for confirmation of intercharacter roll creation with the selected options
     */
    return askForConfirmation(
      interaction,
      `Confirm Intercharacter Roll Creation`,
      `Please confirm that you want to create an intercharacter roll with the following details:\n\n` +
      `**Bearing Character:** ${bearingCharacter.name}\n` +
      `**Conceiving Character:** ${conceivingCharacter.name}\n` +
      `**Married:** ${committed ? 'Yes' : 'No'}\n` +
      `**Inherited Title:** ${inheritedTitle ? 'Nobility' : 'None'}`,
      (interaction) => intercharacterRollCreateConfirm(interaction, bearingCharacter, conceivingCharacter, committed, inheritedTitle),
      (interaction) => intercharacterRollCreateEdit(interaction, bearingCharacter, conceivingCharacter, committed, inheritedTitle)
    )
  }
}