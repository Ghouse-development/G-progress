import * as React from "react"
import { Progress } from "./Progress"
import { cn } from "../../lib/utils"

export interface ProgressStatProps {
  label: string
  value: number
  max?: number
  className?: string
}

const ProgressStat = React.forwardRef<HTMLDivElement, ProgressStatProps>(
  ({ label, value, max = 100, className }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))

    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700 font-medium">{label}</span>
          <span className="text-gray-900 font-semibold">{Math.round(percentage)}%</span>
        </div>
        <Progress value={value} max={max} />
      </div>
    )
  }
)

ProgressStat.displayName = "ProgressStat"

export { ProgressStat }
