import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Smile, Meh, Frown, Check, Send, Sparkles } from "lucide-react"
import { api } from "../../lib/api"
import { useAuth } from "../../context/AuthContext"

export function DailyCheckinCard() {
  const { user, isElder } = useAuth()
  const [todayCheckin, setTodayCheckin] = useState(null)
  const [selectedMood, setSelectedMood] = useState(null)
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const fetchCheckin = async () => {
    try {
      const data = await api.getTodayCheckin()
      setTodayCheckin(data)
      if (data) {
        setSelectedMood(data.mood)
        setNote(data.note || "")
      }
    } catch (err) {
      console.warn("Could not fetch today checkin:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCheckin()
  }, [])

  const handleSubmit = async (moodToSubmit = selectedMood) => {
    if (!moodToSubmit || submitting) return
    setSubmitting(true)
    try {
      const res = await api.submitCheckin({
        mood: moodToSubmit,
        note: note.trim() || null,
      })
      setTodayCheckin(res)
      setIsEditing(false)
    } catch (err) {
      alert("Failed to record check-in: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  // If already checked in and not editing, show a quiet, calm confirmation
  if (todayCheckin && !isEditing) {
    const moodBadge = {
      GOOD: { label: "Feeling Good 😄", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300" },
      OKAY: { label: "Feeling Okay 😐", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300" },
      NOT_WELL: { label: "Not Feeling Well 😔", color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300" },
    }[todayCheckin.mood] || { label: todayCheckin.mood, color: "bg-slate-100 text-slate-700" }

    return (
      <div className="bg-white dark:bg-app-dark-surface rounded-3xl p-4 md:p-5 border border-app-border dark:border-app-dark-border shadow-soft-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Today's Wellbeing Check-in
              </span>
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${moodBadge.color}`}>
                {moodBadge.label}
              </span>
            </div>
            {todayCheckin.note && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 italic">
                "{todayCheckin.note}"
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsEditing(true)}
          className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline px-3 py-1.5 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors shrink-0"
        >
          Update
        </button>
      </div>
    )
  }

  // Active check-in prompt card (Feature 4)
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-app-dark-surface rounded-4xl p-5 md:p-7 border border-teal-100 dark:border-teal-900/50 shadow-soft-md space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-3 py-1 rounded-full">
            Daily Wellbeing Check-in
          </span>
          <h3 className="text-lg md:text-xl font-extrabold text-navy-900 dark:text-white mt-2">
            How are you feeling today, {user?.elder_name || "Dada ji"}?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tap one option below to keep your family and caretakers quietly reassured.
          </p>
        </div>
        {isEditing && (
          <button
            onClick={() => setIsEditing(false)}
            className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
          >
            Cancel
          </button>
        )}
      </div>

      {/* 3 Large Accessible Options */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => {
            setSelectedMood("GOOD")
            handleSubmit("GOOD")
          }}
          disabled={submitting}
          className={`p-4 rounded-2xl border-2 flex items-center sm:flex-col gap-3 text-left sm:text-center transition-all ${
            selectedMood === "GOOD"
              ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-sm"
              : "border-slate-200 dark:border-slate-800 hover:border-emerald-300 hover:bg-emerald-50/30"
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center text-2xl shrink-0">
            😄
          </div>
          <div>
            <div className="text-sm font-black text-navy-900 dark:text-white">Good</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Energetic & healthy</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedMood("OKAY")
            handleSubmit("OKAY")
          }}
          disabled={submitting}
          className={`p-4 rounded-2xl border-2 flex items-center sm:flex-col gap-3 text-left sm:text-center transition-all ${
            selectedMood === "OKAY"
              ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-sm"
              : "border-slate-200 dark:border-slate-800 hover:border-amber-300 hover:bg-amber-50/30"
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 flex items-center justify-center text-2xl shrink-0">
            😐
          </div>
          <div>
            <div className="text-sm font-black text-navy-900 dark:text-white">Okay</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Managing fine</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedMood("NOT_WELL")
            handleSubmit("NOT_WELL")
          }}
          disabled={submitting}
          className={`p-4 rounded-2xl border-2 flex items-center sm:flex-col gap-3 text-left sm:text-center transition-all ${
            selectedMood === "NOT_WELL"
              ? "border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 shadow-sm"
              : "border-slate-200 dark:border-slate-800 hover:border-rose-300 hover:bg-rose-50/30"
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 flex items-center justify-center text-2xl shrink-0">
            😔
          </div>
          <div>
            <div className="text-sm font-black text-navy-900 dark:text-white">Not well</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Feeling weak / uneasy</div>
          </div>
        </button>
      </div>

      {/* Optional Note */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional: Add a one-line note (e.g. Mild headache, went for walk)..."
          className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-navy-900/50 text-navy-900 dark:text-white"
        />
        {selectedMood && (
          <button
            type="button"
            onClick={() => handleSubmit(selectedMood)}
            disabled={submitting}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition-all shrink-0"
          >
            {submitting ? "Saving..." : "Save Note"}
          </button>
        )}
      </div>
    </motion.div>
  )
}
