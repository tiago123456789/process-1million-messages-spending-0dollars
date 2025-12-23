import {
    Consumer,
    PostgresQueueDriver,
} from "npm:consumer-pgmq";
import { Client } from "npm:pg"
import axios from "npm:axios"

const sleep = (s) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve({}), s * 1000)
    })
}
let limiteRequestAccepted = 15
let totalRequests = 0

let consumers = []

async function cleanup() {
    for (let index = 0; index < consumers.length; index += 1) {
        await consumers[index].freeConsumer()
    }

}

Deno.addSignalListener("SIGINT", async () => {
    await cleanup();

});

Deno.addSignalListener("SIGTERM", async () => {
    await cleanup();
});


Deno.serve(
    async (req: Request) => {
        if (totalRequests >= limiteRequestAccepted) {
            return Response.json({})
        }

        totalRequests += 1
        console.log(totalRequests)

        try {


            const pgClient = new Client({
                host: process.env.POSTGRES_HOST,
                database: process.env.POSTGRES_DATABASE,
                password: process.env.POSTGRES_PASSWORD,
                port: Number(process.env.POSTGRES_PORT),
                user: process.env.POSTGRES_USER,
                ssl: true,
            })

            await pgClient.connect()


            const postgresQueueDriver = new PostgresQueueDriver(
                pgClient, "public", true
            )

            const consumer = new Consumer(
                {
                    queueName: 'jobs',
                    visibilityTime: 30,
                    consumeType: "read",
                    poolSize: 8,
                    timeMsWaitBeforeNextPolling: 1000,
                    enabledPolling: true,
                    queueNameDlq: "jobs_dlq",
                    totalRetriesBeforeSendToDlq: 2,
                    enableControlConsumer: true
                },
                async function (message: { [key: string]: any }, signal): Promise<void> {
                    await axios.get("https://httpbin.org/delay/3")

                    console.log(message)
                },
                postgresQueueDriver
            );

            consumers.push(consumer)

            consumer.on("send-to-dlq", (message: { [key: string]: any }) => {
                console.log("Send to DLQ =>", message)
            })

            consumer.on('error', (err: Error) => {
                console.error('Error consuming message:', err.message);
            });


            await consumer.start();
            return Response.json({})
        } catch (error) {
            await cleanup()
            console.error(error)
            return Response.json({})
        }

    },
);



