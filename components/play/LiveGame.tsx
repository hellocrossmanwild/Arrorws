"use client"

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { Dart, PracticeConfig, PracticeGameKey, PracticeState, Segment } from "@/lib/types"
import { getPracticeGames } from "@/lib/api/practice"
import { getTrainingSession, recordTrainingBlock } from "@/lib/api/training"
import type { GameResponse } from "@/lib/api/games"
import { abandonGame, startNextLeg, throwDart, undoDart } from "@/lib/api/games"
import { deriveGameState, findCheckout, labelOf, scoreOf } from "@/lib/scoring"
import { dartTargetFor, derivePracticeState, hudFor, isPracticeKey } from "@/lib/practice"
import { GAME_GUIDES } from "@/lib/content/guides"
import { chooseTarget, sigmaFor, simulateThrow } from "@/lib/bot"
import { toast } from "@/components/ui/toaster"
import { PlayerRail } from "./PlayerRail"
import { PracticeBand } from "./PracticeBand"
import { ScoreDisplay } from "./ScoreDisplay"
import { FinishStrip } from "./FinishStrip"
import { ThrowPad } from "./ThrowPad"
import { LegCompleteSheet } from "./LegCompleteSheet"
import { useWakeLock } from "./use-wake-lock"
import { HelpSheet } from "@/components/help/HelpSheet"

/**
 * The live game shell (spec 0004). The reducer holds darts, never a score:
 * every rendered number is derived by replaying the log (ADR 0003).
 * Optimistic by default — the dart lands locally first, the API call
 * follows, and a failure rolls back with a toast.
 */

interface LiveState {
  darts: Dart[]
  acknowledgedLegIndex: number
  undoCount: number
}

type Action =
  | { type: "THROW"; dart: Dart }
  | { type: "CONFIRM"; tempId: string; dart: Dart }
  | { type: "ROLLBACK"; dartId: string }
  | { type: "UNDO" }
  | { type: "RESTORE"; dart: Dart }
  | { type: "ACK_LEG"; legIndex: number }

function reducer(state: LiveState, action: Action): LiveState {
  switch (action.type) {
    case "THROW":
      return { ...state, darts: [...state.darts, action.dart] }
    case "CONFIRM":
      return {
        ...state,
        darts: state.darts.map((d) => (d.id === action.tempId ? action.dart : d)),
      }
    case "ROLLBACK":
      return { ...state, darts: state.darts.filter((d) => d.id !== action.dartId) }
    case "UNDO":
      return { ...state, darts: state.darts.slice(0, -1), undoCount: state.undoCount + 1 }
    case "RESTORE":
      return { ...state, darts: [...state.darts, action.dart] }
    case "ACK_LEG":
      return { ...state, acknowledgedLegIndex: action.legIndex }
  }
}

let tempCounter = 0

export interface TrainingReturn {
  sessionId: string
  blockIndex: number
}

export function LiveGame({
  initial,
  trainingReturn,
}: {
  initial: GameResponse
  trainingReturn?: TrainingReturn
}) {
  const router = useRouter()
  const { game, players } = initial
  const isPractice = isPracticeKey(game.mode)
  const practiceKey = isPractice ? (game.mode as PracticeGameKey) : null
  const practiceConfig = isPractice ? (game.config as PracticeConfig) : null

  const [state, dispatch] = useReducer(reducer, {
    darts: initial.darts,
    acknowledgedLegIndex: -1,
    undoCount: 0,
  })
  const [showHelp, setShowHelp] = useState(false)
  const [personalBest, setPersonalBest] = useState<number | null>(null)
  const [trainingLabel, setTrainingLabel] = useState<string | null>(null)

  // The PB chip (spec 0010): fetched once, absent until it resolves.
  useEffect(() => {
    if (!practiceKey) return
    let cancelled = false
    getPracticeGames()
      .then(({ personalBests }) => {
        if (!cancelled) setPersonalBest(personalBests[practiceKey]?.score ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [practiceKey])

  // Training context in the header (spec 0010): which block of the session.
  useEffect(() => {
    if (!trainingReturn) return
    let cancelled = false
    getTrainingSession(trainingReturn.sessionId)
      .then(({ template }) => {
        if (!cancelled)
          setTrainingLabel(
            `Training · block ${trainingReturn.blockIndex + 1} of ${template.blocks.length}`
          )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [trainingReturn])

  const deriveConfig = useMemo(
    () => ({
      startingScore: (game.config as { startingScore?: number }).startingScore ?? 501,
      legsToWin: (game.config as { legsToWin?: number }).legsToWin ?? 1,
      players: game.participantPlayerIds,
    }),
    [game]
  )

  const gameState = useMemo(
    () => deriveGameState(state.darts, deriveConfig),
    [state.darts, deriveConfig]
  )
  const practiceState = useMemo(
    () =>
      practiceKey ? derivePracticeState(state.darts, practiceKey, practiceConfig) : null,
    [state.darts, practiceKey, practiceConfig]
  )
  const practiceHud = useMemo(
    () =>
      practiceKey && practiceState
        ? hudFor(practiceKey, practiceState, { darts: state.darts, personalBest })
        : null,
    [practiceKey, practiceState, state.darts, personalBest]
  )

  const complete = practiceState ? practiceState.complete : gameState.gameComplete
  useWakeLock(!complete)

  const currentPlayer = players.find((p) => p.id === gameState.currentPlayerId)
  const botProfile = currentPlayer?.isBot
    ? initial.botProfiles.find((b) => b.id === currentPlayer.botProfileId)
    : undefined
  const isBotGame = players.some((p) => p.isBot)
  const isBotTurn = Boolean(botProfile) && !gameState.legComplete && !complete

  // Serialise API calls so server ordering always matches the local log.
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const enqueue = useCallback((fn: () => Promise<unknown>) => {
    queue.current = queue.current.then(fn, fn)
  }, [])

  const lastTapAt = useRef<number | null>(null)

  const recordThrow = useCallback(
    (segment: Segment, target: { targetSegment: number | null; targetRing: Dart["targetRing"] }) => {
      const now = performance.now()
      const inVisit =
        !gameState.legComplete && gameState.currentVisit.length > 0 && lastTapAt.current !== null
      const latencyMs = inVisit ? Math.round(now - lastTapAt.current!) : null
      lastTapAt.current = now

      tempCounter += 1
      const tempId = `temp_${tempCounter}`
      const dart: Dart = {
        id: tempId,
        visitId: "pending",
        index: 0,
        segment: segment.segment,
        ring: segment.ring,
        score: scoreOf(segment),
        targetSegment: target.targetSegment,
        targetRing: target.targetRing,
        thrownAt: new Date().toISOString(),
        latencyMs,
      }
      dispatch({ type: "THROW", dart })

      enqueue(async () => {
        try {
          const res = await throwDart(game.id, {
            segment: segment.segment,
            ring: segment.ring,
            targetSegment: target.targetSegment,
            targetRing: target.targetRing,
            latencyMs,
          })
          dispatch({ type: "CONFIRM", tempId, dart: res.dart })
        } catch (err) {
          dispatch({ type: "ROLLBACK", dartId: tempId })
          toast("Dart not recorded. Try again")
          if (process.env.NODE_ENV === "development") console.error("throwDart failed", err)
        }
      })
    },
    [game.id, gameState.legComplete, gameState.currentVisit.length, enqueue]
  )

  const handleHumanThrow = useCallback(
    (segment: Segment) => {
      if (isBotTurn || complete) return
      const target = practiceState
        ? dartTargetFor(practiceState)
        : { targetSegment: null, targetRing: null }
      recordThrow(segment, target)
    },
    [isBotTurn, complete, practiceState, recordThrow]
  )

  // ── bot orchestration: one dart at a time, at a walking pace ───────────
  const botScore = botProfile
    ? gameState.players.find((p) => p.playerId === currentPlayer!.id)?.score ?? 0
    : 0
  useEffect(() => {
    if (!isBotTurn || !botProfile) return
    const dartsRemaining = (3 - gameState.currentVisit.length) as 1 | 2 | 3
    const target = chooseTarget(botScore, dartsRemaining, botProfile)
    // 1.2-2.5s per dart, longer before a checkout attempt.
    const delay = 1200 + Math.random() * 1300 + (target.ring === "D" ? 800 : 0)
    const timer = setTimeout(() => {
      const landed = simulateThrow(target, sigmaFor(target, botProfile), () => Math.random())
      recordThrow(landed, { targetSegment: target.segment, targetRing: target.ring })
    }, delay)
    return () => clearTimeout(timer)
  }, [isBotTurn, botProfile, botScore, gameState.currentVisit.length, recordThrow])

  // ── undo ───────────────────────────────────────────────────────────────
  const undoDisabled =
    state.darts.length === 0 ||
    complete ||
    (isBotGame && (isBotTurn || gameState.currentVisit.length === 0))

  const handleUndo = useCallback(() => {
    if (undoDisabled) return
    const removed = state.darts[state.darts.length - 1]
    dispatch({ type: "UNDO" })
    lastTapAt.current = null
    enqueue(async () => {
      try {
        await undoDart(game.id)
      } catch (err) {
        dispatch({ type: "RESTORE", dart: removed })
        toast("Undo failed. Try again")
        if (process.env.NODE_ENV === "development") console.error("undoDart failed", err)
      }
    })
  }, [undoDisabled, state.darts, game.id, enqueue])

  // ── leg / game completion sheets ───────────────────────────────────────
  const showLegSheet =
    !isPractice &&
    gameState.legComplete &&
    !gameState.gameComplete &&
    state.acknowledgedLegIndex < gameState.legIndex

  const handleNextLeg = () => {
    dispatch({ type: "ACK_LEG", legIndex: gameState.legIndex })
    lastTapAt.current = null
    enqueue(() => startNextLeg(game.id).catch(() => {}))
  }

  const finishTo = trainingReturn ? `/training/run/${trainingReturn.sessionId}` : null

  const finishSession = useCallback(() => {
    if (trainingReturn) {
      // Record which game fulfilled the block, then return to the runner.
      recordTrainingBlock(trainingReturn.sessionId, trainingReturn.blockIndex, game.id)
        .catch(() => toast("Could not record the block"))
        .finally(() => router.push(finishTo!))
      return
    }
    router.push(isPractice ? "/practice" : "/")
  }, [trainingReturn, game.id, router, finishTo, isPractice])

  const quit = () => {
    if (!complete) void abandonGame(game.id).catch(() => {})
    router.push(finishTo ?? "/")
  }

  const winnerState = gameState.winnerPlayerId
    ? gameState.players.find((p) => p.playerId === gameState.winnerPlayerId)
    : null
  const winnerVisitDarts = gameState.lastVisit?.darts ?? []
  const checkoutLabel = winnerVisitDarts.map((d) => labelOf({ segment: d.segment, ring: d.ring })).join(" ")

  // ── layout ─────────────────────────────────────────────────────────────
  const me = gameState.players.find((p) => p.playerId === gameState.currentPlayerId)!
  const route =
    !isPractice && !gameState.legComplete
      ? findCheckout(me.score, (3 - gameState.currentVisit.length) as 1 | 2 | 3)
      : null
  const practiceRoute =
    practiceState &&
    !practiceState.complete &&
    practiceState.attemptRemaining !== undefined &&
    (game.mode === "checkout-ladder" ||
      (game.mode === "random-checkout" && practiceConfig?.showFinish))
      ? findCheckout(
          practiceState.attemptRemaining,
          Math.max(1, Math.min(3, practiceState.attemptDartsLeft ?? 3)) as 1 | 2 | 3
        )
      : null

  const clearKey = state.darts.length + state.undoCount * 1000

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-slate2 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-chalk">
      {/* The throwing UI is portrait only (PRD 7.2). */}
      <div className="absolute inset-0 z-50 hidden place-items-center bg-slate2 px-8 text-center [@media(orientation:landscape)_and_(max-height:500px)]:grid">
        <p className="font-mono text-sm text-tung">Turn the phone back to portrait to keep throwing.</p>
      </div>
      <div className="relative">
        {isPractice ? (
          /* Match figures mean nothing mid-drill: the header names the drill instead. */
          <header
            className="flex flex-none items-baseline gap-3 bg-bed px-3 py-2 pr-20"
            data-testid="practice-header"
          >
            <span className="truncate text-sm font-semibold">
              {GAME_GUIDES[game.mode].title}
            </span>
            {trainingLabel && (
              <span className="truncate font-mono text-[11px] text-tung">{trainingLabel}</span>
            )}
          </header>
        ) : (
          <PlayerRail
            players={players}
            states={gameState.players}
            currentPlayerId={gameState.currentPlayerId}
            showLegs={deriveConfig.legsToWin > 1}
          />
        )}
        <button
          className="absolute right-0 top-0 h-full px-3 font-mono text-xs text-tung"
          onClick={quit}
          data-testid="quit-game"
          aria-label="Quit game"
        >
          ✕
        </button>
        <button
          className="absolute right-9 top-0 h-full px-3 font-mono text-sm text-wire"
          onClick={() => setShowHelp(true)}
          data-testid="help-button"
          aria-label="How to play"
        >
          ?
        </button>
      </div>

      {isPractice && practiceState && practiceHud ? (
        <PracticeBand
          hud={practiceHud}
          targetLabel={practiceState.targetLabel}
          visitDarts={state.darts.slice(practiceVisitStart(state.darts.length))}
          finishLabel={
            practiceRoute ? `Finish · ${practiceRoute.map(labelOf).join("  ")}` : ""
          }
          onUndo={handleUndo}
          undoDisabled={undoDisabled}
        />
      ) : (
        <ScoreDisplay
          score={me.score}
          currentVisit={gameState.currentVisit}
          route={route}
          bust={Boolean(gameState.lastVisit?.bust) && gameState.currentVisit.length === 0}
          onUndo={handleUndo}
          undoDisabled={undoDisabled}
        />
      )}

      {route && <FinishStrip route={route} onThrow={handleHumanThrow} disabled={isBotTurn} />}
      {practiceRoute && <FinishStrip route={practiceRoute} onThrow={handleHumanThrow} />}

      {isBotTurn && (
        <p className="flex-none bg-bed px-3 py-1 text-center font-mono text-xs uppercase tracking-widest text-wire" data-testid="bot-throwing">
          {currentPlayer?.displayName} to throw
        </p>
      )}

      <ThrowPad onThrow={handleHumanThrow} disabled={isBotTurn || complete} clearKey={clearKey} />

      {showLegSheet && winnerState && (
        <LegCompleteSheet
          title={`Leg won · ${players.find((p) => p.id === winnerState.playerId)?.displayName}`}
          figures={[
            { label: "Darts", value: String(winnerState.dartsThrown) },
            { label: "3-dart avg", value: winnerState.threeDartAverage.toFixed(2) },
            { label: "Checkout", value: checkoutLabel || "—" },
          ]}
          actionLabel="Next leg"
          onAction={handleNextLeg}
        />
      )}

      {!isPractice && gameState.gameComplete && winnerState && (
        <LegCompleteSheet
          title={`Game won · ${players.find((p) => p.id === winnerState.playerId)?.displayName}`}
          figures={[
            { label: "Darts", value: String(winnerState.dartsThrownTotal) },
            { label: "3-dart avg", value: winnerState.threeDartAverage.toFixed(2) },
            { label: "Checkout", value: checkoutLabel || "—" },
          ]}
          actionLabel={trainingReturn ? "Back to session" : "Done"}
          onAction={finishSession}
        />
      )}

      {showHelp && (
        <HelpSheet mode={game.mode} showPadPrimer onClose={() => setShowHelp(false)} />
      )}

      {isPractice && practiceState?.complete && (
        <PracticeCompleteSheet
          gameId={game.id}
          practiceKey={practiceKey!}
          practiceState={practiceState}
          doneLabel={trainingReturn ? "Back to session" : "Done"}
          onDone={finishSession}
        />
      )}
    </div>
  )
}

/** Index of the first dart of the current three-dart practice visit. */
function practiceVisitStart(dartCount: number): number {
  return dartCount - (dartCount % 3)
}

function PracticeCompleteSheet({
  gameId,
  practiceKey,
  practiceState,
  doneLabel,
  onDone,
}: {
  gameId: string
  practiceKey: PracticeGameKey
  practiceState: PracticeState
  doneLabel: string
  onDone: () => void
}) {
  const [isBest, setIsBest] = useState(false)
  useEffect(() => {
    let cancelled = false
    // The freshly written result carries this game's id via achievedAt; a
    // matching best means this run set it.
    getPracticeGames()
      .then(({ personalBests }) => {
        if (cancelled) return
        const best = personalBests[practiceKey]
        if (best && best.score === practiceState.finalScore) setIsBest(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [gameId, practiceKey, practiceState.finalScore])

  const figures = [
    {
      label: practiceState.eliminated ? "Eliminated at" : "Score",
      value: String(practiceState.finalScore ?? practiceState.score),
    },
    { label: "Darts", value: String(practiceState.dartsThrown) },
  ]
  if (practiceState.strikeRate !== undefined) {
    figures.push({ label: "T20 rate", value: `${practiceState.strikeRate}%` })
  }
  if (practiceState.shanghai) {
    figures.push({ label: "Shanghai", value: "Yes" })
  }

  return (
    <LegCompleteSheet
      title={practiceState.eliminated ? "Eliminated" : "Drill complete"}
      figures={figures}
      actionLabel={doneLabel}
      onAction={onDone}
      note={isBest ? "New personal best." : undefined}
    />
  )
}
