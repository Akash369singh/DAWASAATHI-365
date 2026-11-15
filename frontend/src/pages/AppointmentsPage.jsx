import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Calendar, Plus, MapPin, Clock, Stethoscope, Mic, Trash2, CheckCircle2 } from "lucide-react"
import { api } from "../lib/api"
import { Button } from "../components/common/Button"
import { Drawer } from "../components/common/Drawer"
import { Skeleton } from "../components/common/Skeleton"
import { EmptyState } from "../components/common/EmptyState"

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  // Drawer Add/Edit state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [formData, setFormData] = useState({
    doctor_name: "",
    specialty: "General Physician",
    location: "",
    scheduled_datetime: "",
    notes: "",
  })

  // Voice Add state
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [voiceText, setVoiceText] = useState("")
  const [voiceLoading, setVoiceLoading] = useState(false)
  const [voiceParsed, setVoiceParsed] = useState(null)

  const fetchApts = async () => {
    try {
      const data = await api.listAppointments(false)
      setAppointments(data)
    } catch (err) {
      console.error("Failed fetching appointments:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApts()
  }, [])

  const handleOpenAdd = () => {
    // Default to tomorrow at 10:00 AM
    const tmrw = new Date()
    tmrw.setDate(tmrw.getDate() + 1)
    tmrw.setHours(10, 0, 0, 0)
    const localIso = new Date(tmrw.getTime() - tmrw.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)

    setFormData({
      doctor_name: "",
      specialty: "General Physician",
      location: "Apollo Clinic, Indiranagar",
      scheduled_datetime: localIso,
      notes: "",
    })
    setDrawerOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      await api.createAppointment(formData)
      setDrawerOpen(false)
      fetchApts()
    } catch (err) {
      alert("Error scheduling appointment: " + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to cancel this appointment?")) {
      await api.deleteAppointment(id)
      fetchApts()
    }
  }

  const handleVoiceParse = async () => {
    if (!voiceText.trim()) return
    setVoiceLoading(true)
    try {
      const res = await api.parseNaturalLanguage(voiceText, "APPOINTMENT")
      setVoiceParsed(res)
    } catch (err) {
      alert("Failed to parse: " + err.message)
    } finally {
      setVoiceLoading(false)
    }
  }

  const handleConfirmVoiceApt = async () => {
    if (!voiceParsed?.parsed_data) return
    const p = voiceParsed.parsed_data
    try {
      await api.createAppointment({
        doctor_name: p.doctor_name || "Dr. Arvind Shah",
        specialty: p.specialty || "Consultant",
        location: p.location || "Apollo Clinic",
        scheduled_datetime: p.scheduled_datetime || new Date().toISOString(),
        notes: p.notes || "Added via voice",
      })
      setVoiceOpen(false)
      setVoiceText("")
      setVoiceParsed(null)
      fetchApts()
    } catch (err) {
      alert("Error saving appointment: " + err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-navy-900 dark:text-white tracking-tight">
            Doctor Appointments
          </h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Upcoming consultations, visits, and preparation notes
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="md"
            icon={Mic}
            onClick={() => {
              setVoiceParsed(null)
              setVoiceText("")
              setVoiceOpen(true)
            }}
          >
            Add by Speaking
          </Button>

          <Button variant="primary" size="md" icon={Plus} onClick={handleOpenAdd}>
            Schedule Visit
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
        </div>
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Appointments Scheduled"
          description="Keep your doctor checkups organized and receive proactive email reminders 24 hours and 2 hours prior."
          actionLabel="Schedule Appointment"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.map((apt) => (
            <motion.div
              key={apt.id}
              layout
              className="bg-white dark:bg-app-dark-surface rounded-3xl border border-app-border dark:border-app-dark-border p-6 shadow-soft-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-navy-900 dark:text-white leading-tight">
                        {apt.doctor_name}
                      </h3>
                      <div className="text-xs font-bold text-teal-600 dark:text-teal-400 mt-0.5">
                        {apt.specialty}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(apt.id)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-navy-900/50 p-4 rounded-2xl mb-4">
                  <div className="flex items-center gap-2 font-bold text-navy-900 dark:text-white">
                    <Clock className="w-4 h-4 text-teal-500" />
                    <span>{apt.scheduled_datetime_local}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{apt.location}</span>
                  </div>
                  {apt.notes && (
                    <div className="text-xs text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800">
                      Note: {apt.notes}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-app-border dark:border-app-dark-border">
                <span>Reminders: 24h & 2h before</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* DRAWER: Schedule Appointment Form */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Schedule Doctor Appointment"
        subtitle="We will proactively email reminders to you and your Care Circle"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Doctor Name
            </label>
            <input
              type="text"
              value={formData.doctor_name}
              onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })}
              placeholder="e.g. Dr. Arvind Shah"
              className="w-full px-4 py-3 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Specialty
              </label>
              <input
                type="text"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                placeholder="e.g. Cardiologist"
                className="w-full px-4 py-3 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_datetime}
                onChange={(e) => setFormData({ ...formData, scheduled_datetime: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Hospital or Clinic Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. Apollo Clinic, Indiranagar, Bengaluru"
              className="w-full px-4 py-3 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Preparation Notes / Checklist
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Fasting sugar test needed, bring previous ECG reports"
              className="w-full px-4 py-3 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <Button
              variant="outline"
              size="md"
              className="flex-1"
              onClick={() => setDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" className="flex-1">
              Schedule Appointment
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DRAWER: Voice Adder for Appointments */}
      <Drawer
        isOpen={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        title="Schedule by Speaking / Typing"
        subtitle="e.g. 'kal subah 10 baje Dr. Shah ke saath appointment'"
      >
        <div className="space-y-4">
          <textarea
            rows={3}
            value={voiceText}
            onChange={(e) => setVoiceText(e.target.value)}
            placeholder="e.g. kal subah 10:30 baje Dr. Arvind Shah ke saath appointment"
            className="w-full p-4 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm font-medium"
          />

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setVoiceText("kal subah 10:30 baje Dr. Arvind Shah ke saath appointment")}
            >
              Demo Phrase
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              loading={voiceLoading}
              onClick={handleVoiceParse}
            >
              Parse with Gemini
            </Button>
          </div>

          {voiceParsed && (
            <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/40 space-y-3">
              <p className="text-sm font-bold text-navy-900 dark:text-white">
                {voiceParsed.explanation}
              </p>
              <div className="text-xs bg-white dark:bg-app-dark-surface p-3 rounded-xl space-y-1">
                <div>
                  <strong>Doctor:</strong> {voiceParsed.parsed_data?.doctor_name}
                </div>
                <div>
                  <strong>Specialty:</strong> {voiceParsed.parsed_data?.specialty}
                </div>
                <div>
                  <strong>Location:</strong> {voiceParsed.parsed_data?.location}
                </div>
              </div>
              <Button variant="primary" size="md" className="w-full" onClick={handleConfirmVoiceApt}>
                Confirm & Save Appointment ✓
              </Button>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  )
}
