import { describe, expect, test } from "vitest"
import { sessionsInWeek, weekIndexOf, weekStreak } from "@/lib/training/streak"
import { FOUNDATION, sessionTemplate, TOTAL_SESSIONS } from "@/lib/training/program"

const MON = Date.UTC(2026, 6, 27) // Monday 27 July 2026
const DAY = 86_400_000
const WEEK = 7 * DAY

describe("week maths", () => {
  test("weeks are Monday-based", () => {
    expect(weekIndexOf(MON)).toBe(weekIndexOf(MON + 6 * DAY)) // Sunday same week
    expect(weekIndexOf(MON + 7 * DAY)).toBe(weekIndexOf(MON) + 1)
  })

  test("sessionsInWeek counts only the current week", () => {
    const completed = [MON, MON + DAY, MON - DAY] // Mon, Tue, previous Sunday
    expect(sessionsInWeek(completed, MON + 2 * DAY)).toBe(2)
  })

  test("weekStreak counts consecutive weeks meeting the target", () => {
    const target = 2
    const twoPerWeek = (weekStart: number) => [weekStart, weekStart + DAY]
    const completed = [
      ...twoPerWeek(MON - 2 * WEEK),
      ...twoPerWeek(MON - WEEK),
      ...twoPerWeek(MON),
    ]
    expect(weekStreak(completed, target, MON + 2 * DAY)).toBe(3)
    // Current week not yet at target: streak counts the finished weeks
    expect(weekStreak([...twoPerWeek(MON - WEEK), MON], target, MON + 2 * DAY)).toBe(1)
    // A gap week breaks it
    expect(
      weekStreak([...twoPerWeek(MON - 3 * WEEK), ...twoPerWeek(MON)], target, MON + DAY)
    ).toBe(1)
  })
})

describe("the Foundation programme", () => {
  test("sixteen sessions, four a week", () => {
    expect(TOTAL_SESSIONS).toBe(16)
    expect(FOUNDATION.sessionsPerWeek).toBe(4)
  })

  test("slot four is a match on odd weeks and the assessment on even weeks", () => {
    expect(sessionTemplate(3).kind).toBe("match") // week 1
    expect(sessionTemplate(7).kind).toBe("assessment") // week 2
    expect(sessionTemplate(11).kind).toBe("match") // week 3
    expect(sessionTemplate(15).kind).toBe("assessment") // week 4
  })

  test("every session opens with the switching warm-up", () => {
    for (let i = 0; i < TOTAL_SESSIONS; i++) {
      const t = sessionTemplate(i)
      expect(t.blocks[0].mode).toBe("target-switching")
      expect(t.blocks.length).toBeGreaterThanOrEqual(2)
    }
  })

  test("the match block carries the bot participant", () => {
    const match = sessionTemplate(3)
    const block = match.blocks[match.blocks.length - 1]
    expect(block.mode).toBe("x01")
    expect(block.withBot).toBe("bot-county")
  })
})
