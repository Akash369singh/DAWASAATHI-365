import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldAlert, AlertCircle, CheckCircle2, X } from "lucide-react"
import { api } from "../../lib/api"
import { useAuth } from "../../context/AuthContext"

export function SosModal({ isOpen, onClose }) {
  const { user } = useAuth()
  const [countdown, setCountdown] = useState(3)
  const [active, setActive] = useState(false)
  const [dispatched, setDispatched] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let timer
    if (isOpen && active && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    } else if (isOpen && active && countdown === 0 && !dispatched) {
      triggerSosNow()
    }
    return () => clearTimeout(timer)
  }, [isOpen, active, countdown, dispatched])

  const startCountdown = () => {
    setActive(true)
    setCountdown(3)
  }

  const cancelCountdown = () => {
    setActive(false)
    setCountdown(3)
  }

  const triggerSosNow = async () => {
    setLoading(true)
    try {
      const res = await api.triggerSos(
        `Emergency SOS triggered by ${user?.member_name || "Elder"} via DawaSaathi 365 App`
      )
      setResult(res)
      setDispatched(true)
    } catch (err) {
      alert("Failed to dispatch SOS alert: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setActive(false)
    setCountdown(3)
    setDispatched(false)
    setResult(null)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-red-950/70 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative w-full max-w-md bg-white dark:bg-app-dark-surface rounded-3xl p-6 md:p-8 shadow-2xl border-2 border-red-500 z-10 text-center"
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            {!dispatched ? (
              <div>
                <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 mx-auto flex items-center justify-center mb-5 animate-pulse">
                  <ShieldAlert className="w-10 h-10" />
                </div>

                <h2 className="text-2xl font-black text-red-600 mb-2">Emergency Care Alert</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                  This will immediately dispatch urgent email alerts to all registered Caretakers
                  and Family members with your timestamp.
                </p>

                {active ? (
                  <div className="mb-6">
                    <div className="text-6xl font-black text-red-600 mb-2 animate-bounce">
                      {countdown}
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                      Sending alert in seconds...
                    </p>
                    <button
                      onClick={cancelCountdown}
                      className="w-full py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-2xl font-bold transition-colors"
                    >
                      Cancel Alert
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startCountdown}
                    className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-3xl font-black text-xl shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    SEND EMERGENCY SOS NOW
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 mx-auto flex items-center justify-center mb-5">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-emerald-600 mb-2">SOS Broadcast Sent!</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                  Urgent alerts have been dispatched to your family circle. Please stay calm and seated.
                </p>

                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-left text-xs space-y-1.5 mb-6">
                  <div className="font-bold text-navy-900 dark:text-white">Notified Members:</div>
                  {result?.contacts_notified?.map((c, i) => (
                    <div key={i} className="text-slate-500">
                      • {c.name} ({c.role}) - {c.email}
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleClose}
                  className="w-full py-3.5 bg-teal-500 hover:bg-teal-600 text-white rounded-2xl font-bold"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
