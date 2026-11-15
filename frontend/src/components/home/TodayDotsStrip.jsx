import React from "react"
import { Check, Clock, X, AlertTriangle } from "lucide-react"

export function TodayDotsStrip({ doses = [], completed = 0, total = 0 }) {
  if (!doses || !Array.isArray(doses) || doses.length === 0) return null

  return (
    <div className="bg-white dark:bg-app-dark-surface rounded-2xl border border-app-border dark:border-app-dark-border p-4 shadow-soft-sm flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Today's Doses
        </span>
        <span className="text-sm font-extrabold text-navy-900 dark:text-white">
          {completed} of {total} done
        </span>
      </div>

      <div className="flex items-center gap-2">
        {doses.map((dose) => {
          let dotStyle = "border-2 border-slate-300 dark:border-slate-700 bg-transparent text-slate-400"
          let Icon = Clock

          if (dose.status === "TAKEN") {
            dotStyle = "bg-teal-500 border-2 border-teal-500 text-white"
            Icon = Check
          } else if (dose.status === "MISSED") {
            dotStyle = "bg-red-500 border-2 border-red-500 text-white"
            Icon = X
          } else if (dose.status === "SKIPPED") {
            dotStyle = "bg-amber-500 border-2 border-amber-500 text-white"
            Icon = AlertTriangle
          }

          return (
            <div
              key={dose.id}
              title={`${dose.medication_name} at ${dose.scheduled_at_local} (${dose.status})`}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${dotStyle}`}
            >
              <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
