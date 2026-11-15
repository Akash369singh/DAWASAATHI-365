import React from "react"
import { CheckCircle2, AlertTriangle, ChevronRight } from "lucide-react"
import { NavLink } from "react-router-dom"

export function StatusAlertBanner({ summary, hasAlert = false, nextAppointment }) {
  return (
    <div className="space-y-2">
      {/* Quiet Status Line */}
      <div
        className={`flex items-center justify-between p-3.5 rounded-2xl text-xs md:text-sm font-semibold transition-colors ${
          hasAlert
            ? "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40"
            : "bg-slate-100/70 text-slate-600 border border-app-border dark:bg-app-dark-surface dark:text-slate-300 dark:border-app-dark-border"
        }`}
      >
        <div className="flex items-center gap-2">
          {hasAlert ? (
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
          )}
          <span>{summary || "All good. System running smoothly."}</span>
        </div>
      </div>

      {/* Next Appointment small bottom line */}
      {nextAppointment && (
        <NavLink
          to="/appointments"
          className="flex items-center justify-between p-3 rounded-2xl text-xs text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-app-dark-surface border border-transparent hover:border-app-border transition-all"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-navy-900 dark:text-white">Next Appointment:</span>
            <span>
              {nextAppointment.doctor_name} ({nextAppointment.scheduled_datetime_local})
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </NavLink>
      )}
    </div>
  )
}
