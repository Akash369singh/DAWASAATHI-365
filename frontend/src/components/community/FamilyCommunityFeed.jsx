import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Heart,
  Send,
  Sparkles,
  MessageCircle,
  BellRing,
  AlertTriangle,
  Smile,
  CheckCheck,
  Clock,
  Shield,
  Users,
} from "lucide-react"
import { api } from "../../lib/api"
import { useAuth } from "../../context/AuthContext"

const QUICK_CHIPS = [
  "❤️ Proud of you Dada ji! Take care today.",
  "💊 Dada ji, gentle reminder for your scheduled medicine!",
  "💧 Dada ji, please have a fresh glass of warm water.",
  "🌸 Wishing you an energetic and healthy afternoon!",
  "🩺 Let me know what your evening BP reading is!",
]

export function FamilyCommunityFeed() {
  const { user } = useAuth()
  const isElder = user?.role === "ELDER"

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [inputText, setInputText] = useState("")
  const [isUrgent, setIsUrgent] = useState(false)
  const [posting, setPosting] = useState(false)
  const [reactingId, setReactingId] = useState(null)

  const fetchMessages = async () => {
    try {
      const data = await api.getFamilyMessages()
      setMessages(data)
    } catch (err) {
      console.warn("Failed fetching community messages:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
    const timer = setInterval(fetchMessages, 8000)
    return () => clearInterval(timer)
  }, [])

  const handlePostMessage = async (e) => {
    if (e) e.preventDefault()
    if (!inputText.trim()) return

    try {
      setPosting(true)
      await api.postFamilyMessage({
        message_text: inputText.trim(),
        message_type: isUrgent ? "TASK_ALERT" : "LOVING_NOTE",
        is_urgent: isUrgent,
      })
      setInputText("")
      setIsUrgent(false)
      await fetchMessages()
    } catch (err) {
      alert(err.message || "Failed to post message")
    } finally {
      setPosting(false)
    }
  }

  const handleReact = async (msgId) => {
    try {
      setReactingId(msgId)
      await api.reactToFamilyMessage(msgId, "❤️")
      await fetchMessages()
    } catch (err) {
      console.warn("Failed reacting to message:", err)
    } finally {
      setReactingId(null)
    }
  }

  const handleApplyChip = (chip) => {
    setInputText(chip)
  }

  if (loading && messages.length === 0) {
    return (
      <div className="p-6 rounded-3xl bg-white dark:bg-app-dark-surface border border-app-border dark:border-app-dark-border shadow-soft-sm animate-pulse">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3" />
        <div className="h-24 w-full bg-slate-100 dark:bg-slate-800 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="rounded-3xl bg-white dark:bg-app-dark-surface border border-app-border dark:border-app-dark-border shadow-soft-md p-5 sm:p-6 transition-all duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center shadow-soft-sm">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-navy-900 dark:text-white tracking-tight">
              Family Care Community & Nudges
            </h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time message wall & instant alerts between family & Dada ji
            </p>
          </div>
        </div>

        <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
          {messages.length} Notes Shared
        </span>
      </div>

      {/* Message Input Box */}
      <form onSubmit={handlePostMessage} className="mb-5">
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-app-border dark:border-app-dark-border focus-within:ring-2 focus-within:ring-teal-500 transition-all">
          <textarea
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isElder
                ? "Reply to family (e.g. 'Feeling great, had light lunch and took medicines')..."
                : "Send a loving note, medicine reminder, or alert to Dada ji..."
            }
            className="w-full bg-transparent text-sm text-navy-900 dark:text-white placeholder-slate-400 outline-none resize-none"
          />

          {/* Quick prompt chips */}
          {!isElder && (
            <div className="flex flex-wrap gap-1.5 pt-2 pb-1 border-t border-slate-200 dark:border-slate-800">
              {QUICK_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyChip(chip)}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Bottom actions bar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 mt-1">
            {!isElder ? (
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="w-4 h-4 text-rose-500 rounded focus:ring-rose-400"
                />
                <span className={isUrgent ? "text-rose-600 dark:text-rose-400 font-extrabold flex items-center gap-1" : ""}>
                  <AlertTriangle className="w-3.5 h-3.5 inline" />
                  Mark as Urgent Alert
                </span>
              </label>
            ) : (
              <span className="text-xs font-semibold text-slate-400">
                Your family receives this immediately.
              </span>
            )}

            <button
              type="submit"
              disabled={!inputText.trim() || posting}
              className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-soft-sm transition-all disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{posting ? "Sending..." : "Post Note"}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Messages Feed */}
      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            No family messages yet. Send the first note!
          </div>
        ) : (
          messages.map((msg) => {
            const isFromElder = msg.sender_role === "ELDER"
            const isRead = msg.is_read_by_elder

            return (
              <div
                key={msg.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  msg.is_urgent
                    ? "bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
                    : isFromElder
                    ? "bg-teal-50/40 dark:bg-teal-950/20 border-teal-100 dark:border-teal-900/30"
                    : "bg-slate-50/70 dark:bg-slate-900/30 border-slate-200/80 dark:border-slate-800/80"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isFromElder
                          ? "bg-teal-500 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-navy-900 dark:text-white"
                      }`}
                    >
                      {msg.sender_name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-navy-900 dark:text-white">
                          {msg.sender_name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                          {msg.sender_role}
                        </span>
                        {msg.is_urgent && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-rose-500 text-white uppercase">
                            Urgent Alert
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-navy-900 dark:text-slate-200 pl-9 font-medium leading-relaxed">
                  {msg.message_text}
                </p>

                {/* Footer Reactions / Read status */}
                <div className="flex items-center justify-between pl-9 mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReact(msg.id)}
                      disabled={reactingId === msg.id}
                      className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-all"
                    >
                      <span>{msg.reactions || "❤️"}</span>
                      <span className="text-[10px] text-slate-500">Love</span>
                    </button>
                  </div>

                  <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                    {isRead ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Seen by Dada ji</span>
                      </span>
                    ) : (
                      <span>Pending acknowledgment</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
