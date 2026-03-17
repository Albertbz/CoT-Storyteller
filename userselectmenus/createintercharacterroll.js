const { MessageFlags } = require("discord.js");
const { Players, Relationships } = require("../dbObjects");
const { Op } = require("sequelize");
const { intercharacterRollCreateModal } = require("../helpers/modalCreator");

module.exports = {
  customId: 'create-intercharacter-roll-select',
  async execute(interaction) {
    // Get the selected user from the select menu
    const selectedUserId = interaction.values[0];

    // If the selected player is the same as the user, return an error message
    if (selectedUserId === interaction.user.id) {
      return interaction.reply({ content: 'You cannot create an intercharacter roll with yourself. Please select a different player.', flags: [MessageFlags.Ephemeral] });
    }

    const selectedPlayer = await Players.findByPk(selectedUserId);
    // Make sure that the selected player is in the database and has a character
    if (!selectedPlayer) {
      return interaction.reply({ content: 'The selected player does not exist in the database. Please select a valid player.', flags: [MessageFlags.Ephemeral] });
    }
    const selectedCharacter = await selectedPlayer.getCharacter();
    if (!selectedCharacter) {
      return interaction.reply({ content: 'The selected player does not have a character. Please select a player with a character.', flags: [MessageFlags.Ephemeral] });
    }

    // Make sure that the selected character is not a commoner (since commoners
    // cannot take part in the offspring system)
    if (selectedCharacter.socialClassName === 'Commoner') {
      return interaction.reply({ content: 'The character of the selected player is a commoner and cannot take part in intercharacter rolls. Please select a different player or have the player opt their character in to notability.', flags: [MessageFlags.Ephemeral] });
    }

    // Make sure that the selected character and the character of the user are
    // not already in an intercharacter roll together
    const userPlayer = await Players.findByPk(interaction.user.id);
    const userCharacter = await userPlayer.getCharacter();
    const existingRollWithSelectedCharacter = await Relationships.findOne({
      where: {
        [Op.or]: [
          { bearingCharacterId: userCharacter.id, conceivingCharacterId: selectedCharacter.id },
          { bearingCharacterId: selectedCharacter.id, conceivingCharacterId: userCharacter.id }
        ]
      }
    });

    if (existingRollWithSelectedCharacter) {
      return interaction.reply({ content: `The character of the selected player is already in an intercharacter roll with your character. Please select a different player.`, flags: [MessageFlags.Ephemeral] });
    }

    // Make sure that the selected character and the user character are not both
    // the same type of partner in some other intercharacter roll
    const userCharacterBearingRoll = await Relationships.findOne({
      where: {
        bearingCharacterId: userCharacter.id
      }
    });

    if (userCharacterBearingRoll) {
      const selectedCharacterBearingRoll = await Relationships.findOne({
        where: {
          bearingCharacterId: selectedCharacter.id
        }
      });

      if (selectedCharacterBearingRoll) {
        return interaction.reply({ content: `The character of the selected player is already a bearing partner in another intercharacter roll while your character is also a bearing partner in another intercharacter roll. Please select a different player.`, flags: [MessageFlags.Ephemeral] });
      }
    }

    const userCharacterConceivingRoll = await Relationships.findOne({
      where: {
        conceivingCharacterId: userCharacter.id
      }
    });

    if (userCharacterConceivingRoll) {
      const selectedCharacterConceivingRoll = await Relationships.findOne({
        where: {
          conceivingCharacterId: selectedCharacter.id
        }
      });

      if (selectedCharacterConceivingRoll) {
        return interaction.reply({ content: `The character of the selected player is already a conceiving partner in another intercharacter roll while your character is also a conceiving partner in another intercharacter roll. Please select a different player.`, flags: [MessageFlags.Ephemeral] });
      }
    }

    // If all checks pass, create modal to specify the details of the
    // intercharacter roll (which character is bearing, whether the characters are married, etc.)
    const modal = await intercharacterRollCreateModal(userCharacter, selectedCharacter);
    return interaction.showModal(modal);
  }
}