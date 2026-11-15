import React from "react"
import { Check, Clock, AlertTriangle, XCircle, HeartPulse, ShieldAlert } from "lucide-react"
import { cn } from "../../lib/utils"

export function Chip({ status, label, icon = true, className }) {
  const normalized = (status || "").toUpperCase()

  let styles = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
  let Icon = Clock
  let defaultLabel = status

  if (normalized === "TAKEN" || normalized === "COMPLETED") {
    styles = "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40"
    Icon = Check
    defaultLabel = "Taken"
  } else if (normalized === "PENDING" || normalized === "SCHEDULED") {
    styles = "bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800/40"
    Icon = Clock
    defaultLabel = "Pending"
  } else if (normalized === "MISSED") {
    styles = "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/40"
    Icon = XCircle
    defaultLabel = "Missed"
  } else if (normalized === "SKIPPED") {
    styles = "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40"
    Icon = AlertTriangle
    defaultLabel = "Skipped"
  } else if (normalized === "SOS") {
    styles = "bg-red-500 text-white animate-pulse"
    Icon = ShieldAlert
    defaultLabel = "Emergency Alert"
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs md:text-sm font-semibold tracking-wide select-none",
        styles,
        className
      )}
    >
      {icon && <Icon className="w-3.5 h-3.5 stroke-[2.5]" />}
      <span>{label || defaultLabel}</span>
    </span>
  )
}
