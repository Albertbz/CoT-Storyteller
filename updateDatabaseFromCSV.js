import fs from 'node:fs';
import { parse } from 'csv-parse';
// const fs = require('node:fs');
// const parse = require('csv-parse');
import { Players, Characters, ActiveCharacters } from './dbObjects.js';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import data from './config.json' with { type: 'json'};


const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const __dirname = new URL(".", import.meta.url).pathname;

const processFile = async () => {
  const records = [];
  const parser = fs.createReadStream(`${__dirname}/activeCharacters.csv`).pipe(
    parse({
      // CSV options if any
    }),
  );
  for await (const record of parser) {
    try {
      // const playerId = await client.users.fetch(record[0]);
      const player = await Players.create({
        id: record[0],
        ign: record[1]
      });

      const character = await Characters.create({
        name: record[2],
        affiliation: record[3],
        pveDeaths: record[4],
        yearOfMaturity: record[5]
      });

      const activeCharacter = await ActiveCharacters.create({
        playerId: player.id,
        characterId: character.id
      });

    } catch (error) {
      console.log(error);
    }
    // Work with each record
    records.push(record);
  }
  return records;
};

(async () => {
  // Log in to Discord with your client's token
  client.login(data.token);
  const records = await processFile();
  console.info(records);
})();