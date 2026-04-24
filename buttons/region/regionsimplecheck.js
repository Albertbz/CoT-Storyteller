const { ContainerBuilder, ButtonBuilder, MessageFlags, ButtonStyle, TextDisplayBuilder, inlineCode, roleMention, time, TimestampStyles } = require('discord.js');
const { Players } = require('../../dbObjects.js');
const { askForConfirmation } = require('../../helpers/confirmations');
const { showMessageThenReturnToContainer } = require('../../helpers/messageSender');
const { getRegionManagerContainer } = require('../../helpers/containerCreator');

module.exports = {
    customId: 'simple-activity-check-button',
    async execute(interaction) {
        // Defer the update to allow time to process
        await interaction.deferUpdate();

        return askForConfirmation(
            interaction,
            [
                new TextDisplayBuilder().setContent(
                    `# Simple Activity Check\n` +
                    `By clicking Start check, you will send a pinned message to the main annoucement channel of your nation noting for citizens to press the button to state they are still active. \n` +
                    `This check will last for 48 hours, after which you will be notified of who has and has not completed the check.\n`
                )
            ],
            'region-manager-return-button',
            (interaction) => simpleActivityConfirm(interaction)
          )
    } 
}

async function simpleActivityConfirm(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();
    const region = await character.getRegion();
    const regionrole = region.roleID;

    const checkContainer = new ContainerBuilder()
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
                `# Activity Check\n` +
                `The ruler of your region, ${roleMention(regionrole)}, has initiated an activity check. This message will be pinned in the announcement channel asking all citizens to check in to confirm they are still active. This check will last for 48 hours until ${time(new Date(Date.now() + 48 * 60 * 60 * 1000), TimestampStyles.LongDateShortTime)} \n\n` +
                `Please click the button below to confirm you are still active.`
            )
        )
        .addActionRowComponents((actionRow) =>
            actionRow
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('player-confirm-simple-activity-check')
                        .setLabel('Confirm')
                        .setStyle(ButtonStyle.Success)
                )
        );

    // Send the confirmation message to the other player's DMs
    const announcementChannel = await interaction.client.channels.fetch(region.generalChannelId); //using general channel for testing
    let response = null;
    try {
        response = await announcementChannel.send({
            components: [checkContainer],
            flags: [MessageFlags.IsComponentsV2]
        });
    }
    catch (error) {
        console.log('Error sending message to announcement channel for simple activity check:', error);
        // If there was an error sending the message, inform the user who initiated the check and return
        const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `# Error Sending Confirmation Message\n` +
                    `There was an error sending a message to the announcement channel for confirmation. Please contact a storyteller for assistance.`
                )
            )
        return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }



    return showMessageThenReturnToContainer(
        interaction,
        `# Simple Activity Check Started\n` +
        `You have successfully started a simple activity check for your region, ${region.name}. Your citizens will be notified to confirm their activity.`,
        10000,
        'Region Dashboard',
        async () => getRegionManagerContainer(interaction.user.id)
      )
}