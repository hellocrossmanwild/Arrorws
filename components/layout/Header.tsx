"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useIsAdmin, useUser } from "@/lib/auth"
import { cn } from "@/lib/utils/cn"

const NAV = [
  { href: "/", label: "Play" },
  { href: "/practice", label: "Practice" },
  { href: "/stats", label: "Stats" },
  { href: "/history", label: "History" },
]

export function Header() {
  const pathname = usePathname()
  const user = useUser()
  const isAdmin = useIsAdmin()

  // The live game owns the whole viewport; no chrome on top of the pad.
  if (pathname?.startsWith("/play/")) return null

  return (
    <header className="border-b border-wire/40">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-display text-lg tracking-tight">
          ARROWS
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-tung hover:text-chalk",
                pathname === item.href && "text-chalk"
              )}
            >
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin" className={cn("text-tung hover:text-chalk", pathname === "/admin" && "text-chalk")}>
              Admin
            </Link>
          )}
          <Link href="/account" className="text-wire">
            {user ? user.displayName : "Account"}
          </Link>
        </nav>
      </div>
    </header>
  )
}
