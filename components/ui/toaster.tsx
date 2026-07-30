"use client"

import { create } from "zustand"

interface Toast {
  id: number
  message: string
}

interface ToastStore {
  toasts: Toast[]
  push: (message: string) => void
  dismiss: (id: number) => void
}

let toastId = 0

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message) => {
    toastId += 1
    const id = toastId
    set((s) => ({ toasts: [...s.toasts, { id, message }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** Imperative toast for user-facing errors. */
export function toast(message: string): void {
  useToastStore.getState().push(message)
}

export function Toaster() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[60] flex flex-col items-center gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className="pointer-events-auto max-w-[90vw] rounded border border-wire/60 bg-bed px-4 py-2 text-sm text-chalk shadow-lg"
        >
          {t.message}
        </button>
      ))}
    </div>
  )
}
