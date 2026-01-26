const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, userMention, inlineCode } = require('discord.js');
const { addDeceasedToDatabase } = require('../../misc.js');
const { channels } = require('./configs/ids.json');

// Function to show the deceased modal
async function showDeceasedModal(interaction, characterId) {
    const modal = new ModalBuilder()
    .setCustomId(`deceased_modal_${characterId}`)
    .setTitle('Record Character Death for ',characterId);

// Year input, doubt we get to year 100 so set a limit of 3
    const year = new TextInputBuilder()
    .setCustomId('year')
    .setLabel('Year of Death')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(3)
    .setPlaceholder('10')
    .setRequired(true);

// Month input
    const month = new TextInputBuilder()
    .setCustomId('month')
    .setLabel('Month of Death')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('January, February, March')
    .setRequired(true);

// Day input
    const day = new TextInputBuilder()
    .setCustomId('day')
    .setLabel('Day of Death (1-24)')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(2)
    .setPlaceholder('15')

    .setRequired(true);

// Cause input
    const cause = new TextInputBuilder()
    .setCustomId('cause')
    .setLabel('Cause of Death')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Note how your character died')
    .setMaxLength(30)
    .setRequired(true);
// Final Note Input
    const note = new TextInputBuilder()
    .setCustomId('notes')
    .setLabel('Final Notes')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Leave your final note, this is not allowed to reveal anything IC.')
    .setMaxLength(100)
    .setRequired(true);

// Add inputs to action rows
  const rows = [
    new ActionRowBuilder().addComponents(year),
    new ActionRowBuilder().addComponents(month),
    new ActionRowBuilder().addComponents(day),
    new ActionRowBuilder().addComponents(cause),
    new ActionRowBuilder().addComponents(note),
  ];

  modal.addComponents(...rows);

// Show modal
  await interaction.showModal(modal);
}

// Modal submission handler - shows confirmation
async function handleDeceasedModal(interaction) {
  const [, , characterId] = interaction.customId.split('_');
  
// Get values from modal
  const yearStr = interaction.fields.getTextInputValue('year');
  const monthStr = interaction.fields.getTextInputValue('month');
  const dayStr = interaction.fields.getTextInputValue('day');
  const cause = interaction.fields.getTextInputValue('cause');
   const note = interaction.fields.getTextInputValue('note');

  try {
// Validate year (integer)
    const year = parseInt(yearStr);
    if (isNaN(year)) {
      return interaction.reply({ 
        content: 'Year must be a valid number!', 
        flags: MessageFlags.Ephemeral 
      });
    }

// Validate month (must be valid month name)
    const validMonths = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase();
    
    if (!validMonths.includes(month)) {
      return interaction.reply({ 
        content: 'Month must be a valid month name (e.g., January, February, etc.)!', 
        flags: MessageFlags.Ephemeral 
      });
    }

// Validate day (integer between 1-24)
    const day = parseInt(dayStr);
    if (isNaN(day) || day < 1 || day > 24) {
      return interaction.reply({ 
        content: 'Day must be a number between 1 and 24!', 
        flags: MessageFlags.Ephemeral 
      });
    }

// Create confirmation embed
    const confirmEmbed = new EmbedBuilder()
      .setTitle('Confirm Character Death')
      .addFields(
        { name: 'Character ID', value: characterId },
        { name: 'Date of Death', value: `${month} ${day}, Year ${year}` },
        { name: 'Cause of Death', value: cause },
        { name: 'Final Note', value: note }
      )
      .setFooter({ text: 'Please confirm the information above is correct, this information will be publically posted in #Graveyard after 2 hours.' });

// Create confirmation buttons
    const confirmButton = new ButtonBuilder()
      .setCustomId(`deceased_confirm_${characterId}_${year}_${month}_${day}`)
      .setLabel('✓ Confirm')
      .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
      .setCustomId('deceased_cancel')
      .setLabel('✕ Cancel')
      .setStyle(ButtonStyle.Secondary);

    const buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    await interaction.reply({
      embeds: [confirmEmbed],
      components: [buttonRow],
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.log(error);
    return interaction.reply({ 
      content: `Error: ${error.message}`, 
      flags: MessageFlags.Ephemeral 
    });
  }
}

// Button confirmation handler
async function handleDeceasedConfirmation(interaction) {
  if (interaction.customId === 'deceased_cancel') {
    return interaction.update({
      content: 'Character death note cancelled.',
      embeds: [],
      components: [],
      flags: MessageFlags.Ephemeral
    });
  }

  try {
    // Add to database
    const { deceased, embed: deceasedCreatedEmbed } = await addDeceasedToDatabase(
      interaction.user, 
      true, 
      {
        characterId: characterId,
        yearOfDeath: parseInt(year),
        monthOfDeath: month,
        dayOfDeath: parseInt(day),
        causeOfDeath: cause,
        playedById: interaction.user.id
      }
    );
   // Message to Graveyard 2 hours after submittion
    const message = new EmbedBuilder()
        .setTitle(characterId)
        .setDescription(`${characterId}\n${month} ${day}, Year ${year}\n${cause}\n\n${note}`)
    setTimeout(async () => {
    try {
        const GraveyardLog = await client.channels.fetch(channels.Graveyard);
        await GraveyardLog.send({ embeds: [message] });
    } catch (err) {
        console.error("Failed to send graveyard message:", err);
    }
    }, 7200000);

     await postInLogChannel(
    'Deceased Changed',
    `**Changed by: ${userMention(interaction.user.id)}**\n\n` +
    `id: ${inlineCode(characterId)}\n` +
    `Character: ${inlineCode(characterId)}\n\n` +
    logInfoChanges.map(change => `${change.key}: ${change.oldValue} → ${change.newValue}`).join('\n'),
    COLORS.ORANGE
    );

    return interaction.editReply({ 
      content: 'Character successfully marked as deceased, this death should be posted in 2 hours in #Graveyard. If this has not happened please open a user support ticket.',
      embeds: [deceasedCreatedEmbed], 
      components: [],
      flags: MessageFlags.Ephemeral 
    });

    } 
    
    catch (error) {
    console.log(error);
    return interaction.editReply({ 
      content: `Error: ${error.message}`,
      embeds: [],
      components: [],
      flags: MessageFlags.Ephemeral 
    });
    }
}

// Interaction router - handles all interactions for this module
async function handleDeceasedInteraction(interaction) {
  // Handle modal submissions
  if (interaction.isModalSubmit() && interaction.customId.startsWith('deceased_modal_')) {
    return handleDeceasedModal(interaction);
  }
  
  // Handle button confirmations
  if (interaction.isButton() && (interaction.customId.startsWith('deceased_confirm_') || interaction.customId === 'deceased_cancel')) {
    return handleDeceasedConfirmation(interaction);
  }
}

module.exports = { showDeceasedModal, handleDeceasedInteraction };