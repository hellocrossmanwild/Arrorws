import type {
  BotProfile,
  Dart,
  Game,
  GameResult,
  Leg,
  Player,
  PracticeGameDefinition,
  SeedData,
  Session,
  TrainingSession,
  Visit,
} from "@/lib/types"
import seedJson from "./seed.json"

export interface Collection<T extends { id: string }> {
  list: (filter?: Partial<T>) => T[]
  get: (id: string) => T | null
  create: (data: Omit<T, "id">) => T
  update: (id: string, data: Partial<T>) => T | null
  delete: (id: string) => boolean
}

export interface MockStore {
  players: Collection<Player>
  botProfiles: Collection<BotProfile>
  sessions: Collection<Session>
  games: Collection<Game>
  legs: Collection<Leg>
  visits: Collection<Visit>
  darts: Collection<Dart>
  practiceGameDefinitions: Collection<PracticeGameDefinition & { id: string }>
  results: Collection<GameResult>
  trainingSessions: Collection<TrainingSession>
}

let idCounter = 0

function makeCollection<T extends { id: string }>(
  rows: T[],
  prefix: string,
  sort?: (a: T, b: T) => number
): Collection<T> {
  return {
    list(filter) {
      let out = rows.filter((row) =>
        filter
          ? Object.entries(filter).every(([k, v]) => row[k as keyof T] === v)
          : true
      )
      if (sort) out = [...out].sort(sort)
      return out
    },
    get(id) {
      return rows.find((r) => r.id === id) ?? null
    },
    create(data) {
      idCounter += 1
      // The "r" infix keeps runtime ids clear of seeded ids like "session-1".
      const row = { ...data, id: `${prefix}-r${idCounter}` } as T
      rows.push(row)
      return row
    },
    update(id, data) {
      const row = rows.find((r) => r.id === id)
      if (!row) return null
      Object.assign(row, data)
      return row
    },
    delete(id) {
      const i = rows.findIndex((r) => r.id === id)
      if (i === -1) return false
      rows.splice(i, 1)
      return true
    },
  }
}

function hydrate(): MockStore {
  // Deep-clone so the JSON module is never mutated between resets.
  const seed = JSON.parse(JSON.stringify(seedJson)) as SeedData
  return {
    players: makeCollection(seed.players, "player"),
    botProfiles: makeCollection(seed.botProfiles, "profile"),
    sessions: makeCollection(seed.sessions, "session"),
    games: makeCollection(seed.games, "game"),
    legs: makeCollection(seed.legs, "leg", (a, b) => a.index - b.index),
    visits: makeCollection(seed.visits, "visit"),
    // Order is not incidental for darts, it is the data: within a visit
    // sort by index, across the log by thrown time then id sequence.
    darts: makeCollection(seed.darts, "dart", (a, b) =>
      a.thrownAt === b.thrownAt ? a.index - b.index : a.thrownAt < b.thrownAt ? -1 : 1
    ),
    practiceGameDefinitions: makeCollection(
      seed.practiceGameDefinitions.map((d) => ({ ...d, id: d.key as string })),
      "definition"
    ),
    results: makeCollection(seed.results, "result"),
    trainingSessions: makeCollection(seed.trainingSessions ?? [], "training", (a, b) => a.sessionIndex - b.sessionIndex),
  }
}

/** Singleton, hydrated from seed.json on first import. State resets on page refresh. */
export let store: MockStore = hydrate()

/** Test hook: rebuild the store from the seed. */
export function resetStore(): void {
  store = hydrate()
}
