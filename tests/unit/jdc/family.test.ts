import { describe, expect, test } from "vitest"
import type { JdcAttempt, Player } from "@/lib/types"
import { buildFamilyBoard } from "@/lib/jdc/summary"

const player = (id: string, displayName: string, isBot = false): Player => ({
  id,
  displayName,
  isBot,
  botProfileId: isBot ? "county" : null,
  userId: null,
  createdAt: "2026-08-01T09:00:00.000Z",
})

const attempt = (
  thrownBy: string,
  endedAt: string,
  score: number
): JdcAttempt & { thrownBy: string } => ({
  gameId: `${thrownBy}-${endedAt}`,
  endedAt,
  score,
  grade: "White",
  parts: [0, 0, 0],
  shanghais: 0,
  doublesHit: 0,
  fromProgramme: false,
  thrownBy,
})

describe("buildFamilyBoard", () => {
  const players = [player("p-tom", "Tom"), player("p-alfie", "Alfie"), player("p-bot", "County", true)]

  test("bots never appear on the family board", () => {
    const rows = buildFamilyBoard(players, [])
    expect(rows.map((r) => r.displayName)).toEqual(["Alfie", "Tom"])
  })

  test("orders by best score, unthrown players last in name order", () => {
    const rows = buildFamilyBoard(
      [...players, player("p-rosie", "Rosie")],
      [attempt("p-tom", "2026-09-01T00:00:00.000Z", 300), attempt("p-alfie", "2026-09-02T00:00:00.000Z", 480)]
    )
    expect(rows.map((r) => r.displayName)).toEqual(["Alfie", "Tom", "Rosie"])
    expect(rows[2].best).toBeNull()
  })

  test("a row's best is their highest, latest is their most recent", () => {
    const rows = buildFamilyBoard(players, [
      attempt("p-tom", "2026-09-01T00:00:00.000Z", 520),
      attempt("p-tom", "2026-09-08T00:00:00.000Z", 310),
    ])
    const tom = rows.find((r) => r.playerId === "p-tom")!
    expect(tom.best).toBe(520)
    expect(tom.latest).toBe(310)
    expect(tom.belt).toBe("Green")
    expect(tom.attempts).toBe(2)
    expect(tom.lastThrownAt).toBe("2026-09-08T00:00:00.000Z")
  })

  test("one player's attempts never count toward another's row", () => {
    const rows = buildFamilyBoard(players, [
      attempt("p-tom", "2026-09-01T00:00:00.000Z", 520),
      attempt("p-alfie", "2026-09-02T00:00:00.000Z", 140),
    ])
    expect(rows.find((r) => r.playerId === "p-alfie")!.best).toBe(140)
    expect(rows.find((r) => r.playerId === "p-alfie")!.attempts).toBe(1)
  })

  test("an attempt by an unknown player is ignored, not crashed on", () => {
    const rows = buildFamilyBoard(players, [attempt("p-ghost", "2026-09-01T00:00:00.000Z", 900)])
    expect(rows.every((r) => r.best === null)).toBe(true)
  })
})
