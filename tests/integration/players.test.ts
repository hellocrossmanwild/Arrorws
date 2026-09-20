import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest"
import { setupServer } from "msw/node"
import { handlers } from "@/mocks/handlers"
import { resetStore } from "@/mocks/data/store"
import { createPlayer, getPlayers, renamePlayer } from "@/lib/api/games"
import { ApiError } from "@/lib/api/client"

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
beforeEach(() => resetStore())

describe("player profiles", () => {
  test("the seed ships the household, bots excluded from it", async () => {
    const { players } = await getPlayers()
    const humans = players.filter((p) => !p.isBot).map((p) => p.displayName)
    expect(humans).toContain("Tom")
    expect(humans).toContain("Alfie")
    expect(humans).toContain("Maisie")
    expect(players.some((p) => p.isBot)).toBe(true)
  })

  test("adding a player returns a real, listed profile", async () => {
    const { player } = await createPlayer("Rosie")
    expect(player.displayName).toBe("Rosie")
    expect(player.isBot).toBe(false)
    expect(player.id).not.toBe("")

    const { players } = await getPlayers()
    expect(players.map((p) => p.id)).toContain(player.id)
  })

  test("names are trimmed and inner whitespace collapsed", async () => {
    const { player } = await createPlayer("  Rosie   May  ")
    expect(player.displayName).toBe("Rosie May")
  })

  test("a blank or over-long name is refused", async () => {
    await expect(createPlayer("   ")).rejects.toBeInstanceOf(ApiError)
    await expect(createPlayer("x".repeat(25))).rejects.toBeInstanceOf(ApiError)
  })

  test("a duplicate name is refused, whatever the casing", async () => {
    await createPlayer("Rosie")
    await expect(createPlayer("rosie")).rejects.toMatchObject({ status: 409 })
  })

  test("renaming keeps the same profile, so the record follows the name", async () => {
    const { player } = await createPlayer("Rosie")
    const { player: renamed } = await renamePlayer(player.id, "Rose")
    expect(renamed.id).toBe(player.id)
    expect(renamed.displayName).toBe("Rose")

    const { players } = await getPlayers()
    expect(players.find((p) => p.id === player.id)?.displayName).toBe("Rose")
  })

  test("a rename cannot collide with another player, and bots cannot be renamed", async () => {
    const { player } = await createPlayer("Rosie")
    await expect(renamePlayer(player.id, "Alfie")).rejects.toMatchObject({ status: 409 })
    // Renaming to its own name is not a collision.
    await expect(renamePlayer(player.id, "Rosie")).resolves.toBeTruthy()

    const { players } = await getPlayers()
    const bot = players.find((p) => p.isBot)!
    await expect(renamePlayer(bot.id, "Cheat")).rejects.toMatchObject({ status: 400 })
  })

  test("renaming a player who does not exist is a 404", async () => {
    await expect(renamePlayer("player-nobody", "Ghost")).rejects.toMatchObject({ status: 404 })
  })
})
