const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { updateRecruitmentPost } = require('../misc.js');

module.exports = {
  customId: 'update-recruitment-post-button',
  async execute(interaction) {
    // Defer update to give user feedback that button was pressed
    await interaction.deferUpdate();

    /**
     * Update the message to say that the post is being updated and to wait a moment
     */
    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent(`# Updating Recruitment Post\nPlease wait a moment while the recruitment post is being updated...`)
      )

    await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });

    // Update the recruitment post message
    const updatedRecruitmentMessage = await updateRecruitmentPost(interaction);

    // After updating the recruitment post, edit the message with the result
    return interaction.editReply(updatedRecruitmentMessage);
  }
}