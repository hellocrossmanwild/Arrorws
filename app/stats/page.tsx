"use client"

import { useEffect, useState } from "react"
import { getStats, type StatsFilters, type StatsResponse } from "@/lib/api/stats"
import { DoublesHeatmap } from "@/components/stats/DoublesHeatmap"
import { TrendLine } from "@/components/stats/TrendLine"
import { cn } from "@/lib/utils/cn"

type DateRange = "all" | "90" | "30"

const FILTER_STORAGE_KEY = "arrows-stats-filters"

interface UiFilters {
  includeBots: boolean
  includeTwoPlayer: boolean
  range: DateRange
  source: "practice" | "all"
}

const DEFAULT_FILTERS: UiFilters = {
  includeBots: true,
  includeTwoPlayer: true,
  range: "all",
  source: "all",
}

export default function StatsPage() {
  const [filters, setFilters] = useState<UiFilters>(() => {
    if (typeof window === "undefined") return DEFAULT_FILTERS
    try {
      const raw = window.localStorage.getItem(FILTER_STORAGE_KEY)
      return raw ? { ...DEFAULT_FILTERS, ...JSON.parse(raw) } : DEFAULT_FILTERS
    } catch {
      return DEFAULT_FILTERS
    }
  })
  const [data, setData] = useState<StatsResponse | null>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters))
    } catch {}
    const controller = new AbortController()
    const apiFilters: StatsFilters = {
      includeBots: filters.includeBots,
      includeTwoPlayer: filters.includeTwoPlayer,
      source: filters.source,
    }
    if (filters.range !== "all") {
      const days = Number(filters.range)
      apiFilters.from = new Date(Date.now() - days * 86_400_000).toISOString()
    }
    getStats(apiFilters)
      .then((res) => {
        if (!controller.signal.aborted) setData(res)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [filters])

  const toggle = (key: "includeBots" | "includeTwoPlayer") =>
    setFilters((f) => ({ ...f, [key]: !f[key] }))

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      {/* ── headline ─────────────────────────────────────────────────── */}
      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-wire">
          Three-dart average · last {data?.headline.sessionCount ?? 0} sessions
        </p>
        <div className="flex items-baseline gap-3">
          <span className="font-display text-6xl tabular-nums" data-testid="headline-average">
            {data?.headline.threeDartAverage?.toFixed(1) ?? "—"}
          </span>
          {data?.headline.deltaVsPrevious !== null && data?.headline.deltaVsPrevious !== undefined && (
            <span className="font-mono text-sm text-tung" data-testid="headline-delta">
              {data.headline.deltaVsPrevious >= 0 ? "+" : ""}
              {data.headline.deltaVsPrevious.toFixed(1)} vs previous
            </span>
          )}
        </div>
      </section>

      {/* ── trend ────────────────────────────────────────────────────── */}
      <section className="mt-6">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-wire">Trend</p>
        <TrendLine points={data?.trend ?? []} />
      </section>

      {/* ── the doubles heatmap ──────────────────────────────────────── */}
      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-wire">Doubles</p>
          <div className="flex gap-px bg-wire/40 text-xs">
            {(["all", "practice"] as const).map((source) => (
              <button
                key={source}
                className={cn(
                  "px-3 py-1.5",
                  filters.source === source ? "bg-bed text-chalk" : "bg-slate2 text-tung"
                )}
                onClick={() => setFilters((f) => ({ ...f, source }))}
                data-testid={`source-${source}`}
              >
                {source === "all" ? "Everything" : "Practice only"}
              </button>
            ))}
          </div>
        </div>
        <p className="mb-2 font-mono text-[10px] text-tung" data-testid="source-note">
          {filters.source === "practice"
            ? "Practice throws only. Every attempt is an exact recorded target."
            : data?.attemptsAreInferred
              ? "Includes 501 attempts, which are inferred from the score and approximate."
              : "Exact recorded targets."}
        </p>
        {data && data.doubles.every((d) => d.attempts === 0) ? (
          <p className="bg-bed px-4 py-6 text-sm text-tung">
            No doubles data yet. Throw a doubles drill.
          </p>
        ) : (
          <DoublesHeatmap cells={data?.doubles ?? []} />
        )}
      </section>

      {/* ── counts ───────────────────────────────────────────────────── */}
      <section className="mt-6 grid grid-cols-5 gap-px bg-wire/40" data-testid="counts">
        {[
          { label: "180s", value: data?.counts.count180 },
          { label: "140+", value: data?.counts.count140plus },
          { label: "100+", value: data?.counts.count100plus },
          { label: "Best leg", value: data?.counts.bestLegDarts ?? "—" },
          { label: "Best out", value: data?.counts.bestCheckout ?? "—" },
        ].map((item) => (
          <div key={item.label} className="bg-bed px-2 py-3">
            <span className="block font-mono text-[10px] uppercase tracking-widest text-tung">
              {item.label}
            </span>
            <span className="font-display text-xl">{item.value ?? "—"}</span>
          </div>
        ))}
      </section>

      {/* ── filters ──────────────────────────────────────────────────── */}
      <section className="mt-6 flex flex-wrap items-center gap-4 text-sm text-tung">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.includeBots}
            onChange={() => toggle("includeBots")}
            className="h-4 w-4 accent-[#B08D57]"
            data-testid="filter-bots"
          />
          Include bot games
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.includeTwoPlayer}
            onChange={() => toggle("includeTwoPlayer")}
            className="h-4 w-4 accent-[#B08D57]"
            data-testid="filter-two-player"
          />
          Include two player
        </label>
        <select
          value={filters.range}
          onChange={(e) => setFilters((f) => ({ ...f, range: e.target.value as DateRange }))}
          className="border border-wire/60 bg-bed px-2 py-1 text-chalk"
          data-testid="filter-range"
        >
          <option value="all">All time</option>
          <option value="90">Last 90 days</option>
          <option value="30">Last 30 days</option>
        </select>
      </section>
    </div>
  )
}
