import * as React from "react"
import { motion } from "framer-motion"
import { Button, ButtonProps } from "./Button"
import { cn } from "../../lib/utils"

export interface GradientButtonProps extends ButtonProps {}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
        <Button
          ref={ref}
          className={cn(
            "bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:brightness-105 shadow-sm hover:shadow-lg transition-all",
            className
          )}
          {...props}
        >
          {children}
        </Button>
      </motion.div>
    )
  }
)

GradientButton.displayName = "GradientButton"

export { GradientButton }
