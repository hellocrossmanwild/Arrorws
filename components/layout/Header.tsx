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
    <header className="border-b border-wire/40 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/" className="font-display text-base tracking-tight sm:text-lg">
          ARROWS
        </Link>
        <nav className="flex min-w-0 items-center gap-2.5 text-xs sm:gap-4 sm:text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "min-h-[44px] content-center text-tung hover:text-chalk",
                pathname === item.href && "text-chalk"
              )}
            >
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "min-h-[44px] content-center text-tung hover:text-chalk",
                pathname === "/admin" && "text-chalk"
              )}
            >
              Admin
            </Link>
          )}
          <Link
            href="/account"
            className="min-h-[44px] max-w-[72px] content-center truncate text-wire"
            aria-label="Account"
          >
            {user ? user.displayName : "Account"}
          </Link>
        </nav>
      </div>
    </header>
  )
}
