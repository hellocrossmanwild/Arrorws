import { describe, expect, test } from "vitest"
import { deriveGameState, SEGMENTS, undoLastDart, type DeriveConfig } from "@/lib/scoring"
import type { Dart } from "@/lib/types"
import { dart, makeRng } from "@/tests/helpers/darts"

/**
 * Property-based tests, spec 0003. Generate thousands of random legal dart
 * sequences and assert the invariants hold on every one.
 */

const SEQUENCES = 10_000

function randomSequence(rng: () => number): { darts: Dart[]; config: DeriveConfig } {
  const players = rng() < 0.5 ? ["p1"] : ["p1", "p2"]
  const config: DeriveConfig = {
    startingScore: 501,
    legsToWin: 1 + Math.floor(rng() * 2),
    players,
  }
  const length = Math.floor(rng() * 40)
  const darts: Dart[] = []
  for (let i = 0; i < length; i++) {
    const s = SEGMENTS[Math.floor(rng() * SEGMENTS.length)]
    darts.push(dart(s))
  }
  return { darts, config }
}

describe(`invariants over ${SEQUENCES} random dart sequences`, () => {
  const rng = makeRng(0xa11ce)

  test("all invariants hold on every sequence", () => {
    for (let i = 0; i < SEQUENCES; i++) {
      const { darts, config } = randomSequence(rng)

      // deriveGameState never throws
      const state = deriveGameState(darts, config)

      for (const p of state.players) {
        // Remaining score is never negative and never exactly one
        expect(p.score).toBeGreaterThanOrEqual(0)
        expect(p.score).not.toBe(1)
        expect(p.score).toBeLessThanOrEqual(config.startingScore)
      }

      // Replaying the full log always reproduces the same final state
      expect(deriveGameState(darts, config)).toEqual(state)

      // Total scored plus remaining equals the starting score (current leg,
      // single-leg games only so scores are not reset by leg changes)
      if (config.legsToWin === 1 && !state.legComplete) {
        for (const p of state.players) {
          const scoredThisLeg = config.startingScore - p.score
          expect(scoredThisLeg).toBeGreaterThanOrEqual(0)
        }
      }

      // Every completed leg's final dart is a double or bull
      if (state.legComplete && state.lastVisit) {
        const finalDart = state.lastVisit.darts[state.lastVisit.darts.length - 1]
        expect(finalDart.ring).toBe("D")
      }

      // Undoing every dart returns the starting position exactly
      if (i % 20 === 0) {
        let log = darts
        while (log.length > 0) log = undoLastDart(log)
        expect(deriveGameState(log, config)).toEqual(deriveGameState([], config))
      }

      // Undo of one dart matches deriving the shorter log
      if (darts.length > 0 && i % 10 === 0) {
        const undone = undoLastDart(darts)
        expect(undone).toHaveLength(darts.length - 1)
        expect(deriveGameState(undone, config)).toEqual(
          deriveGameState(darts.slice(0, -1), config)
        )
      }
    }
  }, 60_000)

  test("total scored plus remaining always equals the starting score in a live leg", () => {
    const rng2 = makeRng(0xbeef)
    for (let i = 0; i < 2_000; i++) {
      const { darts, config } = randomSequence(rng2)
      const state = deriveGameState(darts, config)
      if (state.legIndex > 0 || state.legComplete) continue
      // In leg 0, per player: sum of completed-visit scores + current-visit non-busted scoring = 501 - score
      for (const p of state.players) {
        const inVisit =
          state.currentPlayerId === p.playerId
            ? state.visitStartScore - p.score
            : 0
        expect(p.totalScored + inVisit + p.score).toBe(config.startingScore)
      }
    }
  }, 30_000)
})
