import Link from "next/link"

/** Placeholder. The CTA is "Create account" — Arrows has no subscription (PRD 7.8). */
export default function SignupPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-8">
      <h1 className="font-display text-3xl">Create account</h1>
      <p className="mt-3 text-sm text-tung">
        Creating an account saves your history across sessions and devices. It is free — there is
        no paid tier. Accounts arrive in Phase 2.
      </p>
      <Link href="/" className="mt-6 text-sm text-wire">
        Back to the board
      </Link>
    </div>
  )
}
