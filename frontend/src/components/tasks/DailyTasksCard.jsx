import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CheckCircle2,
  Clock,
  Plus,
  BellRing,
  Sparkles,
  Flame,
  Activity,
  Heart,
  Droplet,
  Coffee,
  Calendar,
  AlertTriangle,
  Send,
  X,
  Check,
} from "lucide-react"
import { api } from "../../lib/api"
import { useAuth } from "../../context/AuthContext"

const CATEGORY_ICONS = {
  EXERCISE: Activity,
  HEALTH_CHECK: Heart,
  NUTRITION: Coffee,
  HYDRATION: Droplet,
  ROUTINE: Calendar,
}

const TEMPLATES = [
  {
    title: "Morning Garden Walk (20 Mins)",
    category: "EXERCISE",
    scheduled_time: "07:00",
    duration_days: 30,
    description: "Gentle stroll in fresh morning air with walking stick.",
  },
  {
    title: "Fasting Blood Glucose Check",
    category: "HEALTH_CHECK",
    scheduled_time: "08:00",
    duration_days: 30,
    description: "Accu-Chek reading before breakfast. Target < 120 mg/dL.",
  },
  {
    title: "Warm Haldi Doodh (Turmeric Milk)",
    category: "NUTRITION",
    scheduled_time: "20:30",
    duration_days: 30,
    description: "Warm milk with pinch of turmeric before sleep for joint comfort.",
  },
  {
    title: "Daily Hydration Goal (8 Glasses)",
    category: "HYDRATION",
    scheduled_time: "15:00",
    duration_days: 30,
    description: "Ensure adequate water intake throughout the day.",
  },
  {
    title: "Evening Blood Pressure Check",
    category: "HEALTH_CHECK",
    scheduled_time: "19:00",
    duration_days: 30,
    description: "Rest for 5 minutes then record systolic & diastolic BP.",
  },
]

export function DailyTasksCard() {
  const { user } = useAuth()
  const isElder = user?.role === "ELDER"
  const canEdit = user?.role === "CARETAKER" || user?.role === "ELDER"

  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [completingId, setCompletingId] = useState(null)
  const [nudgingId, setNudgingId] = useState(null)

  // Form state for 1-month routine plan
  const [formTitle, setFormTitle] = useState("")
  const [formCategory, setFormCategory] = useState("ROUTINE")
  const [formTime, setFormTime] = useState("08:00")
  const [formDays, setFormDays] = useState(30)
  const [formDesc, setFormDesc] = useState("")
  const [formPersistent, setFormPersistent] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchTasks = async () => {
    try {
      const data = await api.getTodayCareTasks()
      setSummary(data)
    } catch (err) {
      console.warn("Failed fetching today tasks:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
    const timer = setInterval(fetchTasks, 10000)
    return () => clearInterval(timer)
  }, [])

  const handleComplete = async (logId) => {
    try {
      setCompletingId(logId)
      await api.completeCareTask(logId)
      await fetchTasks()
    } catch (err) {
      alert(err.message || "Failed to complete task")
    } finally {
      setCompletingId(null)
    }
  }

  const handleNudge = async (logId) => {
    try {
      setNudgingId(logId)
      const res = await api.nudgeCareTask(logId)
      alert(res.message || "Loving reminder sent to Dada ji!")
      await fetchTasks()
    } catch (err) {
      alert(err.message || "Failed to send nudge")
    } finally {
      setNudgingId(null)
    }
  }

  const handleApplyTemplate = (tmpl) => {
    setFormTitle(tmpl.title)
    setFormCategory(tmpl.category)
    setFormTime(tmpl.scheduled_time)
    setFormDays(tmpl.duration_days)
    setFormDesc(tmpl.description)
  }

  const handleCreateRoutine = async (e) => {
    e.preventDefault()
    if (!formTitle.trim()) return

    try {
      setSubmitting(true)
      await api.createCareTask({
        title: formTitle.trim(),
        category: formCategory,
        scheduled_time: formTime,
        duration_days: parseInt(formDays, 10) || 30,
        description: formDesc.trim() || undefined,
        persistent_alert: formPersistent,
      })
      setModalOpen(false)
      setFormTitle("")
      setFormDesc("")
      await fetchTasks()
    } catch (err) {
      alert(err.message || "Failed to create routine task")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !summary) {
    return (
      <div className="p-6 rounded-3xl bg-white dark:bg-app-dark-surface border border-app-border dark:border-app-dark-border shadow-soft-sm animate-pulse">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3" />
        <div className="h-20 w-full bg-slate-100 dark:bg-slate-800 rounded-2xl" />
      </div>
    )
  }

  const tasks = summary?.tasks || []
  const total = summary?.total_tasks || 0
  const completed = summary?.completed_tasks || 0

  return (
    <div className="rounded-3xl bg-white dark:bg-app-dark-surface border border-app-border dark:border-app-dark-border shadow-soft-md p-5 sm:p-6 transition-all duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-navy-900 dark:text-white tracking-tight">
              Daily Care Tasks & Routine
            </h2>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300">
              {completed}/{total} Completed
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            1-Month Routine Plan with Persistent Alerts until completed
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs shadow-soft-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Plan 1-Month Routine</span>
          </button>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-2.5">
        {tasks.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/40 text-center border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              No daily care tasks planned for today.
            </p>
            {canEdit && (
              <button
                onClick={() => setModalOpen(true)}
                className="mt-2 text-xs font-bold text-teal-600 dark:text-teal-400 underline"
              >
                + Plan a 30-Day Routine for Dada ji
              </button>
            )}
          </div>
        ) : (
          tasks.map((task) => {
            const isDone = task.status === "COMPLETED"
            const IconComponent = CATEGORY_ICONS[task.category] || Activity

            return (
              <div
                key={task.id}
                className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                  isDone
                    ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30"
                    : "bg-slate-50/70 dark:bg-slate-900/30 border-slate-200/80 dark:border-slate-800/80"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isDone
                        ? "bg-emerald-500 text-white"
                        : "bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300"
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                      <IconComponent className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`font-black text-sm sm:text-base tracking-tight ${
                          isDone
                            ? "line-through text-slate-400 dark:text-slate-500"
                            : "text-navy-900 dark:text-white"
                        }`}
                      >
                        {task.title}
                      </h4>

                      {task.persistent_alert && !isDone && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          <BellRing className="w-2.5 h-2.5 animate-bounce" />
                          Persistent Alert
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {task.scheduled_time}
                      </span>
                      <span>•</span>
                      <span>{task.category}</span>
                      {task.nudge_count > 0 && !isDone && (
                        <>
                          <span>•</span>
                          <span className="text-amber-600 dark:text-amber-400 font-bold">
                            Nudged {task.nudge_count} time{task.nudge_count > 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                      {isDone && task.completed_by_name && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            Done by {task.completed_by_name}
                          </span>
                        </>
                      )}
                    </div>

                    {task.description && !isDone && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Action Button */}
                <div className="shrink-0 flex items-center gap-2">
                  {!isDone ? (
                    <>
                      {/* Family member can nudge */}
                      {!isElder && (
                        <button
                          onClick={() => handleNudge(task.id)}
                          disabled={nudgingId === task.id}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 text-xs font-extrabold flex items-center gap-1 transition-colors border border-amber-200 dark:border-amber-800/50"
                          title="Send gentle reminder to Dada ji"
                        >
                          <BellRing className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Nudge</span>
                        </button>
                      )}

                      {/* Complete button */}
                      <button
                        onClick={() => handleComplete(task.id)}
                        disabled={completingId === task.id}
                        className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-soft-sm transition-all"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Done ✓</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Completed</span>
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Plan 1-Month Routine Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white dark:bg-app-dark-surface rounded-3xl p-6 shadow-soft-xl border border-app-border dark:border-app-dark-border max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-black text-navy-900 dark:text-white">
                    Plan 1-Month Routine Task
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Repeats daily and persistently alerts until completed
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick 1-Click Templates */}
              <div className="my-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  1-Click Care Templates:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl)}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-600 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700"
                    >
                      + {tmpl.title}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleCreateRoutine} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-navy-900 dark:text-slate-300 mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Morning Garden Walk (20 min)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-app-border dark:border-app-dark-border text-navy-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-app-border dark:border-app-dark-border text-navy-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                      <option value="EXERCISE">🏃‍♂️ Exercise / Walk</option>
                      <option value="HEALTH_CHECK">🩺 Health Check / BP / Sugar</option>
                      <option value="NUTRITION">🥛 Nutrition / Diet</option>
                      <option value="HYDRATION">💧 Hydration / Water</option>
                      <option value="ROUTINE">📅 General Routine</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-900 dark:text-slate-300 mb-1">
                      Scheduled Time
                    </label>
                    <input
                      type="time"
                      required
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-app-border dark:border-app-dark-border text-navy-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 dark:text-slate-300 mb-1">
                      Routine Duration (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={formDays}
                      onChange={(e) => setFormDays(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-app-border dark:border-app-dark-border text-navy-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                      Default: 30 days (1-Month Plan)
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-900 dark:text-slate-300 mb-1">
                      Persistent Alert Mode
                    </label>
                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-app-border dark:border-app-dark-border cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPersistent}
                        onChange={(e) => setFormPersistent(e.target.checked)}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                      <span className="text-xs font-bold text-navy-900 dark:text-white">
                        Keep alerting until done
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-900 dark:text-slate-300 mb-1">
                    Caring Instructions / Notes
                  </label>
                  <textarea
                    rows={2}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="e.g. Ensure walking stick is used, drink glass of water after."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-app-border dark:border-app-dark-border text-navy-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-extrabold text-xs shadow-soft-sm transition-all disabled:opacity-50"
                  >
                    {submitting ? "Saving Routine..." : "Save 1-Month Routine Plan"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
