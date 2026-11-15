import React, { useState, useEffect } from "react"
import { Bell, Clock, ShieldAlert, CheckCircle2, Send, Sparkles } from "lucide-react"
import { api } from "../lib/api"
import { Button } from "../components/common/Button"
import { EmptyState } from "../components/common/EmptyState"

export function NotificationsPage() {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const handleTriggerTest = async () => {
    setTesting(true)
    try {
      const res = await api.triggerTestReminder()
      setTestResult(res)
    } catch (err) {
      alert("Error triggering test reminder: " + err.message)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-navy-900 dark:text-white tracking-tight">
            Notifications & Escalations
          </h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Audit history of proactive email reminders and escalation ladder alerts
          </p>
        </div>

        {/* 1-Click Test Reminder Button */}
        <Button
          variant="primary"
          size="md"
          icon={Send}
          loading={testing}
          onClick={handleTriggerTest}
        >
          Send Test Reminder Now
        </Button>
      </div>

      {testResult && (
        <div className="p-5 rounded-3xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/40 space-y-2">
          <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>Reminder Email Dispatched Successfully!</span>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <div>
              <strong>Recipient:</strong> {testResult.recipient}
            </div>
            <div>
              <strong>Subject:</strong> {testResult.subject}
            </div>
            <div>
              <strong>Email Mode:</strong> {testResult.email_mode} ({testResult.note})
            </div>
            <div className="pt-2">
              <span className="font-bold text-teal-700 dark:text-teal-400">
                Single-Use Magic Link:
              </span>
              <a
                href={testResult.magic_link_url}
                target="_blank"
                rel="noreferrer"
                className="block text-xs font-mono text-teal-600 dark:text-teal-400 underline break-all mt-1"
              >
                {testResult.magic_link_url}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Escalation Rules Card */}
      <div className="bg-white dark:bg-app-dark-surface rounded-3xl border border-app-border dark:border-app-dark-border p-6 shadow-soft-sm space-y-4">
        <h3 className="text-base font-bold text-navy-900 dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-500" />
          <span>Active Closed-Loop Escalation Rules</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/50 space-y-1">
            <div className="font-extrabold text-navy-900 dark:text-white uppercase tracking-wider text-[11px] text-teal-600">
              Tier 1 • Elder First
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              10–15 minutes before scheduled dose, reminder sent directly to the elder with a 1-click
              "I took it" button.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/50 space-y-1">
            <div className="font-extrabold text-navy-900 dark:text-white uppercase tracking-wider text-[11px] text-blue-600">
              Tier 2 • Caretaker Escalation
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              If unconfirmed 15 minutes after scheduled time, primary caretaker receives an alert to
              check in.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/50 space-y-1">
            <div className="font-extrabold text-navy-900 dark:text-white uppercase tracking-wider text-[11px] text-amber-600">
              Tier 3 • Family Alert
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              If still unacknowledged after 30 additional minutes, authorized family members receive
              a gentle notification.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
