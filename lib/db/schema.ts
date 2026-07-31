import {
  bigserial,
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  text,
} from "drizzle-orm/pg-core"

/**
 * Phase 2 schema. Mirrors /lib/types exactly — timestamps are ISO 8601
 * text so rows round-trip byte-identical to the Phase 1 contract. The
 * darts table is the event log: append-only, tail-delete on undo, never
 * updated (ADR 0003). `seq` gives the log a total order.
 */

export const players = pgTable("players", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  isBot: boolean("is_bot").notNull(),
  botProfileId: text("bot_profile_id"),
  userId: text("user_id"),
  createdAt: text("created_at").notNull(),
})

export const botProfiles = pgTable("bot_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  targetAverage: real("target_average").notNull(),
  scoringSigmaMm: real("scoring_sigma_mm"),
  doubleSigmaMm: real("double_sigma_mm"),
  description: text("description").notNull(),
})

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  playerId: text("player_id").notNull(),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  note: text("note"),
})

export const games = pgTable("games", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  mode: text("mode").notNull(),
  config: jsonb("config").notNull(),
  participantPlayerIds: jsonb("participant_player_ids").notNull(),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  abandoned: boolean("abandoned").notNull().default(false),
})

export const legs = pgTable("legs", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull(),
  index: integer("index").notNull(),
  startingScore: integer("starting_score"),
  startingPlayerId: text("starting_player_id").notNull(),
  winnerPlayerId: text("winner_player_id"),
})

export const visits = pgTable("visits", {
  id: text("id").primaryKey(),
  legId: text("leg_id").notNull(),
  playerId: text("player_id").notNull(),
  index: integer("index").notNull(),
  bust: boolean("bust").notNull().default(false),
})

export const darts = pgTable("darts", {
  id: text("id").primaryKey(),
  seq: bigserial("seq", { mode: "number" }).notNull(),
  visitId: text("visit_id").notNull(),
  index: integer("index").notNull(),
  segment: integer("segment").notNull(),
  ring: text("ring").notNull(),
  score: integer("score").notNull(),
  targetSegment: integer("target_segment"),
  targetRing: text("target_ring"),
  thrownAt: text("thrown_at").notNull(),
  latencyMs: integer("latency_ms"),
})

export const practiceGameDefinitions = pgTable("practice_game_definitions", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  blurb: text("blurb").notNull(),
  targetType: text("target_type").notNull(),
  rules: jsonb("rules").notNull(),
  scoringModel: text("scoring_model").notNull(),
  personalBestDirection: text("personal_best_direction").notNull(),
  trainingOnly: boolean("training_only").notNull().default(false),
})

export const trainingSessions = pgTable("training_sessions", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  sessionIndex: integer("session_index").notNull(),
  week: integer("week").notNull(),
  kind: text("kind").notNull(),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  blockGameIds: jsonb("block_game_ids").notNull(),
})

export const results = pgTable("results", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull(),
  playerId: text("player_id").notNull(),
  metrics: jsonb("metrics").notNull(),
  computedAt: text("computed_at").notNull(),
})
