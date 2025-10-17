This repository is a Discord bot (CoT-Storyteller) that manages storyteller spreadsheets and user/character data.

Key things an AI coding agent should know to be productive here:

- Big picture
  - index.js boots a discord.js Client, loads commands from `commands/*` and events from `events/*`, and logs in with `configs/config.json` token.
  - Commands follow the discord.js slash-command pattern: each command module exports `data` (SlashCommandBuilder) and `execute` (and optionally `autocomplete`). See `commands/utility/create.js` for an example.
  - `deploy-commands.js` collects `data.toJSON()` from each command and registers them to the guild via discord.js REST. Run this when you add or change slash commands.
  - Database models live under `models/` and are wired up in `dbInit.js` and `dbObjects.js` (the latter exports initialized model references used across commands).

- Developer workflows (commands you will run)
  - Start bot locally: node index.js (ensure `configs/config.json` has a valid token)
  - Deploy commands to the guild: node deploy-commands.js
  - Initialize/seed sqlite DB: node dbInit.js (use `--force` or `-f` to recreate)
  - There are no test scripts defined in `package.json`.

- Important config & secrets
  - `configs/config.json` contains `token`, `clientId`, `guildId`, and `cotGuildId` used by the bot and deploy script.
  - `configs/ids.json` maps role and channel IDs used throughout the codebase (Affiliations, channels, guild ids). Update carefully.

- Conventions and patterns (explicit, discoverable rules)
  - Command modules MUST export `data` and `execute`. Missing either is logged in `index.js` / `deploy-commands.js`.
  - Event modules export `{ name, once?, execute }` and are registered in `index.js`.
  - Database access is via Sequelize; shared model references come from `dbObjects.js` — prefer using those instead of requiring models directly.
  - Use `interaction.deferReply({ flags: MessageFlags.Ephemeral })` for long-running operations and `interaction.editReply()` after completion (see `commands/utility/create.js`).
  - Autocomplete handlers use `interaction.options.getFocused()` and must respond via `interaction.respond(choices)`.

- Error handling style
  - Most command/event code logs to console and returns ephemeral error messages to the user. Follow existing patterns: catch errors, console.error, and reply/followUp with ephemeral message.

- Integration points
  - Discord API via `discord.js` (commands, events, REST). Key files: `index.js`, `deploy-commands.js`, `events/`, `commands/`.
  - Google Sheets integrations are present (`google-spreadsheet`, `sheets.js`) — if modifying sheet sync, inspect `sheets.js` and `updateDatabaseFromCSV.js`.
  - SQLite via `sequelize` and `sqlite3` — database file is `database.sqlite` in repo root.

- Quick examples to follow or copy
  - Adding a new slash command: create `commands/<category>/newcommand.js` exporting `data` (SlashCommandBuilder) and `execute(interaction)`. Then run `node deploy-commands.js`.
  - Reading an affiliation by name/id: use `Affiliations.findOne({ where: { id: affiliationId } })` (see `commands/utility/create.js`).
  - Seeding DB: run `node dbInit.js --force` to recreate schema and seed initial affiliations and social classes.

- Files to inspect when changing behavior
  - `index.js` — command & event loading, login flow
  - `deploy-commands.js` — command registration
  - `dbInit.js`, `dbObjects.js`, `models/*.js` — DB schema and seeds
  - `commands/utility/create.js` — example of complex subcommands, autocomplete, and DB operations
  - `events/interactionCreate.js` — central command dispatch and error handling

If anything here is unclear or you'd like more examples (e.g., a new command scaffold, DB migration patterns, or testing setup), tell me which area to expand and I'll iterate.
