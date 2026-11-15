import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Heart,
  CheckCircle2,
  Clock,
  AlertCircle,
  BellRing,
  Send,
  Sparkles,
  ShieldCheck,
  Activity,
  Flame,
  ChevronRight,
  Smile,
  RefreshCw,
} from "lucide-react"
import { api } from "../../lib/api"
import { useAuth } from "../../context/AuthContext"

export function ElderLiveWatchCard() {
  const { user } = useAuth()
  const [liveData, setLiveData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sendingNudge, setSendingNudge] = useState(false)
  const [nudgeSuccess, setNudgeSuccess] = useState("")
  const [customOpen, setCustomOpen] = useState(false)
  const [customText, setCustomText] = useState("")

  const fetchLiveStatus = async () => {
    try {
      const data = await api.getElderLiveStatus()
      setLiveData(data)
    } catch (err) {
      console.warn("Failed fetching elder live status:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLiveStatus()
    const timer = setInterval(fetchLiveStatus, 8000)
    return () => clearInterval(timer)
  }, [])

  const handleSendQuickNudge = async (type, custom = null) => {
    try {
      setSendingNudge(true)
      const res = await api.sendQuickNudge({ nudge_type: type, custom_message: custom })
      setNudgeSuccess(res.message || "Alert sent to Dada ji! ❤️")
      setCustomOpen(false)
      setCustomText("")
      setTimeout(() => setNudgeSuccess(""), 4000)
      fetchLiveStatus()
    } catch (err) {
      alert(err.message || "Failed to send nudge")
    } finally {
      setSendingNudge(false)
    }
  }

  if (loading && !liveData) {
    return (
      <div className="p-6 rounded-3xl bg-white dark:bg-app-dark-surface border border-app-border dark:border-app-dark-border shadow-soft-md animate-pulse">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4" />
        <div className="h-24 w-full bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4" />
        <div className="h-16 w-full bg-slate-100 dark:bg-slate-800 rounded-xl" />
      </div>
    )
  }

  if (!liveData) return null

  const isAllTaken = liveData.pending_doses_today === 0 && liveData.total_doses_today > 0
  const isMissed = liveData.missed_doses_today > 0

  return (
    <div className="rounded-3xl bg-gradient-to-b from-white to-slate-50 dark:from-app-dark-surface dark:to-[#0F1D32] border-2 border-teal-500/20 shadow-soft-lg p-5 sm:p-6 relative overflow-hidden transition-all duration-300">
      {/* Ambient background decoration */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white font-extrabold text-xl shadow-soft-sm shadow-teal-500/30">
              {liveData.elder_name?.charAt(0) || "D"}
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-app-dark-surface rounded-full flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-white animate-ping opacity-75" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-navy-900 dark:text-white tracking-tight">
                {liveData.elder_name} Live Status Watch
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300">
                Age {liveData.elder_age || 72}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live synched with Dada ji's device • Code: <span className="font-mono font-bold text-navy-900 dark:text-slate-200">{liveData.profile_code}</span>
            </p>
          </div>
        </div>

        <button
          onClick={fetchLiveStatus}
          className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors"
          title="Refresh live watch"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Reassurance Banner */}
      <div
        className={`p-4 rounded-2xl mb-5 flex items-center gap-3.5 border transition-all ${
          isMissed
            ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200"
            : isAllTaken
            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200"
            : "bg-teal-50/80 dark:bg-teal-950/30 border-teal-200/80 dark:border-teal-900/50 text-navy-900 dark:text-white"
        }`}
      >
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            isMissed
              ? "bg-rose-500 text-white"
              : isAllTaken
              ? "bg-emerald-500 text-white"
              : "bg-teal-500 text-white"
          }`}
        >
          {isMissed ? (
            <AlertCircle className="w-6 h-6" />
          ) : isAllTaken ? (
            <CheckCircle2 className="w-6 h-6" />
          ) : (
            <Clock className="w-6 h-6" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-black text-sm sm:text-base leading-tight">
            {liveData.status_headline}
          </div>
          <div className="text-xs sm:text-sm font-medium opacity-85 mt-0.5 leading-snug">
            {liveData.status_subtext}
          </div>
        </div>

        {/* Adherence Gauge */}
        <div className="text-right shrink-0">
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400 leading-none">
            {liveData.adherence_pct_today}%
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
            Today
          </div>
        </div>
      </div>

      {/* Today's Medicines Status Breakdown (Real backend timestamps) */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Dada ji's Medicines Today ({liveData.taken_doses_today}/{liveData.total_doses_today} Taken)
          </span>
          <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
            {liveData.pending_doses_today} Remaining
          </span>
        </div>

        <div className="space-y-2">
          {liveData.today_doses?.map((dose) => {
            const isTaken = dose.status === "TAKEN"
            const isPending = dose.status === "PENDING"
            const isDoseMissed = dose.status === "MISSED"

            return (
              <div
                key={dose.dose_id}
                className={`p-3 rounded-2xl flex items-center justify-between gap-3 border transition-all ${
                  isTaken
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30"
                    : isDoseMissed
                    ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30"
                    : "bg-white dark:bg-app-dark-surface border-app-border dark:border-app-dark-border"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isTaken
                        ? "bg-emerald-500 text-white"
                        : isDoseMissed
                        ? "bg-rose-500 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    {isTaken ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-navy-900 dark:text-white truncate">
                        {dose.medication_name}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {dose.dosage}
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {isTaken ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          ✓ Confirmed taken by {dose.acted_by || "Dada ji"}
                        </span>
                      ) : (
                        <span>Scheduled for {dose.scheduled_time} • {dose.instructions || "On schedule"}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      isTaken
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                        : isDoseMissed
                        ? "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                        : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                    }`}
                  >
                    {dose.status}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 1-Click Loving Nudges & Alerts (Prompt: "jisee ghar walee unkoo alert bheaj sakee") */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <BellRing className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            Send Instant Caring Alert to Dada Ji
          </span>
          {nudgeSuccess && (
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400"
            >
              {nudgeSuccess}
            </motion.span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => handleSendQuickNudge("MEDICINE")}
            disabled={sendingNudge}
            className="p-2.5 rounded-2xl bg-white dark:bg-app-dark-surface hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-app-border dark:border-app-dark-border text-left group transition-all"
          >
            <div className="text-base mb-1">💊</div>
            <div className="text-xs font-extrabold text-navy-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400">
              Meds Alert
            </div>
            <div className="text-[10px] text-slate-400">Prompt dose</div>
          </button>

          <button
            onClick={() => handleSendQuickNudge("WALK")}
            disabled={sendingNudge}
            className="p-2.5 rounded-2xl bg-white dark:bg-app-dark-surface hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-app-border dark:border-app-dark-border text-left group transition-all"
          >
            <div className="text-base mb-1">🚶‍♂️</div>
            <div className="text-xs font-extrabold text-navy-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
              Walk Alert
            </div>
            <div className="text-[10px] text-slate-400">Garden stroll</div>
          </button>

          <button
            onClick={() => handleSendQuickNudge("WATER")}
            disabled={sendingNudge}
            className="p-2.5 rounded-2xl bg-white dark:bg-app-dark-surface hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-app-border dark:border-app-dark-border text-left group transition-all"
          >
            <div className="text-base mb-1">💧</div>
            <div className="text-xs font-extrabold text-navy-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
              Water Alert
            </div>
            <div className="text-[10px] text-slate-400">Hydration prompt</div>
          </button>

          <button
            onClick={() => setCustomOpen(!customOpen)}
            className="p-2.5 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white text-left transition-all shadow-soft-sm"
          >
            <div className="text-base mb-1">❤️</div>
            <div className="text-xs font-extrabold">Custom Alert</div>
            <div className="text-[10px] text-teal-100">Write loving note</div>
          </button>
        </div>

        {/* Custom Note input toggle */}
        <AnimatePresence>
          {customOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="e.g. Dada ji, please take warm water after your medicine..."
                  className="flex-1 px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-app-dark-surface border border-app-border dark:border-app-dark-border focus:ring-2 focus:ring-teal-500 outline-none text-navy-900 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customText.trim()) {
                      handleSendQuickNudge("CUSTOM", customText.trim())
                    }
                  }}
                />
                <button
                  onClick={() => customText.trim() && handleSendQuickNudge("CUSTOM", customText.trim())}
                  disabled={!customText.trim() || sendingNudge}
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
