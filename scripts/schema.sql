-- Arrows Phase 2 schema. Timestamps are ISO 8601 text, matching /lib/types.
-- The darts table is the event log (ADR 0003): append-only, tail-delete on
-- undo, never updated. seq gives the log a total order.

CREATE TABLE IF NOT EXISTS players (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  is_bot boolean NOT NULL,
  bot_profile_id text,
  user_id text,
  created_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS bot_profiles (
  id text PRIMARY KEY,
  name text NOT NULL,
  target_average real NOT NULL,
  scoring_sigma_mm real,
  double_sigma_mm real,
  description text NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  player_id text NOT NULL,
  started_at text NOT NULL,
  ended_at text,
  note text
);

CREATE TABLE IF NOT EXISTS games (
  id text PRIMARY KEY,
  session_id text NOT NULL,
  mode text NOT NULL,
  config jsonb NOT NULL,
  participant_player_ids jsonb NOT NULL,
  started_at text NOT NULL,
  ended_at text,
  abandoned boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS legs (
  id text PRIMARY KEY,
  game_id text NOT NULL,
  "index" integer NOT NULL,
  starting_score integer,
  starting_player_id text NOT NULL,
  winner_player_id text
);

CREATE TABLE IF NOT EXISTS visits (
  id text PRIMARY KEY,
  leg_id text NOT NULL,
  player_id text NOT NULL,
  "index" integer NOT NULL,
  bust boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS darts (
  id text PRIMARY KEY,
  seq bigserial,
  visit_id text NOT NULL,
  "index" integer NOT NULL,
  segment integer NOT NULL,
  ring text NOT NULL,
  score integer NOT NULL,
  target_segment integer,
  target_ring text,
  thrown_at text NOT NULL,
  latency_ms integer
);

CREATE TABLE IF NOT EXISTS practice_game_definitions (
  key text PRIMARY KEY,
  name text NOT NULL,
  blurb text NOT NULL,
  target_type text NOT NULL,
  rules jsonb NOT NULL,
  scoring_model text NOT NULL,
  personal_best_direction text NOT NULL
);

CREATE TABLE IF NOT EXISTS training_sessions (
  id text PRIMARY KEY,
  program_id text NOT NULL,
  session_index integer NOT NULL,
  week integer NOT NULL,
  kind text NOT NULL,
  started_at text NOT NULL,
  completed_at text,
  block_game_ids jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS results (
  id text PRIMARY KEY,
  game_id text NOT NULL,
  player_id text NOT NULL,
  metrics jsonb NOT NULL,
  computed_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_games_session ON games (session_id);
CREATE INDEX IF NOT EXISTS idx_legs_game ON legs (game_id);
CREATE INDEX IF NOT EXISTS idx_visits_leg ON visits (leg_id);
CREATE INDEX IF NOT EXISTS idx_darts_visit ON darts (visit_id);
CREATE INDEX IF NOT EXISTS idx_darts_seq ON darts (seq);
CREATE INDEX IF NOT EXISTS idx_sessions_player_open ON sessions (player_id, ended_at);
CREATE INDEX IF NOT EXISTS idx_results_game ON results (game_id);

ALTER TABLE practice_game_definitions ADD COLUMN IF NOT EXISTS training_only boolean NOT NULL DEFAULT false;
