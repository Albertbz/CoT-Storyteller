function formatCharacterName(name) {
  return `***__${name}__***`;
}

const timezoneMap = {
  'UTC-12:00_BIT': 'UTC-12:00 (BIT - Baker Island Time)',
  'UTC-11:00_SST': 'UTC-11:00 (SST - Samoa Standard Time)',
  'UTC-10:00_HST': 'UTC-10:00 (HST - Hawaii-Aleutian Standard Time)',
  'UTC-09:00_AKST': 'UTC-09:00 (AKST - Alaska Standard Time)',
  'UTC-08:00_AKDT': 'UTC-08:00 (AKDT - Alaska Daylight Time)',
  'UTC-08:00_PST': 'UTC-08:00 (PST - Pacific Standard Time)',
  'UTC-07:00_PDT': 'UTC-07:00 (PDT - Pacific Daylight Time)',
  'UTC-07:00_MST': 'UTC-07:00 (MST - Mountain Standard Time)',
  'UTC-06:00_MDT': 'UTC-06:00 (MDT - Mountain Daylight Time)',
  'UTC-06:00_CST': 'UTC-06:00 (CST - Central Standard Time)',
  'UTC-05:00_CDT': 'UTC-05:00 (CDT - Central Daylight Time)',
  'UTC-05:00_EST': 'UTC-05:00 (EST - Eastern Standard Time)',
  'UTC-04:00_EDT': 'UTC-04:00 (EDT - Eastern Daylight Time)',
  'UTC-04:00_AST': 'UTC-04:00 (AST - Atlantic Standard Time)',
  'UTC-03:00_ADT': 'UTC-03:00 (ADT - Atlantic Daylight Time)',
  'UTC-03:30_NST': 'UTC-03:30 (NST - Newfoundland Standard Time)',
  'UTC-02:30_NDT': 'UTC-02:30 (NDT - Newfoundland Daylight Time)',
  'UTC-03:00_ART': 'UTC-03:00 (ART - Argentina Time)',
  'UTC-03:00_BRT': 'UTC-03:00 (BRT - Brasília Time)',
  'UTC-02:00_GST_SA': 'UTC-02:00 (GST - South Georgia Time)',
  'UTC-01:00_CVT': 'UTC-01:00 (CVT - Cape Verde Time)',
  'UTC±00:00_GMT': 'UTC±00:00 (GMT/UTC - Greenwich Mean Time)',
  'UTC±00:00_WET': 'UTC±00:00 (WET - Western European Time)',
  'UTC+01:00_WEST': 'UTC+01:00 (WEST - Western European Summer Time)',
  'UTC+01:00_BST_UK': 'UTC+01:00 (BST - British Summer Time)',
  'UTC+01:00_CET': 'UTC+01:00 (CET - Central European Time)',
  'UTC+01:00_WAT': 'UTC+01:00 (WAT - West Africa Time)',
  'UTC+02:00_CEST': 'UTC+02:00 (CEST - Central European Summer Time)',
  'UTC+02:00_EET': 'UTC+02:00 (EET - Eastern European Time)',
  'UTC+02:00_CAT': 'UTC+02:00 (CAT - Central Africa Time)',
  'UTC+02:00_SAST': 'UTC+02:00 (SAST - South African Standard Time)',
  'UTC+03:00_EEST': 'UTC+03:00 (EEST - Eastern European Summer Time)',
  'UTC+03:00_MSK': 'UTC+03:00 (MSK - Moscow Standard Time)',
  'UTC+03:00_AST_ARABIA': 'UTC+03:00 (AST - Arabia Standard Time)',
  'UTC+03:00_EAT': 'UTC+03:00 (EAT - East Africa Time)',
  'UTC+03:30_IRST': 'UTC+03:30 (IRST - Iran Standard Time)',
  'UTC+04:30_IRDT': 'UTC+04:30 (IRDT - Iran Daylight Time)',
  'UTC+04:00_GST_GULF': 'UTC+04:00 (GST - Gulf Standard Time)',
  'UTC+04:00_GET': 'UTC+04:00 (GET - Georgia Standard Time)',
  'UTC+04:30_AFT': 'UTC+04:30 (AFT - Afghanistan Time)',
  'UTC+05:00_PKT': 'UTC+05:00 (PKT - Pakistan Standard Time)',
  'UTC+05:00_TJT': 'UTC+05:00 (TJT - Tajikistan Time)',
  'UTC+05:30_IST': 'UTC+05:30 (IST - Indian Standard Time)',
  'UTC+05:45_NPT': 'UTC+05:45 (NPT - Nepal Time)',
  'UTC+06:00_BST_BD': 'UTC+06:00 (BST - Bangladesh Standard Time)',
  'UTC+06:30_MMT': 'UTC+06:30 (MMT - Myanmar Standard Time)',
  'UTC+07:00_ICT': 'UTC+07:00 (ICT - Indochina Time)',
  'UTC+07:00_WIB': 'UTC+07:00 (WIB - Western Indonesian Time)',
  'UTC+08:00_CST_CN': 'UTC+08:00 (CST - China Standard Time)',
  'UTC+08:00_AWST': 'UTC+08:00 (AWST - Australian Western Standard Time)',
  'UTC+08:00_WITA': 'UTC+08:00 (WITA - Central Indonesian Time)',
  'UTC+09:00_JST': 'UTC+09:00 (JST - Japan Standard Time)',
  'UTC+09:00_KST': 'UTC+09:00 (KST - Korea Standard Time)',
  'UTC+09:30_ACST': 'UTC+09:30 (ACST - Australian Central Standard Time)',
  'UTC+10:30_ACDT': 'UTC+10:30 (ACDT - Australian Central Daylight Time)',
  'UTC+10:00_AEST': 'UTC+10:00 (AEST - Australian Eastern Standard Time)',
  'UTC+11:00_AEDT': 'UTC+11:00 (AEDT - Australian Eastern Daylight Time)',
  'UTC+10:00_VLAT': 'UTC+10:00 (VLAT - Vladivostok Time)',
  'UTC+11:00_NCT': 'UTC+11:00 (NCT - New Caledonia Time)',
  'UTC+11:00_SBT': 'UTC+11:00 (SBT - Solomon Islands Time)',
  'UTC+12:00_NZST': 'UTC+12:00 (NZST - New Zealand Standard Time)',
  'UTC+13:00_NZDT': 'UTC+13:00 (NZDT - New Zealand Daylight Time)',
  'UTC+12:00_FJT': 'UTC+12:00 (FJT - Fiji Time)',
  'UTC+13:00_TOT': 'UTC+13:00 (TOT - Tonga Time)',
  'UTC+13:45_CHAST': 'UTC+13:45 (CHAST - Chatham Standard Time)',
  'UTC+14:00_LINT': 'UTC+14:00 (LINT - Line Islands Time)',
  'UTC+14:00_TOST': 'UTC+14:00 (TOST - Tonga Summer Time)'
};

function getFullTimezoneString(value) {
  return timezoneMap[value] || `*None*`;
}


module.exports = {
  formatCharacterName,
  getFullTimezoneString
}