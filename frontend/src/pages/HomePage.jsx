import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Heart, Activity, Droplet, Wind, Calendar, Sparkles, ShieldAlert, Users, Eye } from "lucide-react"
import { api } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { useSettings } from "../context/SettingsContext"
import { HeroNextDose } from "../components/home/HeroNextDose"
import { TodayDotsStrip } from "../components/home/TodayDotsStrip"
import { StatusAlertBanner } from "../components/home/StatusAlertBanner"
import { ElderLiveWatchCard } from "../components/home/ElderLiveWatchCard"
import { DailyTasksCard } from "../components/tasks/DailyTasksCard"
import { FamilyCommunityFeed } from "../components/community/FamilyCommunityFeed"
import { OmniMedicineEncyclopedia } from "../components/home/OmniMedicineEncyclopedia"
import { Skeleton } from "../components/common/Skeleton"

export function HomePage() {
  const { user } = useAuth()
  const { t } = useSettings()

  const [scheduleData, setScheduleData] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [vitals, setVitals] = useState([])
  const [loading, setLoading] = useState(true)

  const isFamilyOrCaretaker = user?.role === "FAMILY" || user?.role === "CARETAKER"
  const [showElderView, setShowElderView] = useState(user?.role ? user.role === "ELDER" : true)

  useEffect(() => {
    if (user?.role) {
      setShowElderView(user.role === "ELDER")
    }
  }, [user?.role])

  const fetchHomeData = async () => {
    try {
      const [schedule, apts, vitalsData] = await Promise.all([
        api.getTodaySchedule().catch((err) => {
          console.warn("Schedule fetch error:", err)
          return null
        }),
        api.listAppointments(true).catch((err) => {
          console.warn("Appointments fetch error:", err)
          return []
        }),
        api.listVitals("", 4).catch((err) => {
          console.warn("Vitals fetch error:", err)
          return []
        }),
      ])
      if (schedule) {
        setScheduleData(schedule)
      }
      setAppointments(Array.isArray(apts) ? apts : [])
      setVitals(Array.isArray(vitalsData) ? vitalsData : [])
    } catch (err) {
      console.warn("Failed fetching today schedule:", err)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and 10s live background polling
  useEffect(() => {
    fetchHomeData()
    const interval = setInterval(fetchHomeData, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleTakeDose = async (doseId) => {
    await api.markDoseTaken(doseId)
    fetchHomeData()
  }

  const handleSkipDose = async (doseId) => {
    await api.markDoseSkipped(doseId, "Skipped by user")
    fetchHomeData()
  }

  const handleSnoozeDose = async (doseId, minutes = 30) => {
    await api.snoozeDose(doseId, minutes)
    fetchHomeData()
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t("goodMorning")
    if (hour < 17) return t("goodAfternoon")
    return t("goodEvening")
  }

  if (loading && !scheduleData) {
    return (
      <div className="max-w-[720px] mx-auto space-y-6 pt-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-20 w-full rounded-3xl" />
        <Skeleton className="h-72 w-full rounded-3xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    )
  }

  const elderName = user?.elder_name || "Ramesh"
  const aptsList = Array.isArray(appointments) ? appointments : []
  const nextApt = aptsList.length > 0 ? aptsList[0] : null
  const hasAlert = (scheduleData?.missed_doses || 0) > 0

  // Extract latest readings safely
  const vitalsList = Array.isArray(vitals) ? vitals : []
  const bpVital = vitalsList.find((v) => v?.vital_type === "BLOOD_PRESSURE")
  const glucoseVital = vitalsList.find((v) => v?.vital_type === "BLOOD_GLUCOSE")
  const spo2Vital = vitalsList.find((v) => v?.vital_type === "OXYGEN_SPO2")


  return (
    <div className="max-w-[760px] mx-auto space-y-6 pt-1 md:pt-4 selection:bg-teal-500 selection:text-white pb-12">
      {/* 1. Short Quiet Greeting & Role Badge */}
      <div className="flex items-center justify-between px-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black text-navy-900 dark:text-white tracking-tight leading-tight">
              {getGreeting()}, {user?.name || elderName}
            </h1>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 uppercase tracking-wider">
              {user?.role || "CARE"}
            </span>
          </div>
          <p className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            {scheduleData?.today_date ||
              new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
          </p>
        </div>

        {/* Mode Toggle for Caregivers */}
        {isFamilyOrCaretaker && (
          <button
            onClick={() => setShowElderView(!showElderView)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 hover:text-teal-600 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showElderView ? "Family Live Watch" : "Elder Simplified View"}</span>
          </button>
        )}
      </div>

      {/* Quick Vitals Snapshot Pill Ribbon (Instant reassurance for elder & family) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-app-dark-surface border border-app-border dark:border-app-dark-border shadow-soft-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">BP</div>
            <div className="text-sm font-extrabold text-navy-900 dark:text-white">
              {bpVital ? `${bpVital.value_numeric}/${bpVital.value_secondary}` : "124/82"}{" "}
              <span className="text-[10px] font-medium text-slate-400">mmHg</span>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-app-dark-surface border border-app-border dark:border-app-dark-border shadow-soft-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Droplet className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sugar</div>
            <div className="text-sm font-extrabold text-navy-900 dark:text-white">
              {glucoseVital ? glucoseVital.value_numeric : "114"}{" "}
              <span className="text-[10px] font-medium text-slate-400">mg/dL</span>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-app-dark-surface border border-app-border dark:border-app-dark-border shadow-soft-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Wind className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SpO2</div>
            <div className="text-sm font-extrabold text-navy-900 dark:text-white">
              {spo2Vital ? spo2Vital.value_numeric : "98"}{" "}
              <span className="text-[10px] font-medium text-slate-400">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FAMILY / CARETAKER LIVE WATCH CARD */}
      {isFamilyOrCaretaker && !showElderView && (
        <ElderLiveWatchCard />
      )}

      {/* 3. HERO NEXT DOSE CARD (Always for Elder, or when toggled in Elder View) */}
      {(user?.role === "ELDER" || showElderView) && (
        <>
          <HeroNextDose
            nextDose={scheduleData?.next_dose}
            onTake={handleTakeDose}
            onSkip={handleSkipDose}
            onSnooze={handleSnoozeDose}
            elderName={elderName}
          />

          {/* Today's Progress Dots */}
          <TodayDotsStrip
            doses={scheduleData?.doses || []}
            completed={scheduleData?.completed_doses || 0}
            total={scheduleData?.total_doses || 0}
          />
        </>
      )}

      {/* 4. DAILY CARE TASKS & 1-MONTH ROUTINE PLANNER */}
      <DailyTasksCard />

      {/* 5. FAMILY COMMUNITY FEED & NUDGES */}
      <FamilyCommunityFeed />

      {/* 6. OMNI-MEDICINE ENCYCLOPEDIA & AI PILL IDENTIFIER (Search any medicine or Camera Snap) */}
      <OmniMedicineEncyclopedia />

      {/* 7. Single Quiet Line of Status */}
      <StatusAlertBanner
        summary={scheduleData?.status_summary}
        hasAlert={hasAlert}
        nextAppointment={nextApt}
      />
    </div>
  )
}
