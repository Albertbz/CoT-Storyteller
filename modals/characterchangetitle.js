const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const { Players } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { changeCharacterTitleModal } = require("../helpers/modalCreator");
const { changeCharacterInDatabase } = require("../misc");
const { showMessageThenReturnToContainer } = require("../helpers/messageSender");
const { getCharacterManagerContainer } = require("../helpers/containerCreator");

module.exports = {
  customId: 'character-change-title-modal',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the player's character
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();

    // Get the new title from the modal input
    const newTitle = interaction.fields.getTextInputValue('character-title-input').trim();
    const titleToSet = newTitle === '' ? '-' : newTitle;

    const oldTitleDisplay = character.title ? character.title : '*None*';
    const newTitleDisplay = titleToSet === '-' ? '*None*' : titleToSet;

    // Ensure that the title is different from the current title
    if ((titleToSet === '-' && !character.title) || titleToSet === character.title) {
      const sameTitleContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# No Changes Detected\n\n` +
          `Your current title is already **${oldTitleDisplay}**. Please enter a different title to update it.`
        )
      )
      return interaction.followUp({ components: [sameTitleContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Confirm Title Change\n\n` +
          `You are about to ${titleToSet === '-' ? `remove your character\'s title, **${oldTitleDisplay}**` : `change your character\'s title from **${oldTitleDisplay}** to **${newTitleDisplay}**`}.`
        )
      ],
      `character-manager-return-button`,
      (interaction) => changeTitleConfirm(interaction, character, titleToSet),
      (interaction) => changeTitleEdit(interaction, character, titleToSet)
    )
  }
}

async function changeTitleConfirm(interaction, character, titleToSet) {
  // Defer the update to allow time to process
  await interaction.deferUpdate();

  // Update the message to say that the title is being changed
  const changingContainer = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# Changing Title\n\n` +
      `Your character's title is being ${titleToSet === '-' ? 'removed' : `changed to **${titleToSet}**`}. This may take a moment...`
    )
  )
  await interaction.editReply({ components: [changingContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  // Update the character's title in the database
  const { character: updatedCharacter } = await changeCharacterInDatabase(interaction.user, character, true, { newTitle: titleToSet });
  if (!updatedCharacter) {
    const errorContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Title Change Failed\n\n` +
        `There was an error changing your character's title. Please try again later or contact a member of Staff.`
      )
    );
    return interaction.followUp({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  // Edit the message to say that the title was changed
  return showMessageThenReturnToContainer(
    interaction,
    `# Title Changed\n\n` +
    `Your character's title has been ${titleToSet === '-' ? 'removed' : `changed to **${updatedCharacter.title}**`}!`,
    10000,
    `Character Dashboard`,
    async () => getCharacterManagerContainer(interaction.user.id)
  );
}

async function changeTitleEdit(interaction, character, titleToSet) {
  // Get the modal for changing a character's title
  const modal = await changeCharacterTitleModal(character, titleToSet === '-' ? '' : titleToSet);

  // Show the modal to the user
  return interaction.showModal(modal);
}