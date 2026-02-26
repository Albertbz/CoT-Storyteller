# CoT-Storyteller

A Discord bot for managing storyteller spreadsheets, character data, and player information for a roleplay community.

## Overview

CoT-Storyteller is a comprehensive Discord bot that handles character creation, player management, relationships, offspring rolls, death rolls, and region/house management for a storytelling/roleplay server. The bot maintains a SQLite database synchronized with Google Sheets and provides slash commands for storytellers to manage game data.

## Features

- **Player Management**: Create and manage player profiles with Discord integration
- **Character System**: Full character lifecycle management including creation, modification, and death tracking
- **Relationship Tracking**: Manage character relationships and offspring
- **Roll Systems**: 
  - Offspring rolls (intercharacter and NPC)
  - Death rolls with age-based modifiers
- **Region & House Management**: Track regions, ruling houses, vassals, and steelbearers
- **Recruitment System**: Automated recruitment post updates based on region needs
- **Spreadsheet Sync**: Synchronization with Google Sheets
- **Playable Children**: System for managing child characters with contacts

## Project Structure

```
.
├── commands/          # Slash command modules
│   ├── utility/      # Main gameplay commands
│   └── testing/      # Development/testing commands
├── events/           # Discord.js event handlers
├── models/           # Sequelize database models
├── buttons/          # Button interaction handlers
├── modals/           # Modal interaction handlers
├── stringselectmenus/# String select menu handlers
├── helpers/          # Utility functions (confirmations, rolls, etc.)
├── configs/          # Configuration files (token, IDs)
├── migrations/       # Database migrations
├── seeders/          # Database seeders
└── images/           # Bot assets
```

## Setup

### Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn
- Discord Bot Token
- Google Service Account credentials (for Sheets integration)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Albertbz/CoT-Storyteller.git
   cd CoT-Storyteller
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure the bot:
   - Create `configs/config.json` with your Discord credentials:
     ```json
     {
       "token": "YOUR_DISCORD_BOT_TOKEN",
       "clientId": "YOUR_CLIENT_ID",
       "guildId": "YOUR_GUILD_ID"
     }
     ```
   - Update `configs/ids.json` with your role and channel IDs
   - Place your Google Service Account JSON in `configs/`

4. Initialize the database:
   ```bash
   node dbInit.js --force
   ```

5. Deploy slash commands:
   ```bash
   node deploy-commands.js
   ```

6. Start the bot:
   ```bash
   node index.js
   ```

## Key Commands

### Player & Character Management
- `/create player` - Create a new player with optional character
- `/create character` - Create a new character
- `/assign character` - Assign a character to a player
- `/unassign character` - Unassign a character from a player
- `/info player` - Get player information
- `/info character` - Get character information

### Relationships & Children
- `/create relationship` - Create a relationship (intercharacter roll) between characters
- `/change child` - Modify playable child data

### Rolls
- `/start_rolls offspring` - Begin offspring roll sequence
- `/start_rolls death` - Begin death roll sequence
- `/roll offspring` - Single offspring roll

### Region & House Management
- `/create house` - Create a new house
- `/create vassal` - Create vassal-liege relationship
- `/assign steelbearer` - Assign a steelbearer to a region
- `/change region` - Modify region data
- `/change year` - Advance the world year

### Administrative
- `/deceased` - Mark a character as deceased
- `/purge` - Clean up inactive players (requires files)
- `/clear_log` - Clear storyteller log channel
- `/sendmanagerguimessage` - Send character/region manager GUI

## Database Models

The bot uses Sequelize with SQLite. Key models include:

- **Players**: Discord users with IGN and timezone
- **Characters**: Game characters with stats, region, house, social class
- **Relationships**: Breeding pairs for offspring rolls
- **PlayableChildren**: Child characters awaiting players
- **Regions**: Territories with populations and recruitment needs
- **Houses**: Noble houses with emoji identifiers
- **Vassals**: Vassal-liege relationships between regions
- **Steelbearers**: Special character assignments to regions
- **Deceased**: Death records with dates and causes
- **DeathRollDeaths**: Queue for processing death roll results

## Development

### Adding a New Command

1. Create a file in `commands/<category>/commandname.js`
2. Export `data` (SlashCommandBuilder) and `execute` function:
   ```javascript
   module.exports = {
     data: new SlashCommandBuilder()
       .setName('commandname')
       .setDescription('Description'),
     async execute(interaction) {
       // Command logic
     }
   };
   ```
3. Run `node deploy-commands.js` to register the command

### Database Changes

- Modify models in `models/`
- Use `node dbInit.js --force` to recreate the database (development only)
- For production, create migrations in `migrations/`

### Event Handlers

Place event files in `events/` exporting:
```javascript
module.exports = {
  name: 'eventName',
  once: false, // or true for one-time events
  execute(/* args */) {
    // Event logic
  }
};
```

## Automated Tasks

The bot includes scheduled cron jobs:

- **Daily (00:00 UTC)**: Update recruitment post
- **Hourly**: Sync database with Google Sheets (if changes detected)

## Error Handling

- Commands defer replies for long operations
- Ephemeral error messages sent to users
- Errors logged to console
- Log channel receives formatted notifications for major events

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow existing code patterns
4. Test thoroughly with `node dbInit.js --force` in development
5. Submit a pull request

## License

This project is open-source and available under the [MIT License](LICENSE). 

You are entirely free to copy, modify, and use this bot for your own servers or projects! However, if you use my code, please provide credit. You can do this by linking back to this repository or mentioning my GitHub username in your project's README or your bot's "about" command.

## Support

For issues or questions, please open an issue on GitHub or contact the development team.

## Acknowledgments

- Built with [discord.js](https://discord.js.org/)
- Database powered by [Sequelize](https://sequelize.org/)
- Google Sheets integration via [node-google-spreadsheet](https://www.npmjs.com/package/google-spreadsheet)