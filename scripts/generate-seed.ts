/**
 * Deterministic seed generator (spec 0001). Writes mocks/data/seed.json.
 *
 * The dart logs are hand-authored (real-looking legs, not random noise);
 * this script only does the bookkeeping: ids, visit boundaries, timestamps,
 * practice targets and the derived results rows, all computed through the
 * same pure engines the app uses, so the seed is legal by construction.
 *
 * Run with: pnpm seed:generate
 */
import { writeFileSync } from "fs"
import { join } from "path"
import type {
  BotProfile,
  Dart,
  Game,
  GameResult,
  Leg,
  Metrics,
  Player,
  PracticeConfig,
  PracticeGameDefinition,
  PracticeGameKey,
  ResultMetrics,
  Ring,
  SeedData,
  Session,
  Visit,
} from "../lib/types"
import { annotateGame, computeStats, findCheckout, scoreOf } from "../lib/scoring"
import { dartTargetFor, getEngine } from "../lib/practice"
import { chooseTarget } from "../lib/bot"
import { CALIBRATED_SIGMAS } from "../lib/bot/calibration"
import { makeRng } from "../lib/utils/rng"

const rng = makeRng(0x5eed)

// ── segment parsing ────────────────────────────────────────────────────────
function seg(label: string): { segment: number; ring: Ring } {
  if (label === "MISS") return { segment: 0, ring: "MISS" }
  if (label === "BULL") return { segment: 25, ring: "D" }
  if (label === "25") return { segment: 25, ring: "S" }
  const m = label.match(/^([SDT])?(\d+)$/)
  if (!m) throw new Error(`Bad label ${label}`)
  return { segment: Number(m[2]), ring: (m[1] as Ring) ?? "S" }
}

// ── static content ─────────────────────────────────────────────────────────
const players: Player[] = [
  { id: "player-tom", displayName: "Tom", isBot: false, botProfileId: null, userId: null, createdAt: "2026-06-20T09:00:00.000Z" },
  { id: "player-guest", displayName: "Player 2", isBot: false, botProfileId: null, userId: null, createdAt: "2026-06-20T09:00:00.000Z" },
  { id: "bot-pub", displayName: "Pub player", isBot: true, botProfileId: "pub", userId: null, createdAt: "2026-06-20T09:00:00.000Z" },
  { id: "bot-county", displayName: "County", isBot: true, botProfileId: "county", userId: null, createdAt: "2026-06-20T09:00:00.000Z" },
  { id: "bot-tour-card", displayName: "Tour card", isBot: true, botProfileId: "tour-card", userId: null, createdAt: "2026-06-20T09:00:00.000Z" },
  { id: "bot-elite", displayName: "Elite", isBot: true, botProfileId: "elite", userId: null, createdAt: "2026-06-20T09:00:00.000Z" },
]

const botProfiles: BotProfile[] = [
  { id: "pub", name: "Pub player", targetAverage: 45, description: "Enthusiastic. Finds treble 20 by accident", ...CALIBRATED_SIGMAS["pub"] },
  { id: "county", name: "County", targetAverage: 75, description: "Solid scoring, shaky on the doubles", ...CALIBRATED_SIGMAS["county"] },
  { id: "tour-card", name: "Tour card", targetAverage: 95, description: "Punishes a missed double", ...CALIBRATED_SIGMAS["tour-card"] },
  { id: "elite", name: "Elite", targetAverage: 105, description: "Assume the leg is over in fifteen darts", ...CALIBRATED_SIGMAS["elite"] },
]

const seqTargets = (n: number, ring: Ring | null) =>
  Array.from({ length: n }, (_, i) => ({ type: "segment" as const, segment: i + 1, ring }))

const practiceGameDefinitions: PracticeGameDefinition[] = [
  {
    key: "around-the-clock",
    name: "Around the clock",
    blurb: "1 to 20, then 25, then bull, in order. Any ring counts",
    targetType: "sequence",
    rules: {
      targetType: "sequence",
      targets: [...seqTargets(20, null), { type: "segment", segment: 25, ring: "S" }, { type: "segment", segment: 25, ring: "D" }],
      requireExactRing: false,
    },
    scoringModel: "darts-to-complete",
    personalBestDirection: "lower-is-better",
  },
  {
    key: "doubles-round-the-board",
    name: "Doubles round the board",
    blurb: "D1 to D20 then bull, in order. Only the double counts",
    targetType: "sequence",
    rules: {
      targetType: "sequence",
      targets: [...seqTargets(20, "D"), { type: "segment", segment: 25, ring: "D" }],
      requireExactRing: true,
    },
    scoringModel: "darts-to-complete",
    personalBestDirection: "lower-is-better",
  },
  {
    key: "bobs-27",
    name: "Bob's 27",
    blurb: "Doubles under pressure, with a running score. Below zero is out",
    targetType: "sequence",
    rules: { targetType: "rounds", rounds: 20, targetPerRound: "index" },
    scoringModel: "points",
    personalBestDirection: "higher-is-better",
  },
  {
    key: "shanghai",
    name: "Shanghai",
    blurb: "Single, double and treble of the same number ends it",
    targetType: "score",
    rules: { targetType: "rounds", rounds: 20, targetPerRound: "index" },
    scoringModel: "points",
    personalBestDirection: "higher-is-better",
  },
  {
    key: "halve-it",
    name: "Halve it",
    blurb: "Miss the round's target and your score halves",
    targetType: "score",
    rules: { targetType: "rounds", rounds: 7, targetPerRound: "fixed" },
    scoringModel: "points",
    personalBestDirection: "higher-is-better",
  },
  {
    key: "checkout-ladder",
    name: "Checkout ladder",
    blurb: "Start at 41 and climb. Three straight failures ends it",
    targetType: "checkout",
    rules: { targetType: "checkout", start: 41, mode: "ladder", attempts: 3 },
    scoringModel: "points",
    personalBestDirection: "higher-is-better",
  },
  {
    key: "random-checkout",
    name: "Random checkout",
    blurb: "Twenty cold finishes between 41 and 170",
    targetType: "checkout",
    rules: { targetType: "checkout", start: 41, mode: "random", attempts: 20 },
    scoringModel: "hit-rate",
    personalBestDirection: "higher-is-better",
  },
  {
    key: "jdc-challenge",
    name: "JDC Challenge",
    blurb: "The graded assessment: Shanghai 10-15, every double, Shanghai 15-20",
    targetType: "score",
    rules: { targetType: "rounds", rounds: 33, targetPerRound: "index" },
    scoringModel: "points",
    personalBestDirection: "higher-is-better",
    trainingOnly: true,
  },
  {
    key: "target-switching",
    name: "Target switching",
    blurb: "Warm-up rounds cycling 20, 19, 18",
    targetType: "score",
    rules: { targetType: "rounds", rounds: 6, targetPerRound: "index" },
    scoringModel: "points",
    personalBestDirection: "higher-is-better",
    trainingOnly: true,
  },
  {
    key: "pressure-doubles",
    name: "Pressure doubles",
    blurb: "Two clean hits on each finishing double before you can stop",
    targetType: "sequence",
    rules: { targetType: "rounds", rounds: 4, targetPerRound: "index" },
    scoringModel: "darts-to-complete",
    personalBestDirection: "lower-is-better",
    trainingOnly: true,
  },
  {
    key: "scoring-drill",
    name: "Scoring drill",
    blurb: "Twenty visits at treble 20. Logs the average",
    targetType: "score",
    rules: { targetType: "rounds", rounds: 20, targetPerRound: "fixed", fixedTarget: { type: "segment", segment: 20, ring: "T" } },
    scoringModel: "points",
    personalBestDirection: "higher-is-better",
  },
]

// ── collectors ─────────────────────────────────────────────────────────────
const sessions: Session[] = []
const games: Game[] = []
const legs: Leg[] = []
const visits: Visit[] = []
const darts: Dart[] = []
const results: GameResult[] = []

function toResultMetrics(m: Metrics, gameScore: number | null): ResultMetrics {
  return {
    threeDartAverage: round2(m.threeDartAverage),
    firstNineAverage: round2(m.firstNineAverage),
    dartsThrown: m.dartsThrown,
    checkoutPct: m.checkoutPct === null ? null : round2(m.checkoutPct),
    doublesAttempted: m.doublesAttempted,
    doublesHit: m.doublesHit,
    bestVisit: m.bestVisit,
    count180: m.count180,
    count140plus: m.count140plus,
    count100plus: m.count100plus,
    gameScore,
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100

interface Clock {
  at: number
}

function nextDartTime(clock: Clock, firstOfVisit: boolean): { thrownAt: string; latencyMs: number | null } {
  if (firstOfVisit) {
    clock.at += 12_000 + Math.floor(rng() * 10_000) // walk to the oche
    return { thrownAt: new Date(clock.at).toISOString(), latencyMs: null }
  }
  const latencyMs = 600 + Math.floor(rng() * 1900)
  clock.at += latencyMs
  return { thrownAt: new Date(clock.at).toISOString(), latencyMs }
}

// ── x01 game builder ───────────────────────────────────────────────────────
function buildX01Game(opts: {
  id: string
  sessionId: string
  participants: string[]
  labels: string[]
  startedAtMs: number
  writeResultFor: string[]
}) {
  const { id, sessionId, participants, labels } = opts
  const config = { startingScore: 501, legsToWin: 1, players: participants }
  const clock: Clock = { at: opts.startedAtMs }

  const rawDarts: Dart[] = labels.map((label, i) => {
    const s = seg(label)
    return {
      id: `dart-${id}-${i + 1}`,
      visitId: "", // assigned below
      index: 0,
      segment: s.segment,
      ring: s.ring,
      score: scoreOf(s),
      targetSegment: null,
      targetRing: null,
      thrownAt: "",
      latencyMs: null,
    }
  })

  const annotated = annotateGame(rawDarts, config)
  let visitCounter = 0
  for (const leg of annotated) {
    const legId = `leg-${id}-${leg.index}`
    legs.push({
      id: legId,
      gameId: id,
      index: leg.index,
      startingScore: 501,
      startingPlayerId: leg.startingPlayerId,
      winnerPlayerId: leg.winnerPlayerId,
    })
    for (const visit of leg.visits) {
      visitCounter += 1
      const visitId = `visit-${id}-${visitCounter}`
      visits.push({
        id: visitId,
        legId,
        playerId: visit.playerId,
        index: visit.visitIndex,
        bust: visit.bust,
      })
      visit.darts.forEach((ad, di) => {
        const raw = ad.dart
        raw.visitId = visitId
        raw.index = di as 0 | 1 | 2
        const t = nextDartTime(clock, di === 0)
        raw.thrownAt = t.thrownAt
        raw.latencyMs = t.latencyMs
        // Bot darts carry the target the strategy would have chosen.
        const player = players.find((p) => p.id === visit.playerId)
        if (player?.isBot) {
          const profile = botProfiles.find((b) => b.id === player.botProfileId)!
          const target = chooseTarget(ad.scoreBefore, (3 - di) as 1 | 2 | 3, profile)
          raw.targetSegment = target.segment
          raw.targetRing = target.ring
        }
      })
    }
  }
  darts.push(...rawDarts)

  const endedAt = new Date(clock.at + 5_000).toISOString()
  games.push({
    id,
    sessionId,
    mode: "x01",
    config: { startingScore: 501, legsToWin: 1 },
    participantPlayerIds: participants,
    startedAt: new Date(opts.startedAtMs).toISOString(),
    endedAt,
    abandoned: false,
  })

  for (const playerId of opts.writeResultFor) {
    const metrics = computeStats(rawDarts, playerId, config)
    results.push({
      id: `result-${id}-${playerId}`,
      gameId: id,
      playerId,
      metrics: toResultMetrics(metrics, null),
      computedAt: endedAt,
    })
  }
}

// ── practice game builder ──────────────────────────────────────────────────
function buildPracticeGame(opts: {
  id: string
  sessionId: string
  key: PracticeGameKey
  config: PracticeConfig
  labels: string[]
  startedAtMs: number
  abandoned?: boolean
}) {
  const { id, sessionId, key, config, labels } = opts
  const engine = getEngine(key)
  const clock: Clock = { at: opts.startedAtMs }
  let state = engine.initial(config, makeRng(config.rngSeed ?? 1))

  const rawDarts: Dart[] = []
  const legId = `leg-${id}-0`
  let visitId = ""
  labels.forEach((label, i) => {
    const s = seg(label)
    if (i % 3 === 0) {
      visitId = `visit-${id}-${i / 3 + 1}`
      visits.push({ id: visitId, legId, playerId: "player-tom", index: i / 3, bust: false })
    }
    const target = dartTargetFor(state)
    const t = nextDartTime(clock, i % 3 === 0)
    const dart: Dart = {
      id: `dart-${id}-${i + 1}`,
      visitId,
      index: (i % 3) as 0 | 1 | 2,
      segment: s.segment,
      ring: s.ring,
      score: scoreOf(s),
      targetSegment: target.targetSegment,
      targetRing: target.targetRing,
      thrownAt: t.thrownAt,
      latencyMs: t.latencyMs,
    }
    rawDarts.push(dart)
    state = engine.onDart(state, dart)
  })
  darts.push(...rawDarts)

  const startingScore = key === "bobs-27" ? 27 : null
  legs.push({
    id: legId,
    gameId: id,
    index: 0,
    startingScore,
    startingPlayerId: "player-tom",
    winnerPlayerId: state.complete && !opts.abandoned ? "player-tom" : null,
  })

  const complete = state.complete && !opts.abandoned
  const endedAt = complete ? new Date(clock.at + 5_000).toISOString() : null
  games.push({
    id,
    sessionId,
    mode: key,
    config,
    participantPlayerIds: ["player-tom"],
    startedAt: new Date(opts.startedAtMs).toISOString(),
    endedAt,
    abandoned: Boolean(opts.abandoned),
  })

  if (complete) {
    const deriveCfg = { startingScore: 501, legsToWin: 1, players: ["player-tom"] }
    const metrics = computeStats(rawDarts, "player-tom", deriveCfg)
    results.push({
      id: `result-${id}-player-tom`,
      gameId: id,
      playerId: "player-tom",
      metrics: toResultMetrics(metrics, state.finalScore),
      computedAt: endedAt!,
    })
  }
  return state
}

function sessionAt(id: string, iso: string, minutes: number, note: string | null): number {
  const start = Date.parse(iso)
  sessions.push({
    id,
    playerId: "player-tom",
    startedAt: iso,
    endedAt: new Date(start + minutes * 60_000).toISOString(),
    note,
  })
  return start
}

// ── Session 1: a tidy solo leg, then Bob's 27 goes wrong ──────────────────
const s1 = sessionAt("session-1", "2026-07-02T18:30:00.000Z", 45, null)

buildX01Game({
  id: "game-1",
  sessionId: "session-1",
  participants: ["player-tom"],
  labels: [
    "20", "5", "1", // 26 -> 475
    "T20", "20", "5", // 85 -> 390
    "20", "20", "20", // 60 -> 330
    "3", "20", "20", // 43 -> 287
    "T20", "20", "1", // 81 -> 206
    "5", "20", "20", // 45 -> 161
    "20", "20", "20", // 60 -> 101
    "T19", "4", "20", // 81 -> 20
    "D10", // checkout: 25 darts
  ],
  startedAtMs: s1 + 2 * 60_000,
  writeResultFor: ["player-tom"],
})

buildPracticeGame({
  id: "game-2",
  sessionId: "session-1",
  key: "bobs-27",
  config: {},
  labels: [
    "D1", "1", "1",
    "5", "D2", "3",
    "MISS", "5", "2",
    "D4", "D4", "2",
    "5", "5", "5",
    "D6", "6", "5",
    "5", "12", "9",
    "D8", "4", "4",
    "12", "1", "5",
    "10", "5", "D10",
    "8", "14", "11",
    "9", "12", "5",
    "13", "4", "6", // round 13 miss: eliminated below zero
  ],
  startedAtMs: s1 + 18 * 60_000,
})

// ── Session 2: a leg with a bust, then around the clock ───────────────────
const s2 = sessionAt("session-2", "2026-07-09T19:00:00.000Z", 40, "new flights")

buildX01Game({
  id: "game-3",
  sessionId: "session-2",
  participants: ["player-tom"],
  labels: [
    "20", "5", "20", // 45 -> 456
    "T20", "20", "20", // 100 -> 356
    "20", "5", "1", // 26 -> 330
    "19", "T20", "D1", // 81 -> 249
    "20", "20", "20", // 60 -> 189
    "T19", "20", "20", // 97 -> 92
    "T20", "T20", // 32 then bust (below zero): back to 92
    "T20", "16", "D8", // 92 checkout
  ],
  startedAtMs: s2 + 3 * 60_000,
  writeResultFor: ["player-tom"],
})

buildPracticeGame({
  id: "game-4",
  sessionId: "session-2",
  key: "around-the-clock",
  config: {},
  labels: [
    "1", "18", "2", "3", "MISS", "4", // 1,2(after miss on 2? see ordering), ...
    "5", "6", "10", "7", "8", "MISS",
    "9", "10", "11", "12", "9", "13",
    "14", "MISS", "15", "16", "17", "2",
    "18", "19", "3", "20", "25", "MISS",
    "BULL",
  ],
  startedAtMs: s2 + 22 * 60_000,
})

// ── Session 3: county bot match, then random checkout ─────────────────────
const s3 = sessionAt("session-3", "2026-07-16T18:45:00.000Z", 50, null)

buildX01Game({
  id: "game-5",
  sessionId: "session-3",
  participants: ["player-tom", "bot-county"],
  labels: [
    // tom              // bot
    "20", "20", "20", // 60 -> 441
    "T20", "20", "5", // bot 85 -> 416
    "20", "20", "5", // 45 -> 396
    "T20", "20", "20", // bot 100 -> 316
    "20", "20", "1", // 41 -> 355
    "20", "20", "20", // bot 60 -> 256
    "T20", "20", "20", // 100 -> 255
    "T20", "20", "16", // bot 96 -> 160
    "20", "20", "20", // 60 -> 195
    "T20", "T20", "5", // bot 125 -> 35
    "20", "20", "3", // 43 -> 152
    "3", "D16", // bot: 35 -> 32 -> out. Bot wins in 17 darts
  ],
  startedAtMs: s3 + 4 * 60_000,
  writeResultFor: ["player-tom", "bot-county"],
})

// Random checkout: rounds are engine-driven; darts are chosen against the
// engine's own targets below.
{
  const key: PracticeGameKey = "random-checkout"
  const config: PracticeConfig = { rngSeed: 20260716 }
  const engine = getEngine(key)
  let probe = engine.initial(config, makeRng(config.rngSeed!))
  const madeRounds = new Set([0, 2, 5, 9, 12, 15, 19])
  const labels: string[] = []
  while (!probe.complete) {
    const target = probe.currentTarget
    if (!target || target.type !== "score") break
    if (madeRounds.has(probe.roundIndex)) {
      const route = findCheckout(target.score, 3)!
      for (const s of route) {
        labels.push(s.ring === "D" && s.segment === 25 ? "BULL" : s.ring === "S" ? (s.segment === 25 ? "25" : String(s.segment)) : `${s.ring}${s.segment}`)
        probe = engine.onDart(probe, { id: "probe", visitId: "", index: 0, segment: s.segment, ring: s.ring, score: scoreOf(s), targetSegment: null, targetRing: null, thrownAt: "", latencyMs: null })
      }
    } else {
      for (const label of ["5", "1", "MISS"]) {
        const s = seg(label)
        labels.push(label)
        probe = engine.onDart(probe, { id: "probe", visitId: "", index: 0, segment: s.segment, ring: s.ring, score: scoreOf(s), targetSegment: null, targetRing: null, thrownAt: "", latencyMs: null })
      }
    }
  }
  buildPracticeGame({
    id: "game-6",
    sessionId: "session-3",
    key,
    config,
    labels,
    startedAtMs: s3 + 26 * 60_000,
  })
}

// ── Session 4: two player, then doubles round the board abandoned ─────────
const s4 = sessionAt("session-4", "2026-07-23T20:00:00.000Z", 45, null)

buildX01Game({
  id: "game-7",
  sessionId: "session-4",
  participants: ["player-tom", "player-guest"],
  labels: [
    "T20", "20", "5", // tom 85 -> 416
    "20", "5", "1", // guest 26 -> 475
    "20", "20", "20", // tom 60 -> 356
    "20", "20", "20", // guest 60 -> 415
    "20", "5", "20", // tom 45 -> 311
    "20", "20", "1", // guest 41 -> 374
    "20", "20", "20", // tom 60 -> 251
    "5", "20", "20", // guest 45 -> 329
    "T20", "20", "16", // tom 96 -> 155
    "20", "20", "20", // guest 60 -> 269
    "20", "20", "15", // tom 55 -> 100
    "20", "5", "1", // guest 26 -> 243
    "T20", "D20", // tom checks out 100 in 20 darts
  ],
  startedAtMs: s4 + 5 * 60_000,
  writeResultFor: ["player-tom", "player-guest"],
})

buildPracticeGame({
  id: "game-8",
  sessionId: "session-4",
  key: "doubles-round-the-board",
  config: {},
  labels: [
    "D1",
    "5", "D2",
    "MISS", "3", "D3",
    "4", "4", "D4",
    "12", "D5",
    "D6",
    "5", "5", "5", "9", "D7",
    "16", "8", "D8",
    "9", "12", // abandoned mid-way to D9
  ],
  startedAtMs: s4 + 30 * 60_000,
  abandoned: true,
})

// ── Session 5: opened the app, threw nothing ──────────────────────────────
sessionAt("session-5", "2026-07-28T18:15:00.000Z", 5, null)

// ── write ──────────────────────────────────────────────────────────────────
const seed: SeedData = {
  players,
  botProfiles,
  sessions,
  games,
  legs,
  visits,
  darts,
  practiceGameDefinitions,
  results,
  trainingSessions: [],
}

const out = join(__dirname, "..", "mocks", "data", "seed.json")
writeFileSync(out, JSON.stringify(seed, null, 2) + "\n")
console.log(
  `Wrote ${out}: ${players.length} players, ${sessions.length} sessions, ${games.length} games, ` +
    `${legs.length} legs, ${visits.length} visits, ${darts.length} darts, ${results.length} results`
)
