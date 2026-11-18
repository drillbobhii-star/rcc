CREATE TABLE IF NOT EXISTS workbench_preferences (
  id uuid PRIMARY KEY,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  profiles text[] NOT NULL DEFAULT '{}'
);
