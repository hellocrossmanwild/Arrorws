import { forwardRef } from "react"
import { cn } from "@/lib/utils/cn"

type Variant = "primary" | "ghost" | "quiet"

const styles: Record<Variant, string> = {
  primary: "bg-chalk text-slate2 font-bold",
  ghost: "bg-transparent text-chalk shadow-[inset_0_0_0_1px_theme(colors.wire)]",
  quiet: "bg-bed text-chalk",
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "min-h-[44px] px-4 py-3 text-base disabled:opacity-40",
        styles[variant],
        className
      )}
      {...props}
    />
  )
})
