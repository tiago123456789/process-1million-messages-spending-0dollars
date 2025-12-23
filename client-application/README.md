## About

This project is study case to apply CrockroachDB as queue and created a library to publish and consumer the messages

## Features

- Consumer message from Supabase queue. PS: instructions to setup https://supabase.com/blog/supabase-queues
- Consumer message from Postgresql queue. PS: instructions to setup https://github.com/pgmq/pgmq
- Support for both read and pop consume types
  - Read consume type is when the consumer gets the message and the message is not deleted from queue until the callback is executed with success.
  - Pop consume type is when the consumer gets the message and the message is deleted from queue.
- Support for both Supabase and Postgresql
- Support for both visibility time and pool size

## Installation

- Using pnpm

```bash
pnpm install consumer-pgmq
```

- Using npm

```bash
npm install consumer-pgmq
```

- Using yarn

```bash
yarn add consumer-pgmq
```

## Options

- queueName: The name of the queue.
- visibilityTime: The time in seconds that the message will be invisible to other consumers. PS:
  - Your handler must finish in this time or the message will be visible again to other consumers.
  - Is used too to abort the message if the handler takes too long to finish. For example, if you set visibilityTime to 15 seconds and your handler didnt finish in 15 seconds the handler will be aborted and the message will be visible again to other consumers.
- consumeType: The type of consume. Can be "read" or "pop"
  - Read consume type is when the consumer gets the message and the message is not deleted from queue until the callback is executed with success.
  - Pop consume type is when the consumer gets the message and delete from queue in the moment get the message.
- poolSize: The number of consumers. PS: this is the number of consumers that will be created to consume the messages and
  if you use read consume type, the pool size is the number of messages will get at the same time.
- timeMsWaitBeforeNextPolling: The time in milliseconds to wait before the next polling
- enabledPolling: The enabled polling. PS: if true, the consumer will poll the message, if false, the consumer will consume the message one time and stop. PS: is required to the versions more than 1.0.5.
- queueNameDlq: The name of the dead letter queue. PS: recommended to set the same name of the queue, but suffix with '\_dlq'. For example: **messages_dlq**
- totalRetriesBeforeSendToDlq: The total retries before send to dlq. For example: if you set totalRetriesBeforeSendToDlq equal 2, the message will be sent to dlq if the handler fails 2 times, so the third time the message will be sent to dlq and remove the main queue to avoid infinite retries.

## Extra points to know when use the dlq feature

- The dead letter queue no work If you setted the consumerType option with value 'pop', because the pop get the message and remove from queue at same time, so if failed when you are processing you lose the message.
- Recommendation no set lower value to the option 'visibilityTime' if you are using the dead letter queue feature. For example: set visibilityTime value lower than 30 seconds, because if the message wasn't delete and the message be available again the consumer application can consume the message again.

## Events

- finish: When the message is consumed with success
- abort-error: When the message is aborted
- error: When an error occurs

## Examples how to use

- Consuming messages from Supabase queue

```javascript
import { config } from "dotenv"
config()

import { SupabaseQueueDriver, Consumer } from "consumer-pgmq"
import { createClient, SupabaseClient } from '@supabase/supabase-js';


const supabase = createClient(
    // @ts-ignore
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
        db: {
            schema: 'pgmq_public'
        }
    }
);

const supabaseQueueDriver = new SupabaseQueueDriver(
    supabase as unknown as SupabaseClient
)


import timersPromises from "node:timers/promises";

async function start() {
    for (let i = 0; i < 200; i++) {
        await supabase.rpc("send", {
            queue_name: "subscriptions",
            message: { "message": `Message triggered at ${Date.now()}` }
        });
    }
    console.log("Total messages sent: ", 200)

    const consumer = new Consumer(
        {
            queueName: 'subscriptions',
            visibilityTime: 30,
            consumeType: "read",
            poolSize: 8,
            timeMsWaitBeforeNextPolling: 1000,
            enabledPolling: true,
            queueNameDlq: "subscriptions_dlq",
            totalRetriesBeforeSendToDlq: 2
        },
        async function (message: { [key: string]: any }, signal): Promise<void> {
            try {
                console.log(message)
                const url = "https://jsonplaceholder.typicode.com/todos/1";
                await timersPromises.setTimeout(100, null, { signal });
                console.log("Fetching data...");
                const response = await fetch(url, { signal });
                const todo = await response.json();
                console.log("Todo:", todo);
            } catch (error: any) {
                if (error.name === "AbortError") {
                    console.log("Operation aborted");
                } else {
                    console.error("Error:", error);
                }
            }
        },
        supabaseQueueDriver
    );

    consumer.on('finish', (message: { [key: string]: any }) => {
        console.log('Consumed message =>', message);
    });

    consumer.on("abort-error", (err) => {
        console.log("Abort error =>", err)
    })

    consumer.on('error', (err: Error) => {
        if (err.message.includes("TypeError: fetch failed")) {
            console.log(err)
            process.exit(1);
        }
        console.error('Error consuming message:', err.message);
    });

    consumer.start();

}

start()
```

- Consuming messages from Postgresql queue

```javascript
import { config } from "dotenv"
config()

import Consumer from '../src/consumer';
import PostgresQueueDriver from '../src/queueDriver/PostgresQueueDriver';

import { Client } from 'pg'

async function start() {

    const pgClient = new Client({
        host: process.env.POSTGRES_HOST,
        database: process.env.POSTGRES_DATABASE,
        password: process.env.POSTGRES_PASSWORD,
        port: Number(process.env.POSTGRES_PORT),
        user: process.env.POSTGRES_USER,
        ssl: false,
    })

    await pgClient.connect()


    const postgresQueueDriver = new PostgresQueueDriver(
        pgClient, "pgmq"
    )

    const consumer = new Consumer(
        {
            queueName: 'subscriptions',
            visibilityTime: 30,
            consumeType: "read",
            poolSize: 8,
            timeMsWaitBeforeNextPolling: 1000,
            enabledPolling: true,
            queueNameDlq: "subscriptions_dlq",
            totalRetriesBeforeSendToDlq: 2
        },
        async function (message: { [key: string]: any }, signal): Promise<void> {
            try {
                console.log(message)
                const url = "https://jsonplaceholder.typicode.com/todos/1";
                await timersPromises.setTimeout(100, null, { signal });
                console.log("Fetching data...");
                const response = await fetch(url, { signal });
                const todo = await response.json();
                console.log("Todo:", todo);
            } catch (error: any) {
                if (error.name === "AbortError") {
                    console.log("Operation aborted");
                } else {
                    console.error("Error:", error);
                }
            }
        },
        postgresQueueDriver
    );

    consumer.on('finish', (message: { [key: string]: any }) => {
        console.log('Consumed message =>', message);
    });

    consumer.on("abort-error", (err) => {
        console.log("Abort error =>", err)
    })

    consumer.on('error', (err: Error) => {
        if (err.message.includes("TypeError: fetch failed")) {
            console.log(err)
            process.exit(1);
        }
        console.error('Error consuming message:', err.message);
    });

    consumer.start();

}

start()
```
