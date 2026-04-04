const { ContainerBuilder, inlineCode, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require("discord.js");
const { Players, PlayableChildren, Characters } = require("../dbObjects");
const { formatCharacterName } = require("../helpers/formatters");

module.exports = {
  customId: 'offspring-manage-select',
  async execute(interaction) {
    // Defer update to give time to process
    await interaction.deferUpdate();

    // Get player that invoked the interaction
    const player = await Players.findByPk(interaction.user.id);

    // Get the selected offspring ID from the interaction
    const selectedOffspringId = interaction.values[0];

    // Get the offspring that the player selected to manage
    const offspring = await PlayableChildren.findByPk(selectedOffspringId, {
      include: {
        model: Characters, as: `character`,
        include: [
          { model: Characters, as: `parent1` },
          { model: Characters, as: `parent2` }
        ]
      }
    });

    const formattedInfo = await offspring.formattedInfo;

    const hasNobleOrRulerParent = (offspring.character.parent1 && (offspring.character.parent1.socialClassName === 'Noble' || offspring.character.parent1.socialClassName === 'Ruler')) ||
      (offspring.character.parent2 && (offspring.character.parent2.socialClassName === 'Noble' || offspring.character.parent2.socialClassName === 'Ruler'));

    // Create the container for managing the selected offspring
    // First add a text display with the info about the offspring, then add
    // buttons to: change name, change region, legitimise, hide/unhide, 
    // change inheritance (social class) if either parent has socialClassName that is "Noble" 
    // or "Ruler"
    const conditionalActionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('offspring-change-name:' + offspring.id)
          .setLabel('Change Name')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('✍️'),
        new ButtonBuilder()
          .setCustomId('offspring-change-region:' + offspring.id)
          .setLabel('Change Region/House')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🏠'),
      )

    if ((hasNobleOrRulerParent && (offspring.legitimacy !== 'Illegitimate')) || offspring.character.socialClassName === 'Noble' || offspring.character.socialClassName === 'Ruler') {
      conditionalActionRow.addComponents(
        new ButtonBuilder()
          .setCustomId('offspring-change-inheritance:' + offspring.id)
          .setLabel('Change Inheritance')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('👑')
      );
    }

    if (offspring.legitimacy === 'Illegitimate') {
      conditionalActionRow.addComponents(
        new ButtonBuilder()
          .setCustomId('offspring-legitimise:' + offspring.id)
          .setLabel('Legitimise')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📜')
      )
    }

    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Manage Offspring: ${offspring.character ? `${formatCharacterName(offspring.character.name)}` : `${offspring.id}`}\n` +
          formattedInfo
        )
      )
      .addSeparatorComponents((separator) => separator)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `Use the buttons below to manage various aspects of this offspring.`
        )
      )
      .addActionRowComponents(
        conditionalActionRow,

        new ActionRowBuilder().setComponents(
          new ButtonBuilder()
            .setCustomId('offspring-toggle-hidden:' + offspring.id)
            .setLabel(offspring.hidden ? 'Unhide' : 'Hide')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('👁️'),
          new ButtonBuilder()
            .setCustomId('offspring-manager-return-button')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        ),
      );


    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2], allowedMentions: { parse: [] } });
  }
}