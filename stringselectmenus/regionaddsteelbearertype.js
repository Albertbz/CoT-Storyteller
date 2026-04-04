const { TextDisplayBuilder, ContainerBuilder, MessageFlags, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { Characters, Steelbearers, Vassals, VassalSteelbearers } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { formatCharacterName } = require("../helpers/formatters");
const { addSteelbearerConfirm } = require("../helpers/steelbearer");

module.exports = {
  customId: 'region-add-steelbearer-type-select',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the characterId from the customId, split by :
    const [_, characterId] = interaction.customId.split(':');
    const character = await Characters.findByPk(characterId);
    const region = await character.getRegion();

    // Depending on the type selected, do different things
    const selectedType = interaction.values[0];
    if (selectedType === 'Ruler' || selectedType === 'General-purpose') {
      await handleSimpleType(interaction, character, region, selectedType);
    }
    else if (selectedType === 'Duchy') {
      await handleDuchyType(interaction, character, region);
    }
    else if (selectedType === 'Vassal') {
      await handleVassalType(interaction, character, region);
    }
    else if (selectedType === 'Liege') {
      await handleLiegeType(interaction, character, region);
    }
  }
}

async function handleSimpleType(interaction, character, region, type) {
  // If the user selected the Ruler type there is nothing else to ask them, so
  // just ask for confirmation
  return askForConfirmation(
    interaction,
    [
      new TextDisplayBuilder().setContent(
        `# Confirm Adding Steelbearer\n` +
        `You are currently making ${formatCharacterName(character.name)} a **${type}** steelbearer of **${region.name}**. This will notify the player of the character that they have been made a steelbearer.`
      )
    ],
    'region-manager-return-button',
    (interaction) => addSteelbearerConfirm(interaction, character, region, type)
  )
}

async function handleDuchyType(interaction, character, region) {
  // Create a new select menu where the user can select which duchy the
  // steelbearer will be for, including only those duchies that do not already
  // have a steelbearer assigned to them
  const duchiesWithoutSteelbearer = await region.getDuchies({
    include: { model: Steelbearers, as: 'steelbearer', required: false, attributes: [] },
    where: { '$steelbearer.id$': null }
  });

  const options = duchiesWithoutSteelbearer.map(duchy => {
    return new StringSelectMenuOptionBuilder()
      .setLabel(duchy.name)
      .setValue(duchy.id)
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('region-add-steelbearer-duchy-select:' + character.id)
    .setPlaceholder('Select a duchy')
    .addOptions(options)

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Add Steelbearer\n` +
        `Since you selected the Duchy steelbearer type, please select which duchy this steelbearer will be for. The name of the duchy will be added to the steelbearer's entry in the steelbearer list, so it will be clear which duchy they are the steelbearer for.`
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

async function handleVassalType(interaction, character, region) {
  // Create a new select menu where the user can select which vassal region the
  // steelbearer will be for, including only those vassal regions that do not
  // already have two steelbearers assigned to them
  const vassals = await Vassals.findAll({ where: { liegeId: region.id } });
  const options = [];
  for (const vassal of vassals) {
    const vassalSteelbearers = await VassalSteelbearers.findAll({ where: { vassalId: vassal.id } });
    if (vassalSteelbearers.length < 2) {
      const vassalRegion = await vassal.getVassalRegion();
      options.push(
        new StringSelectMenuOptionBuilder()
          .setLabel(vassalRegion.name)
          .setValue(vassal.id)
      );
    }
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('region-add-steelbearer-vassal-select:' + character.id)
    .setPlaceholder('Select a vassal region')
    .addOptions(options)

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Add Steelbearer\n` +
        `Since you selected the Vassal steelbearer type, please select which vassal region this steelbearer will be for. The name of the vassal region will be added to the steelbearer's entry in the steelbearer list, so it will be clear which vassal region they are the steelbearer for.`
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

async function handleLiegeType(interaction, character, region) {
  // Maybe change this later to ask the liege region ruler to confirm creation
  // of the liege steelbearer, but for now just create the liege steelbearer
  // without asking for confirmation
  return handleSimpleType(interaction, character, region, 'Liege');
}