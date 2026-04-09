const { Players } = require("../../dbObjects");
const { changeRecruitmentRolesModal } = require("../../helpers/modalCreator")

module.exports = {
  customId: 'region-change-recruitment-roles-button',
  async execute(interaction) {
    // Get region of character
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();
    const region = await character.getRegion();

    // Get modal to change recruitment roles
    const modal = await changeRecruitmentRolesModal(region);

    await interaction.showModal(modal);
  }
}