export type { Ring, Segment, Dart, DartInput } from "./dart"
export type { Player, BotProfile } from "./player"
export type {
  PracticeGameKey,
  GameMode,
  X01Config,
  PracticeConfig,
  GameConfig,
  Game,
  Session,
  Leg,
  Visit,
  PracticeGameDefinition,
  PracticeRules,
  PracticeTarget,
  GameResult,
  ResultMetrics,
} from "./game"
export type {
  PlayerState,
  VisitSummary,
  GameState,
  PracticeState,
  Metrics,
} from "./game-state"
export type { User } from "./user"
export type {
  TrainingBlock,
  TrainingSessionKind,
  TrainingSessionTemplate,
  TrainingProgram,
  TrainingSession,
} from "./training"

/** The top-level shape of mocks/data/seed.json. Flat collections joined by id. */
export interface SeedData {
  players: import("./player").Player[]
  botProfiles: import("./player").BotProfile[]
  sessions: import("./game").Session[]
  games: import("./game").Game[]
  legs: import("./game").Leg[]
  visits: import("./game").Visit[]
  darts: import("./dart").Dart[]
  practiceGameDefinitions: import("./game").PracticeGameDefinition[]
  results: import("./game").GameResult[]
  trainingSessions: import("./training").TrainingSession[]
}
