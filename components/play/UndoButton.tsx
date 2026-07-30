"use client"

/** Permanent, full size, never behind a menu. */
export function UndoButton({
  onUndo,
  disabled,
}: {
  onUndo: () => void
  disabled: boolean
}) {
  return (
    <button
      className="min-h-[44px] px-4 text-sm font-semibold text-chalk shadow-[inset_0_0_0_1px_#3A4048] active:brightness-150 disabled:opacity-30"
      onPointerDown={() => !disabled && onUndo()}
      disabled={disabled}
      data-testid="undo-button"
    >
      Undo dart
    </button>
  )
}
