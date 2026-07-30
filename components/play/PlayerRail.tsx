import type { Player, PlayerState } from "@/lib/types"
import { cn } from "@/lib/utils/cn"

/**
 * One cell per participant. The active player's cell is the only one at
 * full opacity — unambiguous from two metres.
 */
export function PlayerRail({
  players,
  states,
  currentPlayerId,
  showLegs,
}: {
  players: Player[]
  states: PlayerState[]
  currentPlayerId: string
  showLegs: boolean
}) {
  return (
    <header className="flex flex-none gap-px bg-wire/60" data-testid="player-rail">
      {states.map((state) => {
        const player = players.find((p) => p.id === state.playerId)
        const active = state.playerId === currentPlayerId
        return (
          <div
            key={state.playerId}
            className={cn(
              "flex flex-1 items-baseline gap-2 px-3 py-2",
              active ? "bg-bed opacity-100" : "bg-slate2 opacity-40"
            )}
            data-testid={`rail-${state.playerId}`}
            data-active={active}
          >
            <span className="text-sm font-semibold">{player?.displayName ?? state.playerId}</span>
            <span className="font-mono text-[11px] text-tung">
              {state.threeDartAverage.toFixed(1)} avg · {state.dartsThrownTotal} darts
            </span>
            {showLegs && (
              <span className="ml-auto font-display text-base text-wire">{state.legsWon}</span>
            )}
          </div>
        )
      })}
    </header>
  )
}
