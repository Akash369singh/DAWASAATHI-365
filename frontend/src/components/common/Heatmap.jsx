import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

export function Heatmap({ data = [], title = "30-Day Medication Adherence Pattern" }) {
  const [hoveredDay, setHoveredDay] = useState(null)

  // Color intensities
  const getLevelColor = (level) => {
    switch (level) {
      case 4:
        return "bg-teal-500 hover:bg-teal-600"
      case 3:
        return "bg-teal-400/80 hover:bg-teal-400"
      case 2:
        return "bg-amber-400/80 hover:bg-amber-400"
      case 1:
        return "bg-red-400/80 hover:bg-red-400"
      default:
        return "bg-slate-100 dark:bg-slate-800"
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-bold text-navy-900 dark:text-white">{title}</h4>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>Missed</span>
          <div className="w-3 h-3 rounded bg-red-400" />
          <div className="w-3 h-3 rounded bg-amber-400" />
          <div className="w-3 h-3 rounded bg-teal-400" />
          <div className="w-3 h-3 rounded bg-teal-500" />
          <span>100%</span>
        </div>
      </div>

      <div className="relative">
        <div className="grid grid-flow-col grid-rows-5 gap-2.5 overflow-x-auto pb-2">
          {data.map((day, idx) => (
            <motion.div
              key={day.date || idx}
              whileHover={{ scale: 1.15 }}
              onMouseEnter={() => setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
              className={`w-7 h-7 rounded-lg cursor-pointer transition-colors ${getLevelColor(
                day.level
              )}`}
            />
          ))}
        </div>

        {/* Floating tooltip */}
        <AnimatePresence>
          {hoveredDay && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute -top-12 left-1/2 -translate-x-1/2 bg-navy-900 text-white text-xs rounded-xl px-3.5 py-1.5 shadow-soft-lg z-20 pointer-events-none whitespace-nowrap"
            >
              <div className="font-bold">{hoveredDay.date}</div>
              <div>
                {hoveredDay.taken}/{hoveredDay.total} doses taken ({hoveredDay.adherence_pct}%)
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
