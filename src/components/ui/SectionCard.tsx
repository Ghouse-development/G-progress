import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "./Card"
import { cn } from "../../lib/utils"

export interface SectionCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}

const SectionCard = React.forwardRef<HTMLDivElement, SectionCardProps>(
  ({ title, subtitle, children, className }, ref) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card ref={ref} className={cn("", className)}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-baseline gap-3">
              <span className="text-base font-semibold text-gray-900">{title}</span>
              {subtitle && <span className="text-xs text-gray-500 font-normal">{subtitle}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">{children}</CardContent>
        </Card>
      </motion.div>
    )
  }
)

SectionCard.displayName = "SectionCard"

export { SectionCard }
