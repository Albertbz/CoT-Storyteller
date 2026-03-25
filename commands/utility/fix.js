const { SlashCommandBuilder, MessageFlags, InteractionContextType } = require("discord.js");
const { Deceased, Characters, Regions, Houses } = require("../../dbObjects");
const { changeCharacterInDatabase } = require("../../misc");
const { WANDERER_REGION_ID } = require("../../constants");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fix")
    .setDescription("Fix something that is broken.")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addSubcommand(subcommand =>
      subcommand
        .setName("regionandhouse")
        .setDescription("Fix the region and house of characters.")
    ),
  async execute(interaction) {
    // Defer reply to allow time to respond
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "regionandhouse") {
      const deceaseds = await Deceased.findAll({
        include: {
          model: Characters, as: 'character',
          include: [
            { model: Regions, as: 'region' },
            { model: Houses, as: 'house' }
          ]
        }
      });

      for (const deceased of deceaseds) {
        // If character died before year 25, check the region and house and
        // update the region if house is not null and region is Wanderer
        if (deceased.yearOfDeath < 25 && deceased.character.house && deceased.character.region && deceased.character.region.id === WANDERER_REGION_ID) {
          const houseToRegionMap = {
            'Locke': 'The Barrowlands',
            'Merrick': 'The Heartlands',
            'Dayne': 'Riverhelm',
            'Davila': 'First Landing',
            'Aetos': 'Vernados',
            'Du Vēzos': 'Eshaeryn',
            'Farring': 'First Landing',
            'Stout': 'Vernados'
          };

          const newRegionName = houseToRegionMap[deceased.character.house.name];
          if (newRegionName) {
            const newRegion = await Regions.findOne({ where: { name: newRegionName } });
            if (newRegion) {
              await changeCharacterInDatabase(interaction.user, deceased.character, true, { newRegionId: newRegion.id, autoChangeHouse: false });
            }
          }
          else {
            console.log(`No region found for house ${deceased.character.house.name}`);
          }
        }
        // If character died after year 25 and has region as Wanderer, set the
        // house to null
        else if (deceased.yearOfDeath >= 25 && deceased.character.region && deceased.character.region.id === WANDERER_REGION_ID) {
          if (deceased.character.house) {
            await changeCharacterInDatabase(interaction.user, deceased.character, true, { newHouseId: 0 });
          }
        }
      }

      // Go through all characters and if they have region as Wanderer and a house, set the house to null
      const characters = await Characters.findAll({
        include: [
          { model: Regions, as: 'region' },
          { model: Houses, as: 'house' }
        ]
      });

      for (const character of characters) {
        if (character.region && character.region.id === WANDERER_REGION_ID && character.house) {
          await changeCharacterInDatabase(interaction.user, character, true, { newHouseId: 0 });
        }
      }

      await interaction.editReply("Fixed region and house for characters. See log for changes.");
    }
  }
}