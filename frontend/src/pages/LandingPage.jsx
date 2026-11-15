import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Heart,
  ShieldCheck,
  Clock,
  Users,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Activity,
  HeartPulse,
  Pill,
  Lock,
  ChevronRight,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"

export function LandingPage() {
  const { login, demoLogin } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState("login") // 'login' | 'create'
  const [profileCode, setProfileCode] = useState("")
  const [passcode, setPasscode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [demoRoleLoading, setDemoRoleLoading] = useState(null)

  // Create Profile Form State
  const [createForm, setCreateForm] = useState({
    name: "Patel Family Care Circle",
    elder_name: "Ramesh Patel",
    elder_age: 72,
    timezone: "Asia/Kolkata",
    creator_name: "Priya Patel",
    creator_email: "priya.care@example.com",
    creator_role: "CARETAKER",
    passcode: "5678",
  })

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setError("")
    if (!profileCode.trim() || !passcode.trim()) {
      setError("Please enter both Profile Code and Passcode.")
      return
    }
    setLoading(true)
    try {
      await login(profileCode, passcode)
      navigate("/")
    } catch (err) {
      setError(err.message || "Invalid profile code or passcode")
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async (role = "ELDER") => {
    setError("")
    setDemoRoleLoading(role)
    try {
      await demoLogin(role)
      navigate("/")
    } catch (err) {
      setError(err.message || "Failed to load demo account")
    } finally {
      setDemoRoleLoading(null)
    }
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await api.createProfile(createForm)
      localStorage.setItem("carecircle_token", res.access_token)
      localStorage.setItem("carecircle_user", JSON.stringify(res))
      window.location.href = "/"
    } catch (err) {
      setError(err.message || "Failed to create care profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#FAFBFD] dark:bg-[#070E1A] text-navy-900 dark:text-white flex flex-col justify-between selection:bg-teal-500 selection:text-white font-sans">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal-400/15 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 -right-32 w-[30rem] h-[30rem] bg-indigo-400/15 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-[28rem] h-[28rem] bg-rose-300/15 dark:bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 px-6 lg:px-12 py-5 max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center text-white shadow-soft-md shadow-teal-500/25">
            <Heart className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-navy-900 dark:text-white leading-none">
                DawaSaathi
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 px-2 py-0.5 rounded-full">
                365
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mt-0.5">
              Closed-Loop Elderly Health Companion
            </span>
          </div>
        </div>

        {/* Live Demo Header Trigger */}
        <button
          onClick={() => handleDemoLogin("ELDER")}
          disabled={demoRoleLoading !== null}
          className="flex items-center gap-2 bg-white/90 dark:bg-app-dark-surface/90 backdrop-blur-md border border-teal-500/30 hover:border-teal-500 text-teal-700 dark:text-teal-300 px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold shadow-soft-sm transition-all hover:scale-105 active:scale-95"
        >
          <Sparkles className="w-4 h-4 text-teal-500 animate-spin [animation-duration:4s]" />
          <span>{demoRoleLoading ? "Entering..." : "Try Live Demo (1-Click)"}</span>
        </button>
      </header>

      {/* Main Split Section */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-6 lg:px-12 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Left Column: Headline & Interactive Visual Preview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/80 dark:bg-app-dark-surface/80 backdrop-blur-md border border-teal-500/30 px-4 py-1.5 rounded-full text-xs font-extrabold text-teal-700 dark:text-teal-300 shadow-soft-sm">
            <ShieldCheck className="w-4 h-4 text-teal-500" />
            <span>Catalyst 2026 Hackathon • Zero-Mock Architecture</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-navy-900 dark:text-white tracking-tight leading-[1.12]">
            Care that never misses a dose.
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed font-normal">
            Not another reminder app, a closed-loop care system. The elder stays in control; family is alerted{" "}
            <span className="text-teal-600 dark:text-teal-400 font-bold underline decoration-teal-400/40 decoration-2 underline-offset-4">
              only when it matters
            </span>.
          </p>

          {/* Interactive Floating Healthcare Card Preview (Inspired by Modern Digital Health Apps) */}
          <div className="relative pt-2 max-w-xl">
            <div className="p-5 sm:p-6 rounded-3xl bg-white/85 dark:bg-[#101C30]/85 backdrop-blur-xl border border-app-border dark:border-app-dark-border shadow-[0_15px_40px_rgba(11,31,58,0.06)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-lg">
                    👴
                  </div>
                  <div>
                    <div className="font-extrabold text-base text-navy-900 dark:text-white flex items-center gap-2">
                      <span>Ramesh Patel</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    </div>
                    <span className="text-xs text-slate-400 font-medium">Age 72 • Daily Health Ring</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    30-Day Adherence
                  </span>
                  <span className="text-lg font-black text-teal-600 dark:text-teal-400">93.5%</span>
                </div>
              </div>

              {/* Vitals Ribbon */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-navy-900/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Pulse</div>
                  <div className="text-sm font-extrabold text-rose-500 mt-0.5">72 bpm</div>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-navy-900/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">BP</div>
                  <div className="text-sm font-extrabold text-teal-600 dark:text-teal-400 mt-0.5">124/82</div>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-navy-900/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Sugar</div>
                  <div className="text-sm font-extrabold text-blue-500 mt-0.5">118 mg/dL</div>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-navy-900/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">SpO2</div>
                  <div className="text-sm font-extrabold text-emerald-500 mt-0.5">98%</div>
                </div>
              </div>

              {/* Next Dose Highlight Bar */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-50 to-teal-100/60 dark:from-teal-950/40 dark:to-teal-900/20 border border-teal-200/60 dark:border-teal-800/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-navy-900 dark:text-white">
                      Next: Metformin 500mg
                    </div>
                    <span className="text-[11px] text-teal-700 dark:text-teal-300 font-medium">
                      Scheduled 8:30 PM (after dinner)
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-teal-700 dark:text-teal-400 bg-white dark:bg-app-dark-surface px-2.5 py-1 rounded-xl shadow-soft-sm">
                  1-Click Ready ✓
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Glassmorphic Login / Signup Card */}
        <div className="lg:col-span-5">
          <div className="bg-white/90 dark:bg-[#101C30]/90 backdrop-blur-2xl rounded-4xl border border-app-border dark:border-app-dark-border p-7 sm:p-9 shadow-[0_20px_50px_rgba(11,31,58,0.08)]">
            {/* Tab switchers */}
            <div className="flex bg-slate-100/90 dark:bg-slate-800/80 p-1.5 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login")
                  setError("")
                }}
                className={`flex-1 py-3 rounded-xl font-extrabold text-sm transition-all ${
                  activeTab === "login"
                    ? "bg-white dark:bg-app-dark-surface text-navy-900 dark:text-white shadow-soft-sm"
                    : "text-slate-500 hover:text-navy-900 dark:hover:text-white"
                }`}
              >
                Join with Passcode
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("create")
                  setError("")
                }}
                className={`flex-1 py-3 rounded-xl font-extrabold text-sm transition-all ${
                  activeTab === "create"
                    ? "bg-white dark:bg-app-dark-surface text-navy-900 dark:text-white shadow-soft-sm"
                    : "text-slate-500 hover:text-navy-900 dark:hover:text-white"
                }`}
              >
                Create Care Profile
              </button>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 mb-5 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-800/40"
              >
                {error}
              </motion.div>
            )}

            {/* TAB 1: PASSCODE LOGIN */}
            {activeTab === "login" ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Care Profile Code
                  </label>
                  <input
                    type="text"
                    value={profileCode}
                    onChange={(e) => setProfileCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CARE-7291"
                    className="w-full px-4 py-3.5 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50/70 dark:bg-navy-900/60 text-navy-900 dark:text-white font-mono text-base font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enter the code given to you by the family organizer.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Your 4-Digit Passcode
                  </label>
                  <input
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="••••"
                    maxLength={10}
                    className="w-full px-4 py-3.5 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50/70 dark:bg-navy-900/60 text-navy-900 dark:text-white font-mono text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white font-extrabold rounded-2xl text-base shadow-soft-md shadow-teal-500/25 transition-all flex items-center justify-center gap-2 select-none"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Enter DawaSaathi 365</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Instant Evaluator Role Buttons */}
                <div className="pt-5 border-t border-app-border dark:border-app-dark-border">
                  <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider text-center mb-2.5">
                    Instant Demo Login (Evaluators & Solo Hackathon Judges)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDemoLogin("ELDER")}
                      disabled={demoRoleLoading !== null}
                      className="py-2.5 px-2 bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/40 text-navy-900 dark:text-white rounded-xl text-xs font-extrabold text-center border border-transparent hover:border-teal-500/40 transition-all"
                    >
                      {demoRoleLoading === "ELDER" ? "..." : "👴 Elder"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDemoLogin("CARETAKER")}
                      disabled={demoRoleLoading !== null}
                      className="py-2.5 px-2 bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/40 text-navy-900 dark:text-white rounded-xl text-xs font-extrabold text-center border border-transparent hover:border-teal-500/40 transition-all"
                    >
                      {demoRoleLoading === "CARETAKER" ? "..." : "👩‍⚕️ Caretaker"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDemoLogin("FAMILY")}
                      disabled={demoRoleLoading !== null}
                      className="py-2.5 px-2 bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/40 text-navy-900 dark:text-white rounded-xl text-xs font-extrabold text-center border border-transparent hover:border-teal-500/40 transition-all"
                    >
                      {demoRoleLoading === "FAMILY" ? "..." : "👨‍👩‍👧 Family"}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* TAB 2: CREATE CARE PROFILE */
              <form onSubmit={handleCreateSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Care Circle Name
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-app-border dark:border-app-dark-border bg-slate-50/70 dark:bg-navy-900/60 text-sm font-semibold"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Elder Full Name
                    </label>
                    <input
                      type="text"
                      value={createForm.elder_name}
                      onChange={(e) => setCreateForm({ ...createForm, elder_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-app-border dark:border-app-dark-border bg-slate-50/70 dark:bg-navy-900/60 text-sm font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Elder Age
                    </label>
                    <input
                      type="number"
                      value={createForm.elder_age}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, elder_age: parseInt(e.target.value) || 70 })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-app-border dark:border-app-dark-border bg-slate-50/70 dark:bg-navy-900/60 text-sm font-semibold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={createForm.creator_name}
                      onChange={(e) => setCreateForm({ ...createForm, creator_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-app-border dark:border-app-dark-border bg-slate-50/70 dark:bg-navy-900/60 text-sm font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Your Email (for alerts)
                    </label>
                    <input
                      type="email"
                      value={createForm.creator_email}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, creator_email: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-app-border dark:border-app-dark-border bg-slate-50/70 dark:bg-navy-900/60 text-sm font-semibold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Create 4-Digit Passcode
                  </label>
                  <input
                    type="password"
                    value={createForm.passcode}
                    onChange={(e) => setCreateForm({ ...createForm, passcode: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-app-border dark:border-app-dark-border bg-slate-50/70 dark:bg-navy-900/60 text-sm font-mono tracking-widest"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white font-extrabold rounded-2xl text-sm shadow-soft-md shadow-teal-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Create & Open DawaSaathi 365</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-6 border-t border-app-border dark:border-app-dark-border text-center text-xs text-slate-400">
        DawaSaathi 365 • Closed-Loop Elderly Care & Medication System • Catalyst Solo AI Hackathon 2026
      </footer>
    </div>
  )
}
