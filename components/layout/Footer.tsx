"use client"

import { usePathname } from "next/navigation"

export function Footer() {
  const pathname = usePathname()
  if (pathname?.startsWith("/play/")) return null
  return (
    <footer className="mt-auto border-t border-wire/40 px-4 py-3 text-center font-mono text-[10px] uppercase tracking-widest text-tung">
      Arrows · per-dart scoring
    </footer>
  )
}
