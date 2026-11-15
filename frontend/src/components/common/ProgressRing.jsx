import React from "react"
import { motion } from "framer-motion"

export function ProgressRing({
  radius = 64,
  stroke = 10,
  progress = 0,
  label = "Adherence",
  sublabel = "",
}) {
  const normalizedRadius = radius - stroke * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative inline-flex items-center justify-center">
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            className="text-slate-100 dark:text-slate-800"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <motion.circle
            stroke="#14B8A6"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl md:text-4xl font-extrabold text-navy-900 dark:text-white tracking-tight">
            {Math.round(progress)}%
          </span>
          {sublabel && (
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              {sublabel}
            </span>
          )}
        </div>
      </div>
      {label && (
        <span className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
          {label}
        </span>
      )}
    </div>
  )
}
