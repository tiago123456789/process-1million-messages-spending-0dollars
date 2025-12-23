import knex from "npm:knex";
import pgClient from "npm:pg"; // No remove because knex needs the pg driver to work
import axios from "npm:axios";

const knexInstance = knex({
  client: "pg",
  connection: {
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DATABASE,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    port: Number(process.env.POSTGRES_PORT),
    ssl: true,
  },
});

export default async function (req: Request): Promise<Response> {
  const messages = await knexInstance.raw(`
     SELECT id
            FROM jobs
            WHERE
                (
                    status = 'pending'
                    OR (status = 'in_progress' AND visible_at <= now())
                )
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        
  `);

  if (messages.rows.length === 0) {
    console.log("no messages found");
    await knexInstance.raw(`
            WITH next_workers AS (
            SELECT id
            FROM workers as w
            WHERE
                status = 'working'
                
            LIMIT 40
            FOR UPDATE SKIP LOCKED
        )
        UPDATE workers
        SET status = 'idle',
            updated_at = now()
        FROM next_workers
        WHERE workers.id = next_workers.id   
        RETURNING workers.id;
  `);
    return Response.json({ ok: true });
  }

  const totalWorkersWorking = (await knexInstance.raw(`
            WITH next_workers AS (
            SELECT id
            FROM workers as w
            WHERE
                status = 'working'  
            LIMIT 40
            FOR UPDATE SKIP LOCKED
        )
        SELECT id FROM next_workers;
  `)).rows;

  console.log(totalWorkersWorking);

  const totalWorkersStart = 40 - totalWorkersWorking.length;

  if (totalWorkersStart <= 0) {
    console.log("no create workers");
    return Response.json({ ok: true });
  }
  const listUrls = [
    "url_function_consumer_here",
    "url_function_consumer_here",
    "url_function_consumer_here",
    "url_function_consumer_here",
  ];
  let position = 0;
  for (let index = 0; index < totalWorkersStart; index++) {
    let url = listUrls[position];
    if (url === undefined) {
      position = 0;
      url = listUrls[position];
    }
    position += 1;
    // To improve the security add api-key on request's header to validate the request on function consumer
    axios.get(
      url,
    );
  }
  return Response.json({ ok: true });
}