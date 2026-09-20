"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createPlayer, renamePlayer } from "@/lib/api/games"
import { usePlayerId, useSetPlayer } from "@/lib/auth"
import type { Player } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toaster"
import { ApiError } from "@/lib/api/client"
import { cn } from "@/lib/utils/cn"
import { humansOf, usePlayersStore } from "@/lib/players/store"

/**
 * Who is throwing (spec 0012). A tap-your-name picker, not a login: the app
 * lives on one device beside a board and gets used by a household, so the
 * cost of choosing has to be one thumb and no keyboard.
 */
/** useSearchParams needs a boundary to prerender under Next's app router. */
export default function PlayersPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-xl flex-1 px-4 py-6" />}>
      <PlayerPicker />
    </Suspense>
  )
}

function PlayerPicker() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get("next")
  const playerId = usePlayerId()
  const setPlayer = useSetPlayer()

  // The shared roster, so the header chip and this list never disagree.
  const roster = usePlayersStore((s) => s.players)
  const load = usePlayersStore((s) => s.load)
  const reload = usePlayersStore((s) => s.reload)
  const players = roster === null ? null : humansOf(roster)

  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [load])

  function choose(id: string) {
    setPlayer(id)
    router.push(next ?? "/")
  }

  async function add() {
    if (busy) return
    setBusy(true)
    try {
      const { player } = await createPlayer(name)
      await reload()
      setName("")
      setAdding(false)
      // A profile is added in order to be used, so switch straight to it.
      setPlayer(player.id)
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not add that player")
    } finally {
      setBusy(false)
    }
  }

  async function rename(id: string, displayName: string) {
    if (busy) return
    setBusy(true)
    try {
      await renamePlayer(id, displayName)
      await reload()
      setRenaming(null)
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not rename that player")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-wire">Players</p>
      <h1 className="mt-1 font-display text-3xl">Who is throwing?</h1>
      <p className="mt-2 text-sm text-tung">
        Every game, stat and belt is recorded against whoever is picked here.
      </p>

      <div className="mt-5 flex flex-col gap-px bg-wire/40" data-testid="player-list">
        {(players ?? []).map((player) => {
          const current = player.id === playerId
          return renaming === player.id ? (
            <RenameRow
              key={player.id}
              player={player}
              busy={busy}
              onCancel={() => setRenaming(null)}
              onSave={(value) => rename(player.id, value)}
            />
          ) : (
            <div key={player.id} className="flex items-stretch gap-px bg-wire/40">
              <button
                className={cn(
                  "flex min-h-[64px] flex-1 items-center justify-between bg-bed px-4 text-left hover:brightness-110",
                  current && "shadow-[inset_3px_0_0_theme(colors.wire)]"
                )}
                onClick={() => choose(player.id)}
                data-testid={`player-${player.id}`}
                data-current={current}
              >
                <span className="font-display text-2xl">{player.displayName}</span>
                {current && (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-wire">
                    Throwing
                  </span>
                )}
              </button>
              <button
                className="bg-bed px-3 font-mono text-[10px] uppercase tracking-widest text-tung hover:text-chalk"
                onClick={() => setRenaming(player.id)}
                aria-label={`Rename ${player.displayName}`}
              >
                Edit
              </button>
            </div>
          )
        })}
        {!players && <div className="h-[192px] bg-bed" />}
      </div>

      {adding ? (
        <div className="mt-px flex flex-col gap-3 bg-bed p-4">
          <label className="font-mono text-[10px] uppercase tracking-widest text-tung">
            Name
            <input
              autoFocus
              value={name}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) add()
                if (e.key === "Escape") setAdding(false)
              }}
              className="mt-1 block w-full bg-slate2 px-3 py-3 font-display text-xl text-chalk outline-none ring-1 ring-wire/40 focus:ring-wire"
              data-testid="new-player-name"
            />
          </label>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={add} disabled={!name.trim() || busy} data-testid="save-player">
              Add player
            </Button>
            <button
              className="px-4 font-mono text-xs uppercase tracking-widest text-tung"
              onClick={() => setAdding(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          className="mt-px flex min-h-[56px] w-full items-center bg-bed px-4 font-mono text-xs uppercase tracking-widest text-wire hover:brightness-110"
          onClick={() => setAdding(true)}
          data-testid="add-player"
        >
          + Add player
        </button>
      )}
    </div>
  )
}

function RenameRow({
  player,
  busy,
  onSave,
  onCancel,
}: {
  player: Player
  busy: boolean
  onSave: (value: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(player.displayName)
  return (
    <div className="flex items-center gap-2 bg-bed p-3">
      <input
        autoFocus
        value={value}
        maxLength={24}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) onSave(value)
          if (e.key === "Escape") onCancel()
        }}
        className="min-h-[44px] flex-1 bg-slate2 px-3 font-display text-xl text-chalk outline-none ring-1 ring-wire/40 focus:ring-wire"
        data-testid={`rename-${player.id}`}
      />
      <Button onClick={() => onSave(value)} disabled={!value.trim() || busy}>
        Save
      </Button>
      <button
        className="px-2 font-mono text-[10px] uppercase tracking-widest text-tung"
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  )
}
