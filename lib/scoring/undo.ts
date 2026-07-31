import type { Dart } from "@/lib/types"

/**
 * Undo is "delete the last dart and re-derive", never "add the value back
 * on". Returning the log without its final element is the entire
 * implementation — a test asserts nothing more elaborate ever creeps in.
 * See ADR 0003.
 */
export function undoLastDart(darts: Dart[]): Dart[] {
  return darts.slice(0, -1)
}
