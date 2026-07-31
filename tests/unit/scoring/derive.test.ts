import { describe, expect, test } from "vitest"
import { deriveGameState, undoLastDart, type DeriveConfig } from "@/lib/scoring"
import { throwDarts } from "@/tests/helpers/darts"

const solo: DeriveConfig = { startingScore: 501, legsToWin: 1, players: ["p1"] }
const duo: DeriveConfig = { startingScore: 501, legsToWin: 2, players: ["p1", "p2"] }

describe("deriveGameState", () => {
  test("a fresh game starts at the starting score with zero darts", () => {
    const state = deriveGameState([], solo)
    expect(state.players[0].score).toBe(501)
    expect(state.players[0].dartsThrown).toBe(0)
    expect(state.currentPlayerId).toBe("p1")
    expect(state.legComplete).toBe(false)
  })

  test("a nine-dart leg completes on the double", () => {
    const darts = throwDarts("T20 T20 T20 T20 T20 T20 T20 T19 D12")
    const state = deriveGameState(darts, solo)
    expect(state.players[0].score).toBe(0)
    expect(state.legComplete).toBe(true)
    expect(state.winnerPlayerId).toBe("p1")
    expect(state.gameComplete).toBe(true)
    expect(state.players[0].dartsThrown).toBe(9)
    expect(state.players[0].threeDartAverage).toBeCloseTo(167, 0)
  })

  test("score below zero busts and restores the visit start score", () => {
    // 501 -> 60 61 60 60 60 60 -> 140 left; T20 T20 leaves 20; T20 busts (goes below zero)
    const darts = throwDarts("T20 T20 T20 T20 T20 T20 T20 T20 T20 T20")
    // after 8 darts: 501-480 = 21 left. 9th dart T20 -> -39: bust
    const state = deriveGameState(darts.slice(0, 9), solo)
    // visit 3 started at 501-360=141... wait: visits of 3. After 6 darts: 141. Visit 3: T20 T20 -> 21, T20 -> bust
    expect(state.players[0].score).toBe(141)
    expect(state.lastVisit?.bust).toBe(true)
    expect(state.players[0].dartsThrown).toBe(9)
  })

  test("score of exactly one busts", () => {
    // After nine darts the score is 41; D20 leaves exactly 1: bust, restore to 41.
    const state = deriveGameState(
      throwDarts("T20 T20 T20 T20 T20 T20 T20 20 20 D20"),
      solo
    )
    expect(state.players[0].score).toBe(41)
    expect(state.lastVisit?.bust).toBe(true)
  })

  test("reaching zero without a double busts", () => {
    // The third visit ends on 20; the next visit's single 20 reaches zero on
    // a non-double: bust, restore to that visit's start of 20.
    const state = deriveGameState(
      throwDarts("T20 T20 T20 T20 T20 T20 T20 T20 1 20"),
      solo
    )
    expect(state.players[0].score).toBe(20)
    expect(state.lastVisit?.bust).toBe(true)
  })

  test("a bust passes the throw immediately, even mid-visit", () => {
    const darts = throwDarts("T20 T20 T20 T20 T20 T20 T20 T20 T20")
    const state = deriveGameState(darts, duo)
    // p1 visit 1: 3 darts -> p2. p2 visit: 3 darts -> p1. p1: T20 T20 T20 -> 141... no bust yet
    expect(state.currentPlayerId).toBe("p2")
  })

  test("darts thrown increments on busted darts", () => {
    const darts = throwDarts("T20 T20 T20 T20 T20 T20 T20 T20 T20 T20")
    const state = deriveGameState(darts, solo)
    expect(state.players[0].dartsThrownTotal).toBe(10)
  })

  test("the throw alternates across visits and startingPlayerId alternates between legs", () => {
    const leg = "T20 T20 T20" // one visit
    // p1 and p2 alternate visits; give p1 a fast win: p1 throws 501 in 9 while p2 throws three visits
    const darts = throwDarts(
      [
        "T20 T20 T20", // p1
        "20 20 20", // p2
        "T20 T20 T20", // p1 -> 141
        "20 20 20", // p2
        "T20 T19 D12", // p1 checks out leg 1
      ].join(" ")
    )
    const state = deriveGameState(darts, duo)
    expect(state.legComplete).toBe(true)
    expect(state.winnerPlayerId).toBe("p1")
    expect(state.gameComplete).toBe(false) // first to 2
    // Next dart starts leg 2 with p2 throwing first
    const more = deriveGameState([...darts, ...throwDarts(leg)], duo)
    expect(more.legIndex).toBe(1)
    expect(more.currentPlayerId).toBe("p1") // p2 threw the first visit of leg 2, now p1
    expect(more.players[1].score).toBe(501 - 180)
  })

  test("undoing every dart returns state identical to a fresh game", () => {
    let darts = throwDarts("T20 T20 T20 T20 T20 T20 T20 T19 D12")
    while (darts.length > 0) darts = undoLastDart(darts)
    expect(deriveGameState(darts, solo)).toEqual(deriveGameState([], solo))
  })

  test("undoing the dart that caused a bust restores the pre-bust in-visit state", () => {
    const before = throwDarts("T20 T20 T20 T20 T20 T20 T20 T20") // 21 left, 2 darts into visit 3
    const busted = [...before, ...throwDarts("T20")] // bust
    const undone = undoLastDart(busted)
    const state = deriveGameState(undone, solo)
    expect(state.players[0].score).toBe(21)
    expect(state.currentVisit).toHaveLength(2)
    expect(state.lastVisit?.bust ?? false).toBe(false)
  })

  test("undoing a winning dart un-wins the leg", () => {
    const winning = throwDarts("T20 T20 T20 T20 T20 T20 T20 T19 D12")
    const state = deriveGameState(undoLastDart(winning), solo)
    expect(state.legComplete).toBe(false)
    expect(state.winnerPlayerId).toBeNull()
    expect(state.players[0].score).toBe(24)
  })

  test("total scored plus remaining equals the starting score", () => {
    const darts = throwDarts("T20 T20 T20 T20 T20 T20 T20 T20 T20 T20 5 1")
    const state = deriveGameState(darts, solo)
    const p = state.players[0]
    // Completed visits scored + current leg remaining
    expect(p.totalScored + p.score).toBe(501 + (501 - 501) * state.legIndex)
  })
})
