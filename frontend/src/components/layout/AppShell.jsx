import React, { useState } from "react"
import { NavLink, useNavigate, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Heart,
  Pill,
  Calendar,
  Activity,
  Users,
  Settings,
  Bell,
  Sun,
  Moon,
  Mic,
  ShieldAlert,
  Menu,
  X,
  Package,
  HeartPulse,
  LogOut,
  ChevronRight,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useSettings } from "../../context/SettingsContext"
import { CommandPalette } from "./CommandPalette"
import { VoiceAssistantModal } from "../voice/VoiceAssistantModal"
import { SosModal } from "../emergency/SosModal"
import { SosTopBarButton } from "../emergency/SosTopBarButton"
import { SosActiveBanner } from "../emergency/SosActiveBanner"
import { ErrorBoundary } from "../common/ErrorBoundary"

export function AppShell({ children }) {
  const { user, logout, isElder } = useAuth()
  const {
    theme,
    toggleTheme,
    fontSize,
    setFontSize,
    language,
    setLanguage,
    elderMode,
    toggleElderMode,
    t,
  } = useSettings()

  const [moreSheetOpen, setMoreSheetOpen] = useState(false)
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [sosOpen, setSosOpen] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()

  // Primary 5 navigation items shown in center navbar / bottom tabs
  const primaryNavItems = [
    { label: t("home"), path: "/", icon: Activity },
    { label: t("medications"), path: "/medications", icon: Pill },
    { label: t("appointments"), path: "/appointments", icon: Calendar },
    { label: t("insights"), path: "/insights", icon: HeartPulse },
    { label: t("careCircle"), path: "/care-circle", icon: Users },
  ]

  // Full 14 ecosystem features available through More menu / Command palette
  const allFeatures = [
    { label: "Dashboard", path: "/", icon: Activity },
    { label: "My Medications", path: "/medications", icon: Pill },
    { label: "Doctor Appointments", path: "/appointments", icon: Calendar },
    { label: "Health Insights & Doctor Brief", path: "/insights", icon: HeartPulse },
    { label: "Health Vitals (BP, Sugar, SpO2)", path: "/vitals", icon: Heart },
    { label: "Family Care Circle & Privacy", path: "/care-circle", icon: Users },
    { label: "Medicine Stock Inventory", path: "/inventory", icon: Package },
    { label: "Notifications & Escalation Log", path: "/notifications", icon: Bell },
    { label: "Privacy & Settings", path: "/settings", icon: Settings },
  ]

  const fontOptions = [
    { label: "A", val: "normal" },
    { label: "A+", val: "large" },
    { label: "A++", val: "xlarge" },
  ]

  const langOptions = [
    { label: "EN", val: "en" },
    { label: "हिं", val: "hi" },
    { label: "ગુજ", val: "gu" },
  ]

  return (
    <div className="min-h-screen bg-app-bg dark:bg-app-dark-bg text-navy-900 dark:text-app-dark-text flex flex-col transition-colors duration-200">
      {/* Skip to Content for Keyboard & Screen Reader Users (WCAG AA) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 z-50 px-4 py-2 bg-teal-600 text-white font-extrabold text-sm rounded-xl shadow-xl focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      {/* Desktop Top Navbar */}
      <header role="banner" className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-app-dark-surface/80 border-b border-app-border dark:border-app-dark-border px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <NavLink to="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-teal-500 flex items-center justify-center text-white shadow-soft-sm shadow-teal-500/20">
                <Heart className="w-5 h-5 fill-current" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-navy-900 dark:text-white block leading-none">
                  DawaSaathi <span className="text-teal-600 dark:text-teal-400">365</span>
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block tracking-wider uppercase mt-1">
                  Elderly Care Platform
                </span>
              </div>
            </NavLink>

            {/* Elder Mode / Dashboard Toggle Chip */}
            <button
              onClick={toggleElderMode}
              className={`hidden sm:inline-flex items-center gap-1.5 ml-4 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                elderMode
                  ? "bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              {elderMode ? "Elder Mode Active" : "Care Dashboard"}
            </button>
          </div>

          {/* Desktop Center Primary Menu (when not in strict elder mode or for fast access) */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/70 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-app-border dark:border-app-dark-border">
            {primaryNavItems.map((item) => {
              const Icon = item.icon
              const active = location.pathname === item.path
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`relative px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                    active
                      ? "text-teal-700 dark:text-teal-400"
                      : "text-slate-600 dark:text-slate-400 hover:text-navy-900 dark:hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="navPill"
                      className="absolute inset-0 bg-white dark:bg-app-dark-surface rounded-xl shadow-soft-sm"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </span>
                </NavLink>
              )
            })}
          </nav>

          {/* Right Controls: AI Assistant, SOS, Notifications, Font Toggle, Lang, Theme, User */}
          <div className="flex items-center gap-2">
            {/* AI Voice Assistant Trigger */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setVoiceOpen(true)}
              title="DawaSaathi AI Voice Companion"
              aria-label="Open AI voice companion"
              className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-3.5 py-2 rounded-2xl text-xs md:text-sm font-bold shadow-soft-sm shadow-teal-500/20 focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              <Mic className="w-4 h-4" />
              <span className="hidden sm:inline">AI Voice</span>
            </motion.button>

            {/* Emergency SOS Button (Hold 2s with 5s cancel toast) */}
            <SosTopBarButton />

            {/* Font Size Toggle (A / A+ / A++) */}
            <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold" role="group" aria-label="Font size controls">
              {fontOptions.map((f) => (
                <button
                  key={f.val}
                  onClick={() => setFontSize(f.val)}
                  aria-label={`Set font size to ${f.label}`}
                  className={`px-2 py-1 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 ${
                    fontSize === f.val
                      ? "bg-white dark:bg-app-dark-surface text-teal-600 dark:text-teal-400 shadow-soft-sm"
                      : "text-slate-500 hover:text-navy-900 dark:hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Language Toggle (EN / हिं / ગુજ) */}
            <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold" role="group" aria-label="Language selection">
              {langOptions.map((l) => (
                <button
                  key={l.val}
                  onClick={() => setLanguage(l.val)}
                  aria-label={`Switch language to ${l.label}`}
                  className={`px-2 py-1 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 ${
                    language === l.val
                      ? "bg-white dark:bg-app-dark-surface text-teal-600 dark:text-teal-400 shadow-soft-sm"
                      : "text-slate-500 hover:text-navy-900 dark:hover:text-white"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-navy-900 dark:hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-teal-500"
              title="Toggle Dark Mode"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications Bell */}
            <NavLink
              to="/notifications"
              aria-label="View notifications and alert history"
              className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-navy-900 dark:hover:text-white relative transition-colors focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 border-white dark:border-app-dark-surface" />
            </NavLink>

            {/* User Profile / Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-app-border dark:border-app-dark-border">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-extrabold text-navy-900 dark:text-white leading-tight">
                  {user?.member_name || "Ramesh Patel"}
                </div>
                <div className="text-[11px] font-semibold text-slate-400 capitalize">
                  {user?.role?.toLowerCase() || "elder"}
                </div>
              </div>
              <button
                onClick={logout}
                title="Log out"
                aria-label="Log out of account"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors focus-visible:ring-2 focus-visible:ring-red-400"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Persistent Red Emergency SOS Banner across Dashboard until resolved */}
      <SosActiveBanner />

      {/* Main Page Body */}
      <main id="main-content" role="main" tabIndex="-1" className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-6 md:py-8 pb-24 md:pb-8 focus:outline-none">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (5 Items) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-app-dark-surface/90 backdrop-blur-md border-t border-app-border dark:border-app-dark-border py-2 px-3 flex items-center justify-around shadow-lg">
        {primaryNavItems.slice(0, 4).map((item) => {
          const Icon = item.icon
          const active = location.pathname === item.path
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-colors ${
                active
                  ? "text-teal-600 dark:text-teal-400 font-bold"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] tracking-tight">{item.label}</span>
            </NavLink>
          )
        })}

        {/* More Sheet Trigger */}
        <button
          onClick={() => setMoreSheetOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[11px] tracking-tight">More</span>
        </button>
      </nav>

      {/* Mobile "More" Sheet */}
      <AnimatePresence>
        {moreSheetOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreSheetOpen(false)}
              className="fixed inset-0 bg-navy-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed bottom-0 inset-x-0 bg-white dark:bg-app-dark-surface rounded-t-3xl border-t border-app-border dark:border-app-dark-border p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-navy-900 dark:text-white">
                  DawaSaathi 365 Features
                </h3>
                <button
                  onClick={() => setMoreSheetOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {allFeatures.map((feat) => {
                  const Icon = feat.icon
                  return (
                    <button
                      key={feat.path}
                      onClick={() => {
                        navigate(feat.path)
                        setMoreSheetOpen(false)
                      }}
                      className="flex items-center justify-between w-full p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-navy-800/50 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400 flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-sm text-navy-900 dark:text-white">
                          {feat.label}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={cmdPaletteOpen}
        onClose={setCmdPaletteOpen}
        onOpenVoice={() => setVoiceOpen(true)}
        onOpenSos={() => setSosOpen(true)}
      />

      {/* DawaSaathi AI Voice Companion Modal */}
      <VoiceAssistantModal isOpen={voiceOpen} onClose={() => setVoiceOpen(false)} />

      {/* Emergency SOS Modal */}
      <SosModal isOpen={sosOpen} onClose={() => setSosOpen(false)} />
    </div>
  )
}
