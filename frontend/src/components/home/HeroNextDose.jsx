import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Clock, AlertTriangle, Pill, ArrowRight } from "lucide-react"
import confetti from "canvas-confetti"

export function HeroNextDose({ nextDose, onTake, onSkip, onSnooze, elderName }) {
  const [taking, setTaking] = useState(false)
  const [snoozing, setSnoozing] = useState(false)
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false)
  const [justTaken, setJustTaken] = useState(false)
  const [countdownText, setCountdownText] = useState("")

  const handleSnoozeClick = async (minutes) => {
    if (!nextDose || snoozing) return
    setSnoozing(true)
    try {
      if (onSnooze) {
        await onSnooze(nextDose.id, minutes)
      }
      setShowSnoozeOptions(false)
    } catch (err) {
      console.error("Failed to snooze dose:", err)
    } finally {
      setSnoozing(false)
    }
  }

  useEffect(() => {
    if (!nextDose?.scheduled_at) {
      setCountdownText("")
      return
    }

    const updateCountdown = () => {
      if (!nextDose?.scheduled_at) {
        setCountdownText("")
        return
      }

      const now = new Date()
      const targetTimeStr =
        nextDose.is_snoozed && nextDose.snoozed_until
          ? nextDose.snoozed_until
          : nextDose.scheduled_at

      const target = new Date(targetTimeStr)
      if (isNaN(target.getTime())) {
        setCountdownText("")
        return
      }

      const diffMs = target - now
      const diffMins = Math.round(diffMs / 60000)
      if (isNaN(diffMins)) {
        setCountdownText("")
        return
      }

      if (diffMins > 0) {
        if (diffMins >= 60) {
          const hours = Math.floor(diffMins / 60)
          const mins = diffMins % 60
          setCountdownText(`in ${hours}h ${mins}m`)
        } else {
          setCountdownText(`in ${diffMins} min`)
        }
      } else if (diffMins === 0) {
        setCountdownText("due right now")
      } else {
        const absMins = Math.abs(diffMins)
        setCountdownText(`overdue by ${absMins} min`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 15000)
    return () => clearInterval(interval)
  }, [nextDose])

  const handleTakeClick = async () => {
    if (!nextDose || taking) return
    setTaking(true)
    try {
      await onTake(nextDose.id)
      setJustTaken(true)

      // Calm gentle celebratory burst
      confetti({
        particleCount: 25,
        spread: 40,
        origin: { y: 0.7 },
        colors: ["#14B8A6", "#10B981", "#3B82F6"],
      })

      setTimeout(() => {
        setJustTaken(false)
        setTaking(false)
      }, 1500)
    } catch (err) {
      setTaking(false)
    }
  }

  if (!nextDose) {
    return (
      <div className="bg-white dark:bg-app-dark-surface rounded-3xl p-8 border border-app-border dark:border-app-dark-border text-center shadow-soft-sm">
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4">
          <Check className="w-8 h-8 stroke-[2.5]" />
        </div>
        <h3 className="text-2xl font-extrabold text-navy-900 dark:text-white mb-2">
          All Scheduled Doses Complete!
        </h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-base">
          Great job maintaining your health today, {elderName || "Uncle ji"}. Rest well!
        </p>
      </div>
    )
  }

  const isOverdue = countdownText.includes("overdue")

  return (
    <div className={`relative bg-white dark:bg-app-dark-surface rounded-4xl border p-6 md:p-8 shadow-[0_12px_36px_rgba(11,31,58,0.06)] transition-all ${
      isOverdue ? "border-amber-300 dark:border-amber-800/60 ring-2 ring-amber-400/20" : "border-app-border dark:border-app-dark-border"
    }`}>
      <AnimatePresence mode="wait">
        {justTaken ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="w-20 h-20 rounded-full bg-emerald-500 text-white mx-auto flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30"
            >
              <Check className="w-10 h-10 stroke-[3]" />
            </motion.div>
            <h3 className="text-2xl font-bold text-navy-900 dark:text-white mb-1">
              Recorded as Taken ✓
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Dashboard and Care Circle updated live.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header pill: Time & Countdown */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-3 py-1 rounded-full">
                Next Medicine
              </span>
              <div
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                  isOverdue
                    ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {nextDose.scheduled_at_local} ({countdownText})
                </span>
              </div>
            </div>

            {/* Medicine details */}
            <div className="flex items-start gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Pill className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-extrabold text-navy-900 dark:text-white tracking-tight">
                  {nextDose.medication_name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-base font-bold text-teal-600 dark:text-teal-400">
                    {nextDose.dosage}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {nextDose.instructions || "After food"}
                  </span>
                </div>
              </div>
            </div>

            {/* Feature 3: Snooze status pill if already snoozed */}
            {nextDose.is_snoozed && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-xs font-semibold text-amber-900 dark:text-amber-200 mb-4">
                <span className="flex items-center gap-2">
                  <span className="text-sm">⏳</span>
                  <span>
                    Snoozed until <strong>{nextDose.snoozed_until_local || "later"}</strong> ({nextDose.snooze_count || 1}/2)
                  </span>
                </span>
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
                  Alerts Paused
                </span>
              </div>
            )}

            {/* Giant Primary Action Button (64px) & Quiet Snooze / Skip Controls */}
            <div className="space-y-3">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleTakeClick}
                disabled={taking}
                className="w-full py-5 bg-teal-500 hover:bg-teal-600 text-white rounded-3xl font-extrabold text-xl md:text-2xl min-h-[64px] flex items-center justify-center gap-3 shadow-soft-md shadow-teal-500/25 transition-all select-none"
              >
                {taking ? (
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-7 h-7 stroke-[3]" />
                    <span>I took it ✓</span>
                  </>
                )}
              </motion.button>

              {/* Quiet Secondary Row: Running Late (Snooze 15/30/60) & Skip */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                {(nextDose.snooze_count || 0) >= 2 ? (
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    Max snoozes (2) reached
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSnoozeClick(30)}
                      disabled={snoozing}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-200 hover:text-teal-600 transition-colors"
                      title="Snooze and pause family escalation alerts"
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{snoozing ? "Snoozing..." : "Remind me in 30 min"}</span>
                    </button>

                    <button
                      onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
                      className="px-2 py-1.5 text-[11px] font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                      title="More snooze options"
                    >
                      {showSnoozeOptions ? "▲" : "15 / 60m"}
                    </button>

                    {showSnoozeOptions && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSnoozeClick(15)}
                          disabled={snoozing}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 transition-colors"
                        >
                          15m
                        </button>
                        <button
                          onClick={() => handleSnoozeClick(60)}
                          disabled={snoozing}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 transition-colors"
                        >
                          60m
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => onSkip(nextDose.id)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-auto"
                >
                  Skip dose
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
