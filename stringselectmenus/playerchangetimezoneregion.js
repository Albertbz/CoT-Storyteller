const { StringSelectMenuOptionBuilder, StringSelectMenuBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");

module.exports = {
  customId: 'player-change-timezone-region-select',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    // Get the selected value to determine which region to show the timezones for
    // make into int to determine which region was selected
    const regionIndex = parseInt(interaction.values[0]);

    const { description, timezoneOptions } = getTimezonesForRegion(regionIndex);

    const timezoneSelectMenu = new StringSelectMenuBuilder()
      .setCustomId(`player-change-timezone-select`)
      .setPlaceholder('Select your timezone')
      .addOptions(timezoneOptions);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Change Timezone - ${description}\n\n` +
          `Please select your timezone from the dropdown menu below.`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(timezoneSelectMenu),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`player-manager-return-button`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        )
      );

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}

function getTimezonesForRegion(regionIndex) {
  const timezones = [
    {
      description: `The Americas & Pacific West`, timezoneOptions: [
        new StringSelectMenuOptionBuilder().setLabel('UTC-12:00').setDescription('BIT - Baker Island Time').setValue('UTC-12:00_BIT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC-11:00').setDescription('SST - Samoa Standard Time').setValue('UTC-11:00_SST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC-10:00').setDescription('HST - Hawaii-Aleutian Standard Time').setValue('UTC-10:00_HST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC-09:00').setDescription('AKST - Alaska Standard Time').setValue('UTC-09:00_AKST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC-08:00').setDescription('AKDT - Alaska Daylight Time').setValue('UTC-08:00_AKDT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC-08:00').setDescription('PST - Pacific Standard Time').setValue('UTC-08:00_PST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC-07:00').setDescription('PDT - Pacific Daylight Time').setValue('UTC-07:00_PDT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC-07:00').setDescription('MST - Mountain Standard Time').setValue('UTC-07:00_MST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC-06:00').setDescription('MDT - Mountain Daylight Time').setValue('UTC-06:00_MDT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC-06:00').setDescription('CST - Central Standard Time').setValue('UTC-06:00_CST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC-05:00').setDescription('CDT - Central Daylight Time').setValue('UTC-05:00_CDT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC-05:00').setDescription('EST - Eastern Standard Time').setValue('UTC-05:00_EST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC-04:00').setDescription('EDT - Eastern Daylight Time').setValue('UTC-04:00_EDT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC-04:00').setDescription('AST - Atlantic Standard Time').setValue('UTC-04:00_AST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC-03:00').setDescription('ADT - Atlantic Daylight Time').setValue('UTC-03:00_ADT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC-03:30').setDescription('NST - Newfoundland Standard Time').setValue('UTC-03:30_NST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC-02:30').setDescription('NDT - Newfoundland Daylight Time').setValue('UTC-02:30_NDT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC-03:00').setDescription('ART - Argentina Time').setValue('UTC-03:00_ART'),
        new StringSelectMenuOptionBuilder().setLabel('UTC-03:00').setDescription('BRT - Brasília Time').setValue('UTC-03:00_BRT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC-02:00').setDescription('GST - South Georgia Time').setValue('UTC-02:00_GST_SA'),
        new StringSelectMenuOptionBuilder().setLabel('UTC-01:00').setDescription('CVT - Cape Verde Time').setValue('UTC-01:00_CVT')
      ]
    },
    {
      description: `Europe, Africa & Middle East`, timezoneOptions: [
        new StringSelectMenuOptionBuilder().setLabel('UTC±00:00').setDescription('GMT/UTC - Greenwich Mean Time').setValue('UTC±00:00_GMT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC±00:00').setDescription('WET - Western European Time').setValue('UTC±00:00_WET'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+01:00').setDescription('WEST - Western European Summer Time').setValue('UTC+01:00_WEST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+01:00').setDescription('BST - British Summer Time').setValue('UTC+01:00_BST_UK'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+01:00').setDescription('CET - Central European Time').setValue('UTC+01:00_CET'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+01:00').setDescription('WAT - West Africa Time').setValue('UTC+01:00_WAT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+02:00').setDescription('CEST - Central European Summer Time').setValue('UTC+02:00_CEST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+02:00').setDescription('EET - Eastern European Time').setValue('UTC+02:00_EET'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+02:00').setDescription('CAT - Central Africa Time').setValue('UTC+02:00_CAT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+02:00').setDescription('SAST - South African Standard Time').setValue('UTC+02:00_SAST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+03:00').setDescription('EEST - Eastern European Summer Time').setValue('UTC+03:00_EEST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+03:00').setDescription('MSK - Moscow Standard Time').setValue('UTC+03:00_MSK'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+03:00').setDescription('AST - Arabia Standard Time').setValue('UTC+03:00_AST_ARABIA'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+03:00').setDescription('EAT - East Africa Time').setValue('UTC+03:00_EAT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+03:30').setDescription('IRST - Iran Standard Time').setValue('UTC+03:30_IRST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+04:30').setDescription('IRDT - Iran Daylight Time').setValue('UTC+04:30_IRDT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+04:00').setDescription('GST - Gulf Standard Time').setValue('UTC+04:00_GST_GULF'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+04:00').setDescription('GET - Georgia Standard Time').setValue('UTC+04:00_GET'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+04:30').setDescription('AFT - Afghanistan Time').setValue('UTC+04:30_AFT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+05:00').setDescription('PKT - Pakistan Standard Time').setValue('UTC+05:00_PKT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+05:00').setDescription('TJT - Tajikistan Time').setValue('UTC+05:00_TJT')
      ]
    },
    {
      description: `Asia & Oceania`, timezoneOptions: [
        new StringSelectMenuOptionBuilder().setLabel('UTC+05:30').setDescription('IST - Indian Standard Time').setValue('UTC+05:30_IST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+05:45').setDescription('NPT - Nepal Time').setValue('UTC+05:45_NPT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+06:00').setDescription('BST - Bangladesh Standard Time').setValue('UTC+06:00_BST_BD'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+06:30').setDescription('MMT - Myanmar Standard Time').setValue('UTC+06:30_MMT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+07:00').setDescription('ICT - Indochina Time').setValue('UTC+07:00_ICT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+07:00').setDescription('WIB - Western Indonesian Time').setValue('UTC+07:00_WIB'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+08:00').setDescription('CST - China Standard Time').setValue('UTC+08:00_CST_CN'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+08:00').setDescription('AWST - Australian Western Standard Time').setValue('UTC+08:00_AWST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+08:00').setDescription('WITA - Central Indonesian Time').setValue('UTC+08:00_WITA'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+09:00').setDescription('JST - Japan Standard Time').setValue('UTC+09:00_JST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+09:00').setDescription('KST - Korea Standard Time').setValue('UTC+09:00_KST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+09:30').setDescription('ACST - Australian Central Standard Time').setValue('UTC+09:30_ACST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+10:30').setDescription('ACDT - Australian Central Daylight Time').setValue('UTC+10:30_ACDT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+10:00').setDescription('AEST - Australian Eastern Standard Time').setValue('UTC+10:00_AEST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+11:00').setDescription('AEDT - Australian Eastern Daylight Time').setValue('UTC+11:00_AEDT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+10:00').setDescription('VLAT - Vladivostok Time').setValue('UTC+10:00_VLAT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+11:00').setDescription('NCT - New Caledonia Time').setValue('UTC+11:00_NCT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+11:00').setDescription('SBT - Solomon Islands Time').setValue('UTC+11:00_SBT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+12:00').setDescription('NZST - New Zealand Standard Time').setValue('UTC+12:00_NZST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+13:00').setDescription('NZDT - New Zealand Daylight Time').setValue('UTC+13:00_NZDT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+12:00').setDescription('FJT - Fiji Time').setValue('UTC+12:00_FJT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+13:00').setDescription('TOT - Tonga Time').setValue('UTC+13:00_TOT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+13:45').setDescription('CHAST - Chatham Standard Time').setValue('UTC+13:45_CHAST'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+14:00').setDescription('LINT - Line Islands Time').setValue('UTC+14:00_LINT'),
        new StringSelectMenuOptionBuilder().setLabel('UTC+14:00').setDescription('TOST - Tonga Summer Time').setValue('UTC+14:00_TOST')
      ]
    }
  ]

  return timezones[regionIndex];
}