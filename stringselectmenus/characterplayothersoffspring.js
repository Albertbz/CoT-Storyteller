const { TextDisplayBuilder, ContainerBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SeparatorBuilder, Collector } = require("discord.js");
const { PlayableChildren, Characters } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { assignCharacterToPlayer } = require("../misc");

module.exports = {
  customId: 'character-play-others-offspring-select',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    /**
     * Get the selected offspring character and create confirmation message.
     */
    // Get the selected offspring ID from the select menu
    const selectedOffspringId = interaction.values[0];
    // Find the playable child record for the selected offspring ID
    const offspring = await PlayableChildren.findByPk(selectedOffspringId, {
      include: {
        model: Characters, as: 'character'
      }
    });
    const offspringInfo = await offspring.formattedInfo;

    // Ask for confirmation that the player wishes to request to play as the 
    // selected offspring character, showing character info in the confirmation
    // message, and informing the player that the request will be sent to the 
    // contact(s) of the offspring for approval
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Confirm Request to Play as Offspring\n` +
          `You are about to request to play as the offspring character **${offspring.character.name}** of another player, with the following details:\n\n` +
          offspringInfo
        )
      ],
      'character-manager-return-button',
      (interaction) => characterPlayOthersOffspringConfirm(interaction, offspring)
    )
  }
}

async function characterPlayOthersOffspringConfirm(interaction, offspring) {
  // Defer the update to allow time to process
  await interaction.deferUpdate();

  /**
   * Notify the player that the request is being sent to the contact(s) of the offspring for approval
   */
  const container = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# Sending Request to Contact(s)...\n` +
        `Your request to play as the offspring character **${offspring.character.name}** is being sent to their contact(s) for approval. This may take a few moments...`
      )
    );

  await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  /**
   * Send the request to the contact(s) of the offspring for approval
   */
  const contacts = []
  if (offspring.contact1Snowflake) {
    contacts.push(offspring.contact1Snowflake);
  }
  if (offspring.contact2Snowflake) {
    contacts.push(offspring.contact2Snowflake);
  }

  // Create request container
  const offspringInfo = await offspring.formattedInfo;

  function createRequestContainer(state = 'pending', includeButtons = true, user = null) {
    const stateText = {
      pending: `Do you approve or deny this player's request to play as your offspring character? You have 10 minutes to respond.`,
      approved: `This player's request to play as your offspring character has been approved by ${user ? user : 'an unknown user'}. The player has been notified and the character will be assigned to them shortly.`,
      denied: `This player's request to play as your offspring character has been denied by ${user ? user : 'an unknown user'}. The player has been notified of the denial.`,
      expired: `This request to play as your offspring character has expired due to no response within the 10 minute time limit.`,
      assignFailed: `**An error occurred while assigning the character to the player** after approval by ${user ? user : 'an unknown user'}. The player has been notified of the failure.`
    }

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Play as Offspring Request\n` +
          `Player ${interaction.user} has requested to play as your offspring character **${offspring.character.name}**.\n\n` +
          `${offspringInfo}\n`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          stateText[state]
        )
      )

    if (includeButtons) {
      container
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`approve-play-others-offspring`)
              .setLabel('Approve')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`deny-play-others-offspring`)
              .setLabel('Deny')
              .setStyle(ButtonStyle.Danger)
          )
        )
    }

    return container;
  }

  const requestContainer = createRequestContainer();


  const responses = [];
  for (const contactId of contacts) {
    try {
      const contactUser = await interaction.client.users.fetch(contactId);
      const response = await contactUser.send({ components: [requestContainer], flags: [MessageFlags.IsComponentsV2] });
      responses.push({ response: response, contactUser: contactUser });
    }
    catch (error) {
      console.error(`Error sending play as offspring request to contact with ID ${contactId}:`, error);
    }
  }

  // If no responses were sent successfully, inform the player and return
  if (responses.length === 0) {
    const noResponseContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# No Contacts Available\n` +
          `Your request to play as the offspring character **${offspring.character.name}** could not be sent because none of their contacts could be reached. Please try again later or contact the contacts to let them know.`
        )
      )

    return interaction.editReply({ components: [noResponseContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
  // Otherwise, edit the original interaction to inform the player that the request has been sent to the contact(s) of the offspring for approval, and that they are awaiting a response
  else {
    const sentContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Request Sent\n` +
          `Your request to play as the offspring character **${offspring.character.name}** has been sent to their contact(s) for approval. Please wait for a response. You will be notified once a response is received.`
        )
      );

    await interaction.editReply({ components: [sentContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  /**
   * Create a collector for each contact to handle the responses from the contact(s) of the 
   * offspring character, and update the original interaction with the result 
   * once a response is received. If multiple contacts exist, the first response 
   * received will be used as the result.
   * - If approved, assign the character to the player and update the original interaction to notify the player of approval and character assignment in progress.
   * - If denied, update the original interaction to notify the player of denial.
   */
  const responsesWithCollectors = [];
  for (const { response: response, contactUser: contactUser } of responses) {
    const collector = response.createMessageComponentCollector({
      time: 10 * 60 * 1000, // 10 minutes
      filter: (i) =>
        i.message.id === response.id &&
        i.user.id === contactUser.id &&
        (i.customId === 'approve-play-others-offspring' || i.customId === 'deny-play-others-offspring')
    })

    responsesWithCollectors.push({ response, contactUser, collector });
  }

  const handleInteraction = async (i) => {
    i.deferUpdate();

    let state = '';

    if (i.customId === 'approve-play-others-offspring') {

      // Assign the character to the player
      const { success, embed: assignedEmbed } = await assignCharacterToPlayer(offspring.character.id, interaction.user.id, i.user);
      if (!success) {
        const assignFailedContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# Assignment Failed\n` +
              `${interaction.user}, an error occurred while assigning ${offspring.character.name} to you after approval. The contacts have been notified of the failure.`
            )
          )

        await interaction.deleteReply();
        await interaction.followUp({ components: [assignFailedContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

        state = 'assignFailed';
      }
      else {
        // Update original interaction to notify player of approval and character assignment in progress
        const approvedContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# Request Approved\n` +
              `${interaction.user}, your request to play as the offspring character **${offspring.character.name}** has been approved by their contact(s). The character has been assigned to you.`
            )
          )

        await interaction.deleteReply();
        await interaction.followUp({ components: [approvedContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

        state = 'approved';
      }
    }
    else if (i.customId === 'deny-play-others-offspring') {
      // Update original interaction to notify player of denial
      const deniedContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Request Denied\n` +
            `${interaction.user}, your request to play as the offspring character **${offspring.character.name}** has been denied by their contact(s). You can try again later or contact the contacts.`
          )
        )

      await interaction.deleteReply();
      await interaction.followUp({ components: [deniedContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

      state = 'denied';
    }

    // Stop all collectors since a response has been received and we have the information we need to proceed with either approval or denial flow
    for (const { response, collector } of responsesWithCollectors) {
      const newRequestContainer = createRequestContainer(state, false, i.user);
      await response.edit({ components: [newRequestContainer], flags: [MessageFlags.IsComponentsV2] });
      if (!collector.ended) collector.stop('resolved');
    }
  }



  const handleEnd = async (_collected, reason) => {
    if (reason !== 'resolved') {
      // Update original interaction to notify player that the request has expired due to no response from the contact(s)
      const expiredContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Request Expired\n` +
            `${interaction.user}, your request to play as the offspring character **${offspring.character.name}** has expired due to no response from their contact(s). Please try again later.`
          )
        )

      try {
        await interaction.deleteReply();
        await interaction.followUp({ components: [expiredContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
      }
      catch (error) {
        if (error.code !== 10008) {
          console.log(`Error updating interaction for expired play as offspring request for player ${interaction.user.tag}:`, error);
        }
      }

      // Edit all request messages sent to contacts to indicate that the request has expired
      const expiredRequestContainer = createRequestContainer('expired', false);

      for (const { response, collector } of responsesWithCollectors) {
        if (!collector.ended) {
          collector.stop('resolved')
        }
        await response.edit({ components: [expiredRequestContainer], flags: [MessageFlags.IsComponentsV2] });
      }
    }
  }

  for (const { collector } of responsesWithCollectors) {
    collector.on('collect', handleInteraction);
    collector.on('end', handleEnd);
  }
}