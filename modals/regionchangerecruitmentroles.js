const { ContainerBuilder, MessageFlags, TextDisplayBuilder } = require("discord.js");
const { Players } = require("../dbObjects");
const { askForConfirmation } = require('../helpers/confirmations.js');
const { changeRegionInDatabase } = require("../misc.js");
const { showMessageThenReturnToContainer } = require("../helpers/messageSender.js");
const { getRegionManagerContainer } = require("../helpers/containerCreator.js");

module.exports = {
  customId: 'region-change-recruitment-roles-modal',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get player, character, and region
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();
    const region = await character.getRegion();

    // Get info from the modal select menus
    const role1Select = interaction.fields.getStringSelectValues('recruitment-roles-select')[0];
    const role2Select = interaction.fields.getStringSelectValues('recruitment-roles-select')[1];
    const role3Select = interaction.fields.getStringSelectValues('recruitment-roles-select')[2];

    // For each selected role, if it is not a value, set it to None
    const role1 = role1Select ? role1Select : "None";
    const role2 = role2Select ? role2Select : "None";
    const role3 = role3Select ? role3Select : "None";

    // Ensure that at least one role is different from the current roles
    const recruitment = await region.getRecruitment();
    const currentRoles = [recruitment.role1, recruitment.role2, recruitment.role3];
    if (currentRoles.includes(role1) && currentRoles.includes(role2) && currentRoles.includes(role3)) {
      const noChangesContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# No Changes Provided\n` +
            `The recruitment roles for **${region.name}** are already set to the selected values. Please select at least one different role to change.`
          )
        )

      return interaction.followUp({ components: [noChangesContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    const roles = [role1, role2, role3].filter(role => role !== "None").map(role => `**${role}**`);
    const formatter = new Intl.ListFormat('en-US', { style: 'long', type: 'conjunction' });

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Review Recruitment Role Changes\n` +
          `You are changing the recruitment roles for **${region.name}** to ` +
          `${roles.length > 0 ? formatter.format(roles) : "None"}.`
        )
      ],
      'region-manager-return-button',
      (interaction) => regionChangeRecruitmentRolesConfirm(interaction, region, role1, role2, role3)
    )
  }
}

async function regionChangeRecruitmentRolesConfirm(interaction, region, role1, role2, role3) {
  // Defer update to allow time to process
  await interaction.deferUpdate();

  // Notify the user that the recruitment roles are being updated
  const updatingContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Updating Recruitment Roles\n` +
        `The recruitment roles for **${region.name}** are being updated. This may take a moment...`
      )
    )

  await interaction.editReply({ components: [updatingContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  // Update the recruitment roles in the database
  const { region: updatedRegion } = await changeRegionInDatabase(interaction.user, region, { newRole1: role1, newRole2: role2, newRole3: role3 });
  if (!updatedRegion) {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Error Updating Recruitment Roles\n` +
          `There was an error updating the recruitment roles for **${region.name}**. Please contact a member of Staff for assistance.`
        )
      )
    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  // Notify the user that the recruitment roles have been updated
  return showMessageThenReturnToContainer(
    interaction,
    `# Recruitment Roles Updated\n` +
    `The recruitment roles for **${region.name}** have been updated.`,
    10000,
    `Region Dashboard`,
    async () => getRegionManagerContainer(interaction.user.id)
  );
}