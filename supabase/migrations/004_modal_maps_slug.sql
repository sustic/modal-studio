ALTER TABLE modal_maps ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS modal_maps_project_slug_unique
  ON modal_maps (project_id, slug);
