import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest"
import { setupServer } from "msw/node"
import { handlers } from "@/mocks/handlers"
import { resetStore } from "@/mocks/data/store"
import {
  getTraining,
  getTrainingSession,
  recordTrainingBlock,
  startTrainingSession,
} from "@/lib/api/training"
import { createGame, throwDart } from "@/lib/api/games"
import type { DartInput, Ring, TrainingBlock } from "@/lib/types"

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
beforeEach(() => resetStore())

const input = (label: string): DartInput => {
  const seg =
    label === "MISS"
      ? { segment: 0, ring: "MISS" as Ring }
      : label === "BULL"
        ? { segment: 25, ring: "D" as Ring }
        : (() => {
            const m = label.match(/^([SDT])?(\d+)$/)!
            return { segment: Number(m[2]), ring: (m[1] ?? "S") as Ring }
          })()
  return { ...seg, targetSegment: null, targetRing: null, latencyMs: null }
}

/** Play a block's game to completion the fast way, mirroring the runner. */
async function playBlock(block: TrainingBlock, sessionId: string, blockIndex: number) {
  const participants = block.withBot ? ["player-tom", block.withBot] : ["player-tom"]
  const { game } = await createGame(block.mode, block.config, participants)
  if (block.mode === "target-switching") {
    for (let i = 0; i < 18; i++) await throwDart(game.id, input("MISS"))
  } else if (block.mode === "jdc-challenge") {
    for (let i = 0; i < 36; i++) await throwDart(game.id, input("10"))
    // wait: part 2 is 21 darts; total is 57 — throw misses to keep it simple
  }
  await recordTrainingBlock(sessionId, blockIndex, game.id)
  return game
}

describe("the training programme", () => {
  test("summary starts empty with the first scoring session queued", async () => {
    const summary = await getTraining()
    expect(summary.program.id).toBe("foundation")
    expect(summary.completedCount).toBe(0)
    expect(summary.totalSessions).toBe(16)
    expect(summary.active).toBeNull()
    expect(summary.nextSession?.index).toBe(0)
    expect(summary.nextSession?.template.kind).toBe("scoring")
    expect(summary.sessionsThisWeek).toBe(0)
    expect(summary.weekStreak).toBe(0)
    expect(summary.assessments).toEqual([])
  })

  test("starting a session is idempotent", async () => {
    const first = await startTrainingSession()
    const second = await startTrainingSession()
    expect(second.session.id).toBe(first.session.id)
    const summary = await getTraining()
    expect(summary.active?.id).toBe(first.session.id)
    expect(summary.nextSession?.index).toBe(0)
  })

  test("recording every block completes the session and advances the queue", async () => {
    const { session, template } = await startTrainingSession()
    expect(session.blockGameIds).toHaveLength(template.blocks.length)

    for (let i = 0; i < template.blocks.length; i++) {
      const block = template.blocks[i]
      const participants = block.withBot ? ["player-tom", block.withBot] : ["player-tom"]
      const { game } = await createGame(block.mode, block.config, participants)
      const res = await recordTrainingBlock(session.id, i, game.id)
      if (i < template.blocks.length - 1) {
        expect(res.session.completedAt).toBeNull()
      } else {
        expect(res.session.completedAt).not.toBeNull()
      }
    }

    const summary = await getTraining()
    expect(summary.completedCount).toBe(1)
    expect(summary.sessionsThisWeek).toBe(1)
    expect(summary.active).toBeNull()
    expect(summary.nextSession?.index).toBe(1)
    expect(summary.nextSession?.template.kind).toBe("doubles")
  })

  test("skipping a block marks it skipped and still completes the session", async () => {
    const { session, template } = await startTrainingSession()
    for (let i = 0; i < template.blocks.length; i++) {
      await recordTrainingBlock(session.id, i, null)
    }
    const { session: done } = await getTrainingSession(session.id)
    expect(done.completedAt).not.toBeNull()
    expect(done.blockGameIds.every((g) => g === "skipped")).toBe(true)
  })

  test("a completed JDC game surfaces as a graded assessment", async () => {
    const { game } = await createGame("jdc-challenge", {}, ["player-tom"])
    // 57 darts: six T10 rounds would shanghai nothing; throw hits on part 1
    for (let i = 0; i < 18; i++) await throwDart(game.id, input("10"))
    for (let i = 0; i < 21; i++) await throwDart(game.id, input("D1"))
    for (let i = 0; i < 18; i++) await throwDart(game.id, input("15"))
    const summary = await getTraining()
    expect(summary.assessments).toHaveLength(1)
    expect(summary.assessments[0].score).toBeGreaterThan(0)
    expect(typeof summary.assessments[0].grade).toBe("string")
  })

  test("a PATCH on a completed session is a 409, a bad block index a 400", async () => {
    const { session, template } = await startTrainingSession()
    for (let i = 0; i < template.blocks.length; i++) {
      await recordTrainingBlock(session.id, i, null)
    }
    await expect(recordTrainingBlock(session.id, 0, null)).rejects.toMatchObject({
      status: 409,
    })
    const { session: fresh } = await startTrainingSession()
    await expect(recordTrainingBlock(fresh.id, 99, null)).rejects.toMatchObject({
      status: 400,
    })
  })

  test("the training block games land in the ordinary dart log", async () => {
    const { session, template } = await startTrainingSession()
    const game = await playBlock(template.blocks[0], session.id, 0)
    const { session: after } = await getTrainingSession(session.id)
    expect(after.blockGameIds[0]).toBe(game.id)
    // The game exists in ordinary history via the ordinary endpoint
    const replay = await fetch(`/api/games/${game.id}/replay`).then((r) => r.json())
    expect(replay.game.mode).toBe("target-switching")
  })
})
