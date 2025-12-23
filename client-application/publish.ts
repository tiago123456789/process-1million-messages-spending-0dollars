import { config } from "dotenv";
config();

import { PostgresQueueDriver } from "consumer-pgmq"
import { Client } from "pg"

async function start() {
  const pgClient = new Client({
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DATABASE,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    port: Number(process.env.POSTGRES_PORT) || 26257,
    ssl: true,
  })

  await pgClient.connect()


  const queueDriver = new PostgresQueueDriver(
    pgClient, "public", true
  )

  console.time("send-messages");
  let messages: { [key: string]: any }[] = [];
  let itemsPerMessage = [];
  for (let index = 0; index < 1000000; index++) {
    itemsPerMessage.push({
      email: `test${index}@gmail.com`,
      message: "Hello, CrockroachDB!"
    });

    if (itemsPerMessage.length == 100) {
      messages.push({ items: itemsPerMessage });
      itemsPerMessage = [];
    }

    if (messages.length == 2000) {
      console.log(`Sending message ${messages.length}`);
      await queueDriver.sendBatch("jobs", messages);
      messages = [];
    }
  }

  if (messages.length > 0) {
    console.log(`Sending message ${messages.length}`);
    await queueDriver.sendBatch("jobs", messages);
  }

  console.timeEnd("send-messages");
}

start();
