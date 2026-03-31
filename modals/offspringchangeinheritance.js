const { MessageFlags, TextDisplayBuilder, ContainerBuilder } = require("discord.js");
const { PlayableChildren } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { changeCharacterInDatabase } = require("../misc");

module.exports = {
  customId: 'offspring-change-inheritance-modal',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the offspring ID from the customId of the modal
    const offspringId = interaction.customId.split(':')[1];
    // Get the offspring from the database
    const offspring = await PlayableChildren.findByPk(offspringId);
    const offspringCharacter = await offspring.getCharacter();

    // Get the selected inheritance value from the modal submission
    const inheritanceValue = interaction.fields.getStringSelectValues('offspring-change-inheritance-select')[0];
    const isInheriting = inheritanceValue === 'inheriting';
    const newSocialClassName = isInheriting ? 'Noble' : 'Notable';

    // Check if the offspring already has the new social class
    if (offspringCharacter.socialClassName === newSocialClassName) {
      const noChangeContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# No Changes Detected\n` +
            `The offspring **${offspringCharacter.name}** is already ${isInheriting ? 'inheriting nobility' : 'not inheriting nobility'}. Please select a different inheritance status to change it.`
          )
        );
      return interaction.followUp({ components: [noChangeContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Confirm Offspring Inheritance Change\n` +
          `You are about to change the inheritance status of the offspring **${offspringCharacter.name}** to ${isInheriting ? 'inheriting nobility' : 'not inheriting nobility'}. This will change the social class of the offspring to ${newSocialClassName}.`
        )
      ],
      'offspring-manager-return-button',
      (interaction) => offspringChangeInheritanceConfirm(interaction, offspring, newSocialClassName)
    )
  }
}

async function offspringChangeInheritanceConfirm(interaction, offspring, newSocialClassName) {
  // Defer update to allow time to process
  await interaction.deferUpdate();

  const offspringCharacter = await offspring.getCharacter();

  // Edit the message to say that the change is being processed
  const processingContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Offspring Inheritance Changing\n` +
        `The inheritance status change for the offspring **${offspringCharacter.name}** is being processed. Please wait a moment...`
      )
    );

  await interaction.editReply({ components: [processingContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  // Change the inheritance status of the offspring in the database
  await changeCharacterInDatabase(interaction.user, offspringCharacter, true, { newSocialClassName: newSocialClassName });

  // Edit the message to say that the change has been made
  const successContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Offspring Inheritance Changed\n` +
        `The inheritance status of the offspring **${offspringCharacter.name}** has been changed to ${newSocialClassName}.`
      )
    );

  return interaction.editReply({ components: [successContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
}