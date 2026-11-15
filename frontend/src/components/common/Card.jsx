import React from "react"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"

export function Card({ children, className, hover = false, onClick, ...props }) {
  const Component = onClick ? motion.div : "div"
  return (
    <Component
      onClick={onClick}
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ duration: 0.2 }}
      className={cn(
        "bg-white dark:bg-app-dark-surface rounded-3xl border border-app-border dark:border-app-dark-border p-6 shadow-soft-sm transition-colors",
        hover && "cursor-pointer hover:shadow-soft-md hover:border-teal-500/30",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
