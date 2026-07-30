"use client"

import { useState } from "react"
import { MOCK_USERS, useMockAuthStore } from "@/lib/auth/mock-auth"
import { cn } from "@/lib/utils/cn"

const STATES = [
  { key: "anonymous", label: "Anonymous" },
  { key: "player", label: "Player" },
  { key: "admin", label: "Admin" },
] as const

/** Dev-only floating toggle to switch auth states. Not rendered in production. */
export function MockAuthToggle() {
  const [open, setOpen] = useState(false)
  const { state, setState } = useMockAuthStore()
  if (process.env.NODE_ENV !== "development") return null

  const current =
    state.type === "anonymous" ? "anonymous" : state.user.role === "admin" ? "admin" : "player"

  return (
    <div className="fixed bottom-3 right-3 z-50 flex flex-col items-end gap-1" data-testid="mock-auth-toggle">
      {open &&
        STATES.map((s) => (
          <button
            key={s.key}
            className={cn(
              "rounded border border-wire/60 bg-bed px-3 py-1.5 text-xs",
              current === s.key ? "text-wire" : "text-tung"
            )}
            onClick={() => {
              setState(
                s.key === "anonymous"
                  ? { type: "anonymous" }
                  : { type: "user", user: MOCK_USERS[s.key] }
              )
              setOpen(false)
            }}
          >
            {s.label}
          </button>
        ))}
      <button
        className="rounded border border-wire/60 bg-bed px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-wire"
        onClick={() => setOpen((o) => !o)}
      >
        Mock auth · {current}
      </button>
    </div>
  )
}
