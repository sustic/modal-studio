-- ── project_components ────────────────────────────────────────────────────────
-- Reusable component templates scoped to a project. Engineers define components
-- once here and stamp them into modal maps as modal_map_components.

create table project_components (
  id              uuid        primary key default gen_random_uuid(),
  project_id      uuid        not null references projects (id) on delete cascade,
  organisation_id uuid        not null references organisations (id) on delete cascade,
  name            text        not null,
  description     text,
  created_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table project_components enable row level security;

-- ── project_component_frequency_ranges ────────────────────────────────────────
-- One or more frequency bands per project component template.
-- base_low/base_high: the nominal operating range.
-- safe_low/safe_high: optional wider tolerance band.

create table project_component_frequency_ranges (
  id                   uuid    primary key default gen_random_uuid(),
  project_component_id uuid    not null references project_components (id) on delete cascade,
  base_low             numeric not null,
  base_high            numeric not null,
  safe_low             numeric,
  safe_high            numeric
);

alter table project_component_frequency_ranges enable row level security;

-- ── modal_map_components ──────────────────────────────────────────────────────
-- Component instances within a specific modal map. Each row is one row in the
-- workplace grid. May originate from a project_components template
-- (source_template_id) or be created ad-hoc (source_template_id is null).

create table modal_map_components (
  id                 uuid        primary key default gen_random_uuid(),
  modal_map_id       uuid        not null references modal_maps (id) on delete cascade,
  project_id         uuid        not null references projects (id) on delete cascade,
  organisation_id    uuid        not null references organisations (id) on delete cascade,
  name               text        not null,
  description        text,
  -- Nullable: no cascade so deleting a template does not delete map instances.
  source_template_id uuid        references project_components (id) on delete set null,
  display_order      integer     not null default 0,
  created_by         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table modal_map_components enable row level security;

-- ── modal_map_component_frequency_ranges ──────────────────────────────────────
-- Frequency bands for a specific modal map component instance. Independent of
-- the template ranges so engineers can adjust per-map without affecting the
-- project library.

create table modal_map_component_frequency_ranges (
  id                      uuid    primary key default gen_random_uuid(),
  modal_map_component_id  uuid    not null references modal_map_components (id) on delete cascade,
  base_low                numeric not null,
  base_high               numeric not null,
  safe_low                numeric,
  safe_high               numeric
);

alter table modal_map_component_frequency_ranges enable row level security;

-- ── indexes ───────────────────────────────────────────────────────────────────

create index project_components_project_id_idx
  on project_components (project_id);

create index project_component_frequency_ranges_component_id_idx
  on project_component_frequency_ranges (project_component_id);

create index modal_map_components_modal_map_id_idx
  on modal_map_components (modal_map_id);

create index modal_map_components_display_order_idx
  on modal_map_components (modal_map_id, display_order);

create index modal_map_component_frequency_ranges_component_id_idx
  on modal_map_component_frequency_ranges (modal_map_component_id);
