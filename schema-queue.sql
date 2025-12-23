CREATE TYPE job_status AS ENUM ('pending', 'in_progress');

CREATE TYPE worker_status AS ENUM ('idle', 'working');

CREATE TABLE workers (
    id SERIAL PRIMARY KEY,
    status worker_status NOT NULL DEFAULT 'idle', -- Tracks the job lifecycle
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    status job_status NOT NULL DEFAULT 'pending', -- Tracks the job lifecycle
    payload JSONB, -- Chose payload as `jsonb` but could have gone with `bytea` instead.
    visible_at TIMESTAMP DEFAULT now(), -- SQS visibility timeout (will come back to this later)
    retry_count INT DEFAULT 0, -- Tracks retry attempts
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE jobs_dlq (
    id SERIAL PRIMARY KEY,
    status job_status NOT NULL DEFAULT 'pending', -- Tracks the job lifecycle
    payload JSONB, -- Chose payload as `jsonb` but could have gone with `bytea` instead.
    visible_at TIMESTAMP DEFAULT now(), -- SQS visibility timeout (will come back to this later)
    retry_count INT DEFAULT 0, -- Tracks retry attempts
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

WITH next_workers AS (
            SELECT id
            FROM workers as w
            WHERE
                status = 'idle'
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        )
        UPDATE workers
        SET status = 'working',
            updated_at = now()
        FROM next_workers
        WHERE workers.id = next_workers.id   
        RETURNING workers.*;

CREATE INDEX ON public.workers (status);

insert into workers(status) 
    values 
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle'),
    ('idle');

    