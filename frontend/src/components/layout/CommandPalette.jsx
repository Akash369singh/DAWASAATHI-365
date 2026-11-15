import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Pill,
  Calendar,
  Activity,
  Users,
  HeartPulse,
  Package,
  Settings,
  Mic,
  ShieldAlert,
} from "lucide-react"

export function CommandPalette({ isOpen, onClose, onOpenVoice, onOpenSos }) {
  const [query, setQuery] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        onClose(!isOpen)
      }
      if (e.key === "Escape" && isOpen) {
        onClose(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  const commands = [
    { title: "Home Dashboard", path: "/", icon: Activity },
    { title: "My Medications", path: "/medications", icon: Pill },
    { title: "Doctor Appointments", path: "/appointments", icon: Calendar },
    { title: "Health Insights & Doctor Brief", path: "/insights", icon: Activity },
    { title: "Health Vitals (BP, Sugar, SpO2)", path: "/vitals", icon: HeartPulse },
    { title: "Family Care Circle & Privacy", path: "/care-circle", icon: Users },
    { title: "Medicine Stock & Inventory", path: "/inventory", icon: Package },
    { title: "Privacy & Settings", path: "/settings", icon: Settings },
    {
      title: "Talk to DawaSaathi AI Voice Assistant",
      action: () => {
        onClose(false)
        onOpenVoice()
      },
      icon: Mic,
    },
    {
      title: "Trigger Emergency SOS Alert",
      action: () => {
        onClose(false)
        onOpenSos()
      },
      icon: ShieldAlert,
      danger: true,
    },
  ]

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (cmd) => {
    if (cmd.action) {
      cmd.action()
    } else if (cmd.path) {
      navigate(cmd.path)
      onClose(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onClose(false)}
            className="fixed inset-0 bg-navy-950/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="relative w-full max-w-xl bg-white dark:bg-app-dark-surface rounded-3xl shadow-2xl border border-app-border dark:border-app-dark-border overflow-hidden z-10"
          >
            <div className="flex items-center px-5 py-4 border-b border-app-border dark:border-app-dark-border">
              <Search className="w-5 h-5 text-slate-400 mr-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to page or action... (Type or search)"
                className="w-full bg-transparent text-navy-900 dark:text-white placeholder:text-slate-400 focus:outline-none text-base"
                autoFocus
              />
              <span className="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                ESC
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.map((cmd, idx) => {
                const Icon = cmd.icon
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(cmd)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-colors ${
                      cmd.danger
                        ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        : "text-navy-900 dark:text-app-dark-text hover:bg-slate-50 dark:hover:bg-navy-800/50"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        cmd.danger
                          ? "bg-red-100 text-red-600 dark:bg-red-950/50"
                          : "bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-sm">{cmd.title}</span>
                  </button>
                )
              })}
              {filtered.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-400">
                  No matching actions found.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
