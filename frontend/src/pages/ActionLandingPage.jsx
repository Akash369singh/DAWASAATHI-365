import React, { useEffect, useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Check, AlertCircle, ArrowRight } from "lucide-react"

export function ActionLandingPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const navigate = useNavigate()

  const [status, setStatus] = useState("loading") // 'loading' | 'success' | 'error' | 'already'
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("No magic action token provided in URL.")
      return
    }

    async function execute() {
      try {
        const res = await fetch(`/api/actions/execute/${encodeURIComponent(token)}`)
        const text = await res.text()
        if (text.includes("Already Acknowledged") || text.includes("Already Processed")) {
          setStatus("already")
          setMessage("This dose or action has already been processed.")
        } else if (text.includes("Dose Snoozed")) {
          setStatus("snoozed")
          setMessage("Dose successfully snoozed. Escalation alerts have been paused and family sees your updated timing.")
        } else if (text.includes("Dose Recorded") || res.ok) {
          setStatus("success")
          setMessage("Dose successfully marked as taken! The care circle dashboard has been updated live.")
        } else {
          setStatus("error")
          setMessage("This magic link has expired or has already been used.")
        }
      } catch (err) {
        setStatus("error")
        setMessage("Could not connect to verify magic action.")
      }
    }

    execute()
  }, [token])

  return (
    <div className="min-h-screen bg-app-bg dark:bg-app-dark-bg flex items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white dark:bg-app-dark-surface rounded-4xl border border-app-border dark:border-app-dark-border p-8 md:p-10 shadow-soft-lg space-y-6"
      >
        {status === "loading" && (
          <div>
            <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-navy-900 dark:text-white">
              Confirming Dose...
            </h2>
            <p className="text-xs text-slate-400 mt-1">Updating DawaSaathi 365 closed-loop records</p>
          </div>
        )}

        {(status === "success" || status === "already") && (
          <div>
            <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-5">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>
            <h2 className="text-2xl font-black text-navy-900 dark:text-white mb-2">
              Dose Recorded ✓
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              {message}
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full py-3.5 bg-teal-500 hover:bg-teal-600 text-white rounded-2xl font-bold text-sm shadow-soft-md shadow-teal-500/20 flex items-center justify-center gap-2"
            >
              <span>Go to Care Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {status === "snoozed" && (
          <div>
            <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-5 text-3xl">
              ⏳
            </div>
            <h2 className="text-2xl font-black text-navy-900 dark:text-white mb-2">
              Dose Snoozed ⏳
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              {message}
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full py-3.5 bg-teal-500 hover:bg-teal-600 text-white rounded-2xl font-bold text-sm shadow-soft-md shadow-teal-500/20 flex items-center justify-center gap-2"
            >
              <span>Go to Care Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {status === "error" && (
          <div>
            <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 mx-auto flex items-center justify-center mb-5">
              <AlertCircle className="w-10 h-10 stroke-[2.5]" />
            </div>
            <h2 className="text-2xl font-black text-red-600 mb-2">Notice</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              {message}
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full py-3.5 bg-slate-200 hover:bg-slate-300 text-navy-900 rounded-2xl font-bold text-sm"
            >
              Return to Login
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
