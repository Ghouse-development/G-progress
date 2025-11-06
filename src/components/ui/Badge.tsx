import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "error"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold transition-colors",
        {
          "bg-gray-100 text-gray-900": variant === "default",
          "bg-green-100 text-green-800": variant === "success",
          "bg-amber-100 text-amber-800": variant === "warning",
          "bg-red-100 text-red-800": variant === "error",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
