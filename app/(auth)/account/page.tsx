"use client"

import { useUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toaster"

export default function AccountPage() {
  const user = useUser()
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8">
      <h1 className="font-display text-3xl">Account</h1>
      <p className="mt-3 text-sm text-tung">
        {user ? `Signed in as ${user.displayName}.` : "Not signed in."}
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Button variant="ghost" onClick={() => toast("Sign out arrives with real auth in Phase 2")}>
          Sign out
        </Button>
        <Button
          variant="ghost"
          className="text-dbl"
          onClick={() => toast("Data deletion arrives with the real backend in Phase 2")}
        >
          Delete all data
        </Button>
      </div>
    </div>
  )
}
