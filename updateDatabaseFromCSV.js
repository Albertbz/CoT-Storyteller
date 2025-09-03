import fs from 'node:fs';
import { parse } from 'csv-parse';
import { Players, Characters, Affiliations } from './dbObjects.js';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import data from './config.json' with { type: 'json'};


const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const __dirname = new URL(".", import.meta.url).pathname;

const processFile = async () => {
  const records = [];
  const parser = fs.createReadStream(`${__dirname}/data/activeCharacters.csv`).pipe(
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

      const affiliation = await Affiliations.findOne({ where: { name: record[3] } })
      console.log(affiliation.toJSON())
      const character = await Characters.create({
        name: record[2],
        affiliationId: affiliation.id,
        pveDeaths: record[4],
        yearOfMaturity: record[5]
      });

      await player.update({ characterId: character.id })

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