import { NextResponse } from "next/server"
import { HttpError } from "./errors"

/** Uniform error envelope matching the Phase 1 mock handlers. */
export async function handle<T>(fn: () => Promise<T>, status = 200): Promise<NextResponse> {
  try {
    return NextResponse.json(await fn(), { status })
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ message: err.message }, { status: err.status })
    }
    console.error(err)
    return NextResponse.json({ message: "Internal error" }, { status: 500 })
  }
}
