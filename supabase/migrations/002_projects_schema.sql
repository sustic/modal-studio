-- ============================================================
-- 002_projects_schema.sql
-- ============================================================

-- ------------------------------------------------------------
-- projects
-- ------------------------------------------------------------
CREATE TABLE projects (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  slug             text        NOT NULL,
  description      text,
  created_by       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, slug)
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- modal_maps
-- ------------------------------------------------------------
CREATE TABLE modal_maps (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organisation_id  uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  description      text,
  created_by       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE modal_maps ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- components
-- ------------------------------------------------------------
CREATE TABLE components (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  modal_map_id     uuid        NOT NULL REFERENCES modal_maps(id) ON DELETE CASCADE,
  organisation_id  uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  description      text,
  created_by       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE components ENABLE ROW LEVEL SECURITY;
