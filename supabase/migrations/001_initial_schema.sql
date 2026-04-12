-- ============================================================
-- 001_initial_schema.sql
-- ============================================================

-- ------------------------------------------------------------
-- organisations
-- ------------------------------------------------------------
CREATE TABLE organisations (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  slug         text        NOT NULL UNIQUE,
  description  text,
  allowed_domain text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- organisation_members
-- ------------------------------------------------------------
CREATE TABLE organisation_members (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  clerk_user_id    text        NOT NULL,
  email            text        NOT NULL,
  role             text        NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE organisation_members ENABLE ROW LEVEL SECURITY;

-- One membership per user per organisation
CREATE UNIQUE INDEX organisation_members_org_user_idx
  ON organisation_members (organisation_id, clerk_user_id);

-- ------------------------------------------------------------
-- invitations
-- ------------------------------------------------------------
CREATE TABLE invitations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  email            text        NOT NULL,
  role             text        NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by       text,
  token            text        UNIQUE,
  accepted         boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
