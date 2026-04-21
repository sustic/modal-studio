-- Collaboration locking tables for modal map and component editing.
-- A lock is considered stale if last_heartbeat < now() - interval '5 minutes'.

-- ── modal_map_locks ────────────────────────────────────────────────────────────
-- One row per modal map being actively edited. Unique constraint ensures only
-- one user can hold the lock at a time.

create table modal_map_locks (
  id              uuid        primary key default gen_random_uuid(),
  modal_map_id    uuid        not null unique references modal_maps (id) on delete cascade,
  locked_by       text        not null,
  locked_by_name  text,
  locked_at       timestamptz not null default now(),
  last_heartbeat  timestamptz not null default now()
);

alter table modal_map_locks enable row level security;

-- ── component_locks ────────────────────────────────────────────────────────────
-- One row per component being actively edited. modal_map_id is denormalised here
-- so queries can efficiently find all locked components within a given map.

create table component_locks (
  id              uuid        primary key default gen_random_uuid(),
  component_id    uuid        not null unique references components (id) on delete cascade,
  modal_map_id    uuid        not null references modal_maps (id) on delete cascade,
  locked_by       text        not null,
  locked_by_name  text,
  locked_at       timestamptz not null default now(),
  last_heartbeat  timestamptz not null default now()
);

alter table component_locks enable row level security;

-- ── indexes ────────────────────────────────────────────────────────────────────
-- Speed up heartbeat-based staleness checks and per-map lock queries.

create index component_locks_modal_map_id_idx on component_locks (modal_map_id);
create index modal_map_locks_last_heartbeat_idx on modal_map_locks (last_heartbeat);
create index component_locks_last_heartbeat_idx on component_locks (last_heartbeat);
