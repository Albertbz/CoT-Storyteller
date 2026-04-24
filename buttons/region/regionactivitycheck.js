const { ContainerBuilder, ButtonBuilder, MessageFlags, ButtonStyle, inlineCode } = require('discord.js');
const { Players } = require('../../dbObjects.js');

module.exports = {
    customId: 'region-activity-check-button',
    async execute(interaction) {
        // Defer the update to allow time to process
        await interaction.deferUpdate();

        const player = await Players.findByPk(interaction.user.id);
        const character = await player.getCharacter();
        const region = await character.getRegion();

        const container = new ContainerBuilder()
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(
                    `# Activity Check\n` +
                    `In this menu, you can conduct an activity check on the citizens of your region, **${region.name}**. \n\n` +
                    `There are three types of activity checks you can conduct:\n` +
                    `- A **Simple Activity Check** will provide an activity check button in a selected channel that will allow citizens to check in for 48 hours. This is useful for quicker checks on whether citizens are active.\n` + 
                    `- A **Detailed Activity Check** will provide a more detailed activity check by asking citizens to provide information on Discord about their recent activity in the region, such as their role, activity, city of residence. This is useful for getting a better understanding of how active your citizens are and what they are doing in the region.\n`
                )
            )
            .addSeparatorComponents((separator) => separator)
            .addTextDisplayComponents((textDisplay) => textDisplay.setContent('Please select what type of check you would like to conduct.\n'));

        const simpleActivityButton = new ButtonBuilder()
            .setCustomId('simple-activity-check-button')
            .setLabel('Simple Activity Check')
            .setEmoji('💬')
            .setStyle(ButtonStyle.Secondary);

        const detailedActivityButton = new ButtonBuilder()
            .setCustomId('detailed-activity-check-button')
            .setLabel('Detailed Activity Check')
            .setEmoji('✉️')
            .setStyle(ButtonStyle.Secondary);

        const cancelButton = new ButtonBuilder()
            .setCustomId('region-manager-return-button')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger);

        
        container.addActionRowComponents((actionRow) =>
            actionRow.setComponents(
                simpleActivityButton,
                detailedActivityButton,
                cancelButton
            )
        );
        return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }
}