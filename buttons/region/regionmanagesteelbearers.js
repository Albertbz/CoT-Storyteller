const { TextDisplayBuilder, ContainerBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SeparatorBuilder } = require("discord.js");
const { Players, Steelbearers, Characters, Vassals, VassalSteelbearers, Regions } = require("../../dbObjects");
const { Op } = require("sequelize");

module.exports = {
  customId: 'region-manage-steelbearers-button',
  async execute(interaction) {
    await interaction.deferUpdate();

    /**
     * Create the menu for managing the steelbearers of a region. Show the current
     * steelbearers of the region split up by their type, and then ordered alphabetically.
     * Add a button to add a steelbearer and a button to remove a steelbearer,
     * and then also a button to cancel and go back to the region dashboard.
     */
    // First, get the region by getting the region of the character of the user
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();
    const region = await character.getRegion();

    // Get the steelbearers of the region and split them up by type
    const steelbearers = await Steelbearers.findAll({
      where: { regionId: region.id },
      include: { model: Characters, as: 'character', required: true }
    });

    const steelbearerTypes = ['Ruler', 'General-purpose', 'Duchy'];

    const regionIsVassal = await Vassals.findOne({ where: { vassalId: region.id } });
    const regionIsLiege = await Vassals.findAll({ where: { liegeId: region.id } });

    if (regionIsVassal) {
      steelbearerTypes.push('Liege');
    }
    else if (regionIsLiege.length > 0) {
      steelbearerTypes.push('Vassal');
    }

    const steelbearersByType = {};
    for (const type of steelbearerTypes) {
      steelbearersByType[type] = steelbearers
        .filter(sb => sb.type === type)
        .sort((a, b) => a.character.name.localeCompare(b.character.name));
    }

    // Create a textdisplay to show the steelbearers of the region, split up by 
    // type, and show how many the region has out of the maximum for each type
    // (1 ruler, 3 duchy, 3 general-purpose if not a vassal, 2 vassal if a liege, 2 liege if a vassal)
    let steelbearerText = '';
    let maxSteelbearersTotal = 0;
    for (const type of steelbearerTypes) {
      let maxSteelbearers = 0;
      let typeInfo = '-# ';
      if (type === 'Ruler') {
        maxSteelbearers = 1;
        typeInfo += 'The Ruler slot is reserved for the ruler of the region.'
      }
      else if (type === 'Duchy') {
        maxSteelbearers = 3;
        typeInfo += 'The Duchy slots are typically reserved for the rulers of duchies within the region.'
      }
      else if (type === 'General-purpose') {
        maxSteelbearers = regionIsVassal ? 0 : 3;
        typeInfo += 'The General-purpose slots can be used for any steelbearer, but are changed into Vassal/Liege slots if the region becomes a vassal.'
      }
      else if (type === 'Vassal') {
        const takenLiegeSteelbearerSlots = await VassalSteelbearers.count({
          include: [
            { model: Vassals, as: 'vassal', where: { liegeId: region.id } },
            { model: Steelbearers, as: 'steelbearer', required: true, where: { type: 'Liege' } }
          ],
        })
        maxSteelbearers = regionIsLiege.length > 0 ? regionIsLiege.length * 2 - takenLiegeSteelbearerSlots : 0;
        typeInfo += 'The Vassal slots are used when the region is a liege. Lieges get two Vassal slots per vassal that they can either keep or give back to the vassal as Liege slots.'
      }
      else if (type === 'Liege') {
        const takenVassalSteelbearerSlots = await VassalSteelbearers.count({
          include: [
            { model: Vassals, as: 'vassal', where: { vassalId: region.id } },
            { model: Steelbearers, as: 'steelbearer', required: true, where: { type: 'Vassal' } }
          ],
        })
        maxSteelbearers = regionIsVassal ? 2 - takenVassalSteelbearerSlots : 0;
        typeInfo += 'The Liege slots are used when the region is a vassal. Vassals can get up to two Liege slots from their liege, but it is up to the liege whether they want to keep those slots or give them back to the vassal.'
      }

      maxSteelbearersTotal += maxSteelbearers;

      steelbearerText += `### ${type} (${steelbearersByType[type].length}/${maxSteelbearers})\n`;
      if (steelbearersByType[type].length !== 0) {
        for (const steelbearer of steelbearersByType[type]) {
          const extraText = await steelbearer.extraText;
          steelbearerText += `- ${steelbearer.character.name}${extraText !== '' ? ` | ${extraText}` : ''}\n`;
        }
      }

      steelbearerText += `${typeInfo}\n`
    }

    const textDisplay = new TextDisplayBuilder().setContent(
      `# Manage Steelbearers\n` +
      `Below is a list of the steelbearers of your region, split up by type.\n` +
      `${steelbearerText}`
    );

    // Calculate if there are any available slots for steelbearers, and if not, disable the add steelbearer button
    const totalSteelbearers = steelbearers.length;
    const addSteelbearerDisabled = totalSteelbearers >= maxSteelbearersTotal;
    const removeSteelbearerDisabled = totalSteelbearers === 0;

    // Create the container and add the buttons
    const container = new ContainerBuilder()
      .addTextDisplayComponents(textDisplay)
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Use the buttons below to manage the steelbearers of your region.`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('region-add-steelbearer-button')
            .setLabel('Add Steelbearer')
            .setEmoji('🦾')
            .setDisabled(addSteelbearerDisabled)
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('region-remove-steelbearer-button')
            .setLabel('Remove Steelbearer')
            .setEmoji('🩸')
            .setDisabled(removeSteelbearerDisabled)
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('region-manager-return-button')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        )
      )

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}