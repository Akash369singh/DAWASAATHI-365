import React from "react"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  disabled = false,
  loading = false,
  onClick,
  type = "button",
  icon: Icon,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-bold transition-colors select-none focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"

  const variants = {
    primary:
      "bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white shadow-soft-md shadow-teal-500/20 focus:ring-teal-500",
    secondary:
      "bg-navy-50 hover:bg-navy-100 text-navy-900 dark:bg-app-dark-surface dark:hover:bg-navy-800 dark:text-app-dark-text focus:ring-navy-800",
    outline:
      "border-2 border-app-border dark:border-app-dark-border text-navy-900 dark:text-app-dark-text hover:bg-navy-50 dark:hover:bg-app-dark-surface focus:ring-teal-500",
    danger:
      "bg-red-500 hover:bg-red-600 text-white shadow-soft-md shadow-red-500/20 focus:ring-red-500",
    ghost:
      "text-navy-900 dark:text-app-dark-text hover:bg-navy-50 dark:hover:bg-app-dark-surface",
  }

  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-xl min-h-[40px]",
    md: "px-5 py-2.5 text-base rounded-2xl min-h-[48px]",
    lg: "px-6 py-3.5 text-lg rounded-2xl min-h-[56px]",
    giant: "w-full py-5 text-xl md:text-2xl rounded-3xl min-h-[64px] tracking-wide",
  }

  return (
    <motion.button
      type={type}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      transition={{ duration: 0.15 }}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      ) : Icon ? (
        <Icon className={cn("w-5 h-5", children ? "mr-2.5" : "")} strokeWidth={2} />
      ) : null}
      {children}
    </motion.button>
  )
}
