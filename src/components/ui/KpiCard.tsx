import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "./Card"
import { Badge } from "./Badge"
import { cn } from "../../lib/utils"

export interface KpiCardProps {
  title: string
  value: string | number
  hint?: string
  badge?: string
  className?: string
}

const KpiCard = React.forwardRef<HTMLDivElement, KpiCardProps>(
  ({ title, value, hint, badge, className }, ref) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        whileHover={{ scale: 1.01 }}
      >
        <Card ref={ref} className={cn("", className)}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-gray-500 font-medium">{title}</CardTitle>
              {badge && (
                <Badge variant="default" className="text-sm">
                  {badge}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight text-gray-900">{value}</div>
            {hint && <div className="text-sm text-gray-500 mt-2">{hint}</div>}
          </CardContent>
        </Card>
      </motion.div>
    )
  }
)

KpiCard.displayName = "KpiCard"

export { KpiCard }
