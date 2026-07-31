import Link from "next/link"

/** Placeholder. Clerk-hosted login arrives in Phase 2. */
export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-8">
      <h1 className="font-display text-3xl">Log in</h1>
      <p className="mt-3 text-sm text-tung">
        Accounts arrive in Phase 2. In development, use the mock auth toggle in the corner.
      </p>
      <Link href="/" className="mt-6 text-sm text-wire">
        Back to the board
      </Link>
    </div>
  )
}
