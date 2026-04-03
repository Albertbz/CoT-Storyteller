const { Relationships, Characters, Players } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { getIntercharacterRollManagerContainer, getCharacterManagerContainer } = require("../helpers/containerCreator");
const { showMessageThenReturnToContainer } = require("../helpers/messageSender");
const { changeRelationshipInDatabase } = require("../misc");
const { MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");

module.exports = {
  customId: 'intercharacter-roll-edit-modal',
  async execute(interaction) {
    // Defer reply to allow time to process
    await interaction.deferUpdate();

    // Get the values from the modal submission
    const bearingValue = interaction.fields.getStringSelectValues('intercharacter-roll-bearing-select')[0];
    const committedValue = interaction.fields.getStringSelectValues('intercharacter-roll-committed-select')[0];
    const conditionalSelectMenu = interaction.fields.fields.get('intercharacter-roll-inherit-titles-select');
    const inheritedTitleValue = conditionalSelectMenu ? interaction.fields.getStringSelectValues('intercharacter-roll-inherit-titles-select')[0] : null;

    // Convert to values that can be used
    const [bearingCharacterId, conceivingCharacterId] = bearingValue.split(':');
    const bearingCharacter = await Characters.findByPk(bearingCharacterId);
    const conceivingCharacter = await Characters.findByPk(conceivingCharacterId);
    const committed = committedValue === 'true' ? true : false;
    const inheritedTitle = inheritedTitleValue === 'true' ? (committed ? 'Nobility' : 'None') : 'None';

    // Get the intercharacter roll id from the custom id of the modal
    const rollId = interaction.customId.split(':')[1];

    // Get the intercharacter roll from the database
    const roll = await Relationships.findByPk(rollId, {
      include: [
        { model: Characters, as: 'bearingCharacter' },
        { model: Characters, as: 'conceivingCharacter' }
      ]
    });

    if (!roll) {
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Intercharacter Roll Not Found\n` +
            `The intercharacter roll you are trying to edit does not exist. Please try again.`
          )
        )
      return interaction.followUp({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Check if anything is actually changing, and if not, return a message saying so
    if (
      roll.bearingCharacterId === bearingCharacterId &&
      roll.conceivingCharacterId === conceivingCharacterId &&
      roll.isCommitted === committed &&
      roll.inheritedTitle === inheritedTitle
    ) {
      // Reset the container so that the user can choose the same value from the select menu if they wish
      const player = await Players.findByPk(interaction.user.id);
      const character = await player.getCharacter();
      const container = await getIntercharacterRollManagerContainer(character);
      await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

      // Inform the user that no changes were made since the values they submitted are the same as the current values
      const noChangesContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# No Changes Detected\n` +
            `The values you submitted are the same as the current values of the intercharacter roll. Please make some changes before submitting.`
          )
        )
      return interaction.followUp({ components: [noChangesContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Confirm Intercharacter Roll Edit\n` +
          `Please confirm that you want to edit the intercharacter roll between **${roll.bearingCharacter.name}** and **${roll.conceivingCharacter.name}** to the following values:\n\n` +
          `**Bearing Character:** ${bearingCharacter.name}\n` +
          `**Conceiving Character:** ${conceivingCharacter.name}\n` +
          `**Married:** ${committed ? 'Yes' : 'No'}\n` +
          `**Inherited Title:** ${inheritedTitle}`
        )
      ],
      'character-manager-return-button',
      (interaction) => intercharacterRollEditConfirm(interaction, roll, bearingCharacter, conceivingCharacter, committed, inheritedTitle)
    )
  }
}

async function intercharacterRollEditConfirm(interaction, roll, newBearingCharacter, newConceivingCharacter, newCommitted, newInheritedTitle) {
  // Defer the reply to allow time to process
  await interaction.deferUpdate();

  // Change message to say that the intercharacter roll is being edited
  const container = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# Editing Intercharacter Roll\n` +
        `The intercharacter roll is being edited. This may take a moment...`
      )
    )

  await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  // Update the intercharacter roll in the database with the new values
  const { relationship: updatedRelationship } = await changeRelationshipInDatabase(
    interaction.user,
    roll,
    {
      newIsCommitted: newCommitted,
      newInheritedTitle: newInheritedTitle,
      newBearingCharacterId: newBearingCharacter.id,
      newConceivingCharacterId: newConceivingCharacter.id
    }
  );
  if (!updatedRelationship) {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Error Editing Intercharacter Roll\n` +
          `There was an error while editing the intercharacter roll. Please contact a storyteller for assistance.`
        )
      );
    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  // Notify the user of successful edit
  await showMessageThenReturnToContainer(
    interaction,
    `# Intercharacter Roll Edited\n` +
    `The intercharacter roll between **${newBearingCharacter.name}** and **${newConceivingCharacter.name}** has been successfully edited.`,
    10000,
    `Character Dashboard`,
    async () => getCharacterManagerContainer(interaction.user.id)
  )

  // Also notify the player of the other character of the changes
  const bearingCharacterPlayer = await (await updatedRelationship.getBearingCharacter()).getPlayer();
  const conceivingCharacterPlayer = await (await updatedRelationship.getConceivingCharacter()).getPlayer();

  if (!bearingCharacterPlayer || !conceivingCharacterPlayer) {
    // If either character does not have a player (for example if they are a playable child), skip this step
    return;
  }

  const otherPlayer = bearingCharacterPlayer.id === interaction.user.id ? conceivingCharacterPlayer : bearingCharacterPlayer;
  const otherUser = await interaction.client.users.fetch(otherPlayer.id);

  try {
    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Intercharacter Roll Edited\n` +
          `The intercharacter roll between **${newBearingCharacter.name}** and **${newConceivingCharacter.name}** has been edited by ${interaction.user}. ` +
          `The new values of the intercharacter roll are:\n\n` +
          `**Bearing Character:** ${newBearingCharacter.name}\n` +
          `**Conceiving Character:** ${newConceivingCharacter.name}\n` +
          `**Married:** ${newCommitted ? 'Yes' : 'No'}\n` +
          `**Inherited Title:** ${newInheritedTitle ? 'Nobility' : 'None'}\n\n` +
          `You can view the updated intercharacter roll in the Character Dashboard.`
        )
      );

    await otherUser.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
  catch (error) {
    console.log(`Could not send intercharacter roll edit notification to other player: ${error}`);
    const noDmContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Could Not Notify Other Player\n` +
          `The intercharacter roll was successfully edited, but there was an error sending a DM to the other player to notify them of the changes. This may be because they have DMs disabled. Please ask them to enable DMs so they can be notified of important updates like this in the future.`
        )
      );
    await interaction.followUp({ components: [noDmContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
  return;
}