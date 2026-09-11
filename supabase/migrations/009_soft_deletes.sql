-- Add soft delete support to core tables
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE modal_maps ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE modal_map_components ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
