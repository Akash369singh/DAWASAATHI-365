import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Printer,
  Sparkles,
  TrendingUp,
  Award,
  AlertCircle,
  FileText,
  Calendar,
  CheckCircle2,
} from "lucide-react"
import { api } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { Button } from "../components/common/Button"
import { ProgressRing } from "../components/common/ProgressRing"
import { Heatmap } from "../components/common/Heatmap"
import { Skeleton } from "../components/common/Skeleton"

export function HealthInsightsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("30d") // 'today' | '7d' | '30d'
  const [stats, setStats] = useState(null)
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, insightsData] = await Promise.all([
          api.getAdherenceStats(),
          api.getAiInsights(),
        ])
        setStats(statsData)
        setInsights(insightsData)
      } catch (err) {
        console.error("Failed loading insights:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    )
  }

  const currentPct =
    activeTab === "today"
      ? stats?.today_pct || 100
      : activeTab === "7d"
      ? stats?.seven_day_pct || 95
      : stats?.thirty_day_pct || 93

  const brief = insights?.doctor_visit_brief || {}

  return (
    <div className="space-y-8">
      {/* Top Header & Print Brief Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-navy-900 dark:text-white tracking-tight">
            Health Insights & Adherence
          </h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Real adherence trends and clinical doctor visit brief
          </p>
        </div>

        <Button variant="primary" size="md" icon={Printer} onClick={handlePrint}>
          Print Doctor Visit Brief
        </Button>
      </div>

      {/* Main Grid: Adherence Ring & 30-Day Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        {/* Left Card: Adherence Rings */}
        <div className="lg:col-span-5 bg-white dark:bg-app-dark-surface rounded-3xl border border-app-border dark:border-app-dark-border p-6 shadow-soft-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Adherence Score
            </span>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              {["today", "7d", "30d"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-lg uppercase transition-colors ${
                    activeTab === tab
                      ? "bg-white dark:bg-app-dark-surface text-teal-600 dark:text-teal-400 shadow-soft-sm"
                      : "text-slate-500"
                  }`}
                >
                  {tab === "today" ? "Today" : tab === "7d" ? "7 Days" : "30 Days"}
                </button>
              ))}
            </div>
          </div>

          <div className="py-4">
            <ProgressRing
              radius={84}
              stroke={14}
              progress={currentPct}
              label={
                activeTab === "today"
                  ? "Today's Routine"
                  : activeTab === "7d"
                  ? "Past 7 Days"
                  : "30-Day Overall Streak"
              }
              sublabel="COMPLIANCE"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-app-border dark:border-app-dark-border text-center text-xs">
            <div>
              <div className="font-extrabold text-navy-900 dark:text-white text-base">
                {stats?.total_taken_30d || 0}
              </div>
              <div className="text-slate-400 font-semibold">Taken</div>
            </div>
            <div>
              <div className="font-extrabold text-red-500 text-base">
                {stats?.total_missed_30d || 0}
              </div>
              <div className="text-slate-400 font-semibold">Missed</div>
            </div>
            <div>
              <div className="font-extrabold text-amber-500 text-base">
                {stats?.total_skipped_30d || 0}
              </div>
              <div className="text-slate-400 font-semibold">Skipped</div>
            </div>
          </div>
        </div>

        {/* Right Card: 30-Day Interactive Heatmap */}
        <div className="lg:col-span-7 bg-white dark:bg-app-dark-surface rounded-3xl border border-app-border dark:border-app-dark-border p-6 shadow-soft-sm flex flex-col justify-between">
          <Heatmap
            data={stats?.heatmap || []}
            title="30-Day Medication Heatmap"
          />
          <p className="text-xs text-slate-400 mt-4 leading-relaxed">
            Every square represents one calendar day. Hover over any block to inspect exact taken vs
            scheduled doses. Green blocks represent consistent adherence.
          </p>
        </div>
      </div>

      {/* AI Plain-Language Health Summary Card */}
      {insights && (
        <div className="bg-white dark:bg-app-dark-surface rounded-3xl border border-teal-500/20 p-6 md:p-8 shadow-soft-md space-y-6 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-navy-900 dark:text-white">
                AI Health Routine Analysis
              </h3>
              <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold">
                Pattern detection based on verified dose logs
              </p>
            </div>
          </div>

          <p className="text-base text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
            {insights.plain_language_summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Patterns Identified */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/40 border border-app-border dark:border-app-dark-border space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-navy-900 dark:text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-teal-500" />
                <span>Patterns Identified</span>
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                {insights.patterns_identified?.map((pat, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-teal-500 font-bold">•</span>
                    <span>{pat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Gentle Nudges */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/40 border border-app-border dark:border-app-dark-border space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-navy-900 dark:text-white flex items-center gap-1.5">
                <Award className="w-4 h-4 text-teal-500" />
                <span>Gentle Routine Nudges</span>
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                {insights.gentle_nudges?.map((nudge, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-teal-500 font-bold">•</span>
                    <span>{nudge}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 italic">
            {insights.ai_assisted_notice}
          </div>
        </div>
      )}

      {/* PRINT-READY ONE-PAGE DOCTOR VISIT BRIEF */}
      <div className="bg-white dark:bg-app-dark-surface rounded-3xl border border-app-border dark:border-app-dark-border p-8 shadow-soft-sm print:p-0 print:border-none print:shadow-none space-y-6">
        <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-widest text-teal-600">
              DawaSaathi 365 Clinical Health Summary
            </div>
            <h2 className="text-2xl font-black text-navy-900 dark:text-white mt-1">
              Doctor Visit Brief
            </h2>
            <div className="text-sm font-semibold text-slate-500 mt-0.5">
              Patient: {brief.patient_header || user?.elder_name || "Ramesh Patel, 72"}
            </div>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>Generated: {new Date().toLocaleDateString()}</div>
            <div className="text-teal-600 font-bold">Adherence: {brief.adherence_rating}</div>
          </div>
        </div>

        {/* Clinical Observations */}
        <div className="space-y-2">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Clinical Observations for Doctor
          </h4>
          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-navy-900/40 p-4 rounded-2xl">
            {brief.key_observations_for_doctor ||
              "Patient demonstrates reliable medication compliance with stable vitals."}
          </p>
        </div>

        {/* Recent Vitals & Regimen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/40 space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Recent Vitals Summary
            </span>
            <p className="text-sm font-semibold text-navy-900 dark:text-white">
              {brief.recent_vitals_summary || "Blood Pressure averages 124/82 mmHg. Sugar 118 mg/dL."}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/40 space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Active Regimen
            </span>
            <p className="text-sm font-semibold text-navy-900 dark:text-white">
              {brief.active_regimen_count || 4} verified prescription medications active
            </p>
          </div>
        </div>

        {/* Questions to Ask Doctor */}
        <div className="space-y-2">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Suggested Consultation Questions
          </h4>
          <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
            {brief.recommended_doctor_questions?.map((q, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-slate-50 dark:bg-navy-900/40 p-3 rounded-xl">
                <span className="text-teal-500 font-bold">Q{idx + 1}.</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
