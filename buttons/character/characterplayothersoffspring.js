const { ContainerBuilder, TextDisplayBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");
const { PlayableChildren, Characters, Worlds } = require("../../dbObjects");
const { WORLD_ID } = require("../../constants");
const { Op } = require("sequelize");
const { showMessageThenReturnToContainer } = require("../../helpers/messageSender");
const { getCharacterManagerContainer } = require("../../helpers/containerCreator");

module.exports = {
  customId: 'character-play-others-offspring-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    // Get index from customId, which indicates which group of offspring options to show, which is separated by a :
    const [_, groupIndexString] = interaction.customId.split(':');
    const groupIndex = parseInt(groupIndexString) || 0;

    /**
     * Get the offspring that the user can play as, which are the offspring of
     * other players that are not hidden and have an age of 0 or more, and 
     * display them in a select menu for the user to choose from.
     */
    const world = await Worlds.findByPk(WORLD_ID);

    const offspring = await PlayableChildren.findAll({
      where: {
        hidden: false,
      },
      include: {
        model: Characters, as: 'character',
        where: {
          yearOfMaturity: {
            [Op.lte]: world.currentYear
          }
        }
      }
    });

    // If there are no offspring, display a message saying so
    if (offspring.length === 0) {
      const noPlayableOffspringContainer = new ContainerBuilder()
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `# No Playable Offspring\n` +
            `There are currently no playable offspring of other players that are available for play. Please make a new character instead.`
          )
        );

      return interaction.followUp({ components: [noPlayableOffspringContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    const offspringOptions = [];
    for (const child of offspring) {
      const character = child.character;
      const age = world.currentYear - character.yearOfMaturity;
      const parents = [];
      const parent1 = await character.getParent1();
      const parent2 = await character.getParent2();
      if (parent1) parents.push(parent1.name);
      if (parent2) parents.push(parent2.name);
      const parentsString = parents.length > 0 ? parents.join(' & ') : 'Unknown';
      const descriptionString =
        `${child.legitimacy} ${character.sex ? character.sex === 'Male' ? 'Son' : 'Daughter' : 'Child'} of ${parentsString} | ` +
        `Age: ${age}`;

      const option = new StringSelectMenuOptionBuilder()
        .setLabel(character.name)
        .setDescription(descriptionString.slice(0, 100))
        .setValue(child.id);
      offspringOptions.push(option);
    }

    // Split the options into groups of 25, as that is the maximum number of options that can be added to a select menu
    const offspringOptionGroups = [];
    for (let i = 0; i < offspringOptions.length; i += 25) {
      offspringOptionGroups.push(offspringOptions.slice(i, i + 25));
    }

    function getContainerForGroup(groupIndex) {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('character-play-others-offspring-select')
        .setPlaceholder('Select an offspring to request to play as')
        .addOptions(offspringOptionGroups[groupIndex]);

      const selectMenuRow = new ActionRowBuilder().addComponents(selectMenu);

      const previousButton = new ButtonBuilder()
        .setCustomId(`character-play-others-offspring-button:${groupIndex - 1}`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⬅️')
        .setDisabled(groupIndex === 0);

      const nextButton = new ButtonBuilder()
        .setCustomId(`character-play-others-offspring-button:${groupIndex + 1}`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('➡️')
        .setDisabled(groupIndex === offspringOptionGroups.length - 1);

      const cancelButton = new ButtonBuilder()
        .setCustomId('character-manager-return-button')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)

      const navigationRow = new ActionRowBuilder().addComponents(previousButton, nextButton, cancelButton);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Playable Offspring\n` +
            `Select an offspring of another player to request to play as. Only unhidden offspring that are mature (age 0 or more) are shown. The request will be sent to the contact(s) of the offspring for approval.\n\n` +
            `-# Showing ${groupIndex * 25 + 1}-${Math.min(groupIndex * 25 + 25, offspringOptions.length)} of ${offspringOptions.length} Offspring`
          )
        )
        .addActionRowComponents(selectMenuRow)
        .addActionRowComponents(navigationRow);

      return container;
    }

    return interaction.editReply({ components: [getContainerForGroup(groupIndex)], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}