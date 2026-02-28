const { ActionRowBuilder, StringSelectMenuBuilder, UserSelectMenuBuilder, MessageFlags, TextDisplayBuilder, ContainerBuilder, ButtonBuilder, ButtonStyle, SeparatorBuilder } = require("discord.js");
const { Players } = require("../dbObjects");

module.exports = {
  customId: 'create-intercharacter-roll-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    // Create text display component that explains how to create an
    // intercharacter roll (choose other character, specify if married or not, etc.)
    const characterRollInstructions = new TextDisplayBuilder()
      .setContent(
        `# Create Intercharacter Roll\n` +
        `To create an intercharacter roll, you will have to specify up to three things: the character your character is rolling with (and which character will be bearing the children), whether the two characters are married, and in the case of either being nobility, whether any children will inherit noble titles.`
      );

    // Create a select menu to select the other character to roll with a user select menu
    const userSelectMenu = new UserSelectMenuBuilder()
      .setCustomId('create-intercharacter-roll-select')
      .setPlaceholder('Select the other character to roll with');

    const selectMenuActionRow = new ActionRowBuilder()
      .addComponents(userSelectMenu);

    // Create a cancel button to return to the character manager
    const cancelButton = new ButtonBuilder()
      .setCustomId('character-manager-return-button')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger);

    const cancelButtonActionRow = new ActionRowBuilder()
      .addComponents(cancelButton);

    // Create an additional text display component asking the user to select the other character
    const selectOtherCharacterTextDisplay = new TextDisplayBuilder()
      .setContent('To start the process, please select the player of the character you want to create an intercharacter roll with. You can search for the player by their nickname (typically the name of their character).');

    const separator = new SeparatorBuilder();

    // Create container and add the text display and select menu to it
    const container = new ContainerBuilder()
      .addTextDisplayComponents(characterRollInstructions)
      .addSeparatorComponents(separator)
      .addTextDisplayComponents(selectOtherCharacterTextDisplay)
      .addActionRowComponents(selectMenuActionRow, cancelButtonActionRow);

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}