const { TextDisplayBuilder, ContainerBuilder, MessageFlags, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { Characters, Vassals, VassalSteelbearers } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { formatCharacterName } = require("../helpers/formatters");
const { showMessageThenReturnToContainer } = require("../helpers/messageSender");
const { getRegionManagerContainer } = require("../helpers/containerCreator");

module.exports = {
  customId: 'region-add-steelbearer-select',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the characterId from the select menu values
    const characterId = interaction.values[0];
    const character = await Characters.findByPk(characterId);
    const region = await character.getRegion();

    /**
     * Create a select menu where the user can select what type of steelbearer
     * they want to make the character
     */
    const rulerOption = new StringSelectMenuOptionBuilder()
      .setLabel('Ruler')
      .setValue('Ruler')
      .setDescription('The Ruler slot is reserved for the ruler of the region.');

    const duchyOption = new StringSelectMenuOptionBuilder()
      .setLabel('Duchy')
      .setValue('Duchy')
      .setDescription('The Duchy slots are typically reserved for the rulers of duchies within the region.');

    const generalPurposeOption = new StringSelectMenuOptionBuilder()
      .setLabel('General-purpose')
      .setValue('General-purpose')
      .setDescription('The General-purpose slots can be used for any steelbearer.');

    const vassalOption = new StringSelectMenuOptionBuilder()
      .setLabel('Vassal')
      .setValue('Vassal')
      .setDescription('The Vassal slots are used when the region has vassals.');

    const liegeOption = new StringSelectMenuOptionBuilder()
      .setLabel('Liege')
      .setValue('Liege')
      .setDescription('The Liege slots are used when the region is a vassal.');

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`region-add-steelbearer-type-select:${characterId}`)
      .setPlaceholder('Select the type of steelbearer you want to make this character')

    const steelbearers = await region.getSteelbearers();

    const optionsToAdd = [];
    // Check if the ruler slot is already taken, and if not, add the ruler option
    // if the character is the ruler
    const rulerSteelbearer = steelbearers.find(sb => sb.type === 'Ruler');
    if (!rulerSteelbearer && character.socialClassName === 'Ruler') {
      optionsToAdd.push(rulerOption);
    }

    // Check if the general-purpose slots are already taken, and if not, add the general-purpose option
    const generalPurposeSteelbearers = steelbearers.filter(sb => sb.type === 'General-purpose');
    const regionIsVassal = await Vassals.findOne({ where: { vassalId: region.id } });
    if (generalPurposeSteelbearers.length < (regionIsVassal ? 0 : 3)) {
      optionsToAdd.push(generalPurposeOption);
    }

    // Check if the duchy slots are already taken, and if not, add the duchy option
    const duchySteelbearers = steelbearers.filter(sb => sb.type === 'Duchy');
    if (duchySteelbearers.length < 3) {
      optionsToAdd.push(duchyOption);
    }

    // If the region is a vassal, check if the vassal/liege slots are already taken, 
    // and if not, add the liege option
    if (regionIsVassal) {
      const vassalSteelbearers = await VassalSteelbearers.findAll({ where: { vassalId: regionIsVassal.id } });
      if (vassalSteelbearers.length < 2) {
        optionsToAdd.push(liegeOption);
      }
    }

    // If the region is a liege, check if the vassal/liege slots are already taken,
    // and if not, add the vassal option
    const regionVassals = await Vassals.findAll({ where: { liegeId: region.id } });
    if (regionVassals.length > 0) {
      const vassalSteelbearers = await VassalSteelbearers.findAll({
        where: { vassalId: regionVassals.map(v => v.id) }
      });
      if (vassalSteelbearers.length < 2 * regionVassals.length) {
        optionsToAdd.push(vassalOption);
      }
    }

    if (optionsToAdd.length === 0) {
      return showMessageThenReturnToContainer(
        interaction,
        `# No Available Slots\n` +
        `There are no available steelbearer slots for this character in the region.`,
        10000,
        'Region Dashboard',
        async () => getRegionManagerContainer(interaction.user.id)
      )
    }
    selectMenu.addOptions(optionsToAdd);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Add Steelbearer\n` +
          `Select the type of steelbearer you want to make this character. Only available slots are shown based on the current steelbearers of the region.`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(selectMenu),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('region-manager-return-button')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        )
      )

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}