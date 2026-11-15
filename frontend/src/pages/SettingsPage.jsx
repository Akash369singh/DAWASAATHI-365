import React, { useState } from "react"
import { Settings, Sliders, Globe, Type, RefreshCw, ShieldCheck, Check, Mail } from "lucide-react"
import { api } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { useSettings } from "../context/SettingsContext"
import { Button } from "../components/common/Button"

export function SettingsPage() {
  const { user } = useAuth()
  const {
    theme,
    toggleTheme,
    fontSize,
    setFontSize,
    language,
    setLanguage,
    elderMode,
    toggleElderMode,
  } = useSettings()

  const [graceWindow, setGraceWindow] = useState(45)
  const [esc1, setEsc1] = useState(15)
  const [esc2, setEsc2] = useState(30)
  const [saved, setSaved] = useState(false)
  const [reseeding, setReseeding] = useState(false)
  const [sendingDigest, setSendingDigest] = useState(false)
  const [digestStatus, setDigestStatus] = useState("")

  const handleSendTestDigest = async () => {
    setSendingDigest(true)
    setDigestStatus("")
    try {
      const res = await api.triggerWeeklyDigest()
      setDigestStatus(res.message || "Weekly digest dispatched to all members!")
      setTimeout(() => setDigestStatus(""), 6000)
    } catch (err) {
      alert("Failed to send test digest: " + err.message)
    } finally {
      setSendingDigest(false)
    }
  }

  const handleSaveTiming = async () => {
    try {
      await api.updateProfile({
        grace_window_minutes: graceWindow,
        escalation_level_1_mins: esc1,
        escalation_level_2_mins: esc2,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      alert("Error saving settings: " + err.message)
    }
  }

  const handleReseed = async () => {
    if (confirm("Reset and reseed demo data for Ramesh Patel?")) {
      setReseeding(true)
      try {
        await api.reseedDemo()
        alert("Demo profile reseeded with fresh 30-day history!")
        window.location.reload()
      } catch (err) {
        alert("Reseed failed: " + err.message)
      } finally {
        setReseeding(false)
      }
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-navy-900 dark:text-white tracking-tight">
          Privacy & System Settings
        </h1>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
          Configure escalation intervals, display preferences, and language
        </p>
      </div>

      {/* Escalation Timing Sliders */}
      <div className="bg-white dark:bg-app-dark-surface rounded-3xl border border-app-border dark:border-app-dark-border p-6 shadow-soft-sm space-y-6">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-teal-500" />
          <h3 className="text-base font-bold text-navy-900 dark:text-white">
            Escalation Ladder & Grace Window
          </h3>
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-slate-600 dark:text-slate-300">
                Grace Window before marking MISSED:
              </span>
              <span className="text-teal-600 dark:text-teal-400 font-extrabold text-sm">
                {graceWindow} minutes
              </span>
            </div>
            <input
              type="range"
              min={15}
              max={120}
              step={5}
              value={graceWindow}
              onChange={(e) => setGraceWindow(parseInt(e.target.value))}
              className="w-full accent-teal-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-slate-600 dark:text-slate-300">
                Tier 1: Caretaker Escalation Delay:
              </span>
              <span className="text-teal-600 dark:text-teal-400 font-extrabold text-sm">
                {esc1} minutes after scheduled time
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={esc1}
              onChange={(e) => setEsc1(parseInt(e.target.value))}
              className="w-full accent-teal-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-slate-600 dark:text-slate-300">
                Tier 2: Family Escalation Delay:
              </span>
              <span className="text-teal-600 dark:text-teal-400 font-extrabold text-sm">
                {esc2} minutes after Caretaker alert
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              step={5}
              value={esc2}
              onChange={(e) => setEsc2(parseInt(e.target.value))}
              className="w-full accent-teal-500 cursor-pointer"
            />
          </div>

          <Button variant="primary" size="md" onClick={handleSaveTiming}>
            {saved ? "Saved Successfully ✓" : "Save Escalation Timings"}
          </Button>
        </div>
      </div>

      {/* Language & Accessibility */}
      <div className="bg-white dark:bg-app-dark-surface rounded-3xl border border-app-border dark:border-app-dark-border p-6 shadow-soft-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <Globe className="w-5 h-5 text-teal-500" />
          <h3 className="text-base font-bold text-navy-900 dark:text-white">
            Language & Display
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
              Application Language
            </label>
            <div className="flex gap-2">
              {[
                { label: "English", val: "en" },
                { label: "हिंदी (Hindi)", val: "hi" },
                { label: "ગુજરાતી (Gujarati)", val: "gu" },
              ].map((l) => (
                <button
                  key={l.val}
                  onClick={() => setLanguage(l.val)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    language === l.val
                      ? "bg-teal-500 text-white shadow-soft-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
              Elder Mode View Toggle
            </label>
            <Button
              variant={elderMode ? "primary" : "outline"}
              size="sm"
              onClick={toggleElderMode}
            >
              {elderMode ? "Elder Mode: ON (High Contrast)" : "Care Dashboard View"}
            </Button>
          </div>
        </div>
      </div>

      {/* Feature 6: Weekly Family Digest Testing */}
      <div className="bg-white dark:bg-app-dark-surface rounded-3xl border border-app-border dark:border-app-dark-border p-6 shadow-soft-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-navy-900 dark:text-white">
              Weekly Family Digest (Sunday 6 PM)
            </h4>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 uppercase">
              Feature 6
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Sends weekly adherence %, missed doses with times, check-in trend, upcoming appointments, refills due, and Gemini brief.
          </p>
          {digestStatus && (
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              ✓ {digestStatus}
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={Mail}
          loading={sendingDigest}
          onClick={handleSendTestDigest}
          className="shrink-0"
        >
          Send Test Digest Now
        </Button>
      </div>

      {/* Hackathon Reseed & Evaluation Utility */}
      <div className="bg-white dark:bg-app-dark-surface rounded-3xl border border-app-border dark:border-app-dark-border p-6 shadow-soft-sm flex items-center justify-between">
        <div>
          <h4 className="font-bold text-sm text-navy-900 dark:text-white">
            Hackathon Evaluator Quick Reset
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Reset profile CARE-7291 to default demo state with 30-day realistic records.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          loading={reseeding}
          onClick={handleReseed}
        >
          Reseed Demo Profile
        </Button>
      </div>
    </div>
  )
}
