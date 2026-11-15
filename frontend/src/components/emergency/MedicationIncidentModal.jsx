import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertTriangle,
  Pill,
  ShieldAlert,
  CheckCircle2,
  PhoneCall,
  X,
  HeartPulse,
  Info,
  Clock,
} from "lucide-react"
import { api } from "../../lib/api"
import { useAuth } from "../../context/AuthContext"

export function MedicationIncidentModal({ isOpen, onClose, defaultMedication = "" }) {
  const { user } = useAuth()
  const [incidentType, setIncidentType] = useState("OVERDOSE")
  const [medicationName, setMedicationName] = useState(defaultMedication)
  const [dosage, setDosage] = useState("1 extra tablet")
  const [symptoms, setSymptoms] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [dispatched, setDispatched] = useState(false)
  const [result, setResult] = useState(null)
  const [myMedications, setMyMedications] = useState([])

  useEffect(() => {
    if (isOpen) {
      if (defaultMedication) setMedicationName(defaultMedication)
      api.getMedications().then((meds) => {
        if (Array.isArray(meds)) setMyMedications(meds)
      }).catch(() => {})
    }
  }, [isOpen, defaultMedication])

  const incidentOptions = [
    {
      id: "OVERDOSE",
      label: "Double Dose / Overdose",
      sub: "Accidentally took 2+ doses / दवा दो बार ले ली",
      icon: "💊",
      color: "border-red-500 bg-red-50/60 dark:bg-red-950/30 text-red-700 dark:text-red-300",
    },
    {
      id: "WRONG_MEDICINE",
      label: "Wrong Medicine Taken",
      sub: "Took someone else's pill or wrong bottle / गलत दवा खाई",
      icon: "⚠️",
      color: "border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
    },
    {
      id: "ADVERSE_REACTION",
      label: "Severe Reaction / Distress",
      sub: "Dizzy, allergic or unwell after taking pill / तबियत बिगड़ी",
      icon: "🤢",
      color: "border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300",
    },
  ]

  const symptomPresets = [
    "Dizziness / चक्कर",
    "Nausea / उल्टी जैसा",
    "Extreme Drowsiness / सुस्ती",
    "Rapid Pulse / घबराहट",
    "Breathlessness / सांस फूलना",
    "None yet / अभी ठीक है",
  ]

  const handleToggleSymptom = (sym) => {
    if (symptoms.includes(sym)) {
      setSymptoms(symptoms.replace(sym, "").replace(/,\s*,/g, ",").trim())
    } else {
      setSymptoms(symptoms ? `${symptoms}, ${sym}` : sym)
    }
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    setLoading(true)

    const payload = {
      incident_type: incidentType,
      medication_name: medicationName || "Unspecified Medicine",
      dosage: dosage,
      symptoms: symptoms,
      notes: notes,
      latitude: null,
      longitude: null,
    }

    const proceed = async (lat = null, lng = null) => {
      payload.latitude = lat
      payload.longitude = lng
      try {
        const res = await api.triggerMedicationIncident(payload)
        setResult(res)
        setDispatched(true)
      } catch (err) {
        alert("Failed to send emergency alert: " + (err.message || "Network error"))
      } finally {
        setLoading(false)
      }
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => proceed(pos.coords.latitude, pos.coords.longitude),
        () => proceed(null, null),
        { timeout: 3000 }
      )
    } else {
      proceed(null, null)
    }
  }

  const handleClose = () => {
    setDispatched(false)
    setResult(null)
    setSymptoms("")
    setNotes("")
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-red-950/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-white dark:bg-app-dark-surface rounded-3xl p-6 md:p-8 shadow-2xl border-2 border-red-500 z-10 my-8 text-left"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {!dispatched ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Emergency Banner Header */}
              <div className="flex items-center gap-3 border-b pb-4 border-red-100 dark:border-red-900/40">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-red-600">
                    Urgent Medical Safety Circuit
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-navy-900 dark:text-white">
                    Medication Incident / Overdose SOS
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    This will immediately broadcast a critical emergency email alert to all family members & caretakers.
                  </p>
                </div>
              </div>

              {/* Step 1: Select Incident Type */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                  1. What happened? (क्या समस्या हुई?)
                </label>
                <div className="space-y-2">
                  {incidentOptions.map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setIncidentType(opt.id)}
                      className={`w-full p-3 rounded-2xl border-2 text-left flex items-center gap-3 transition-all ${
                        incidentType === opt.id
                          ? opt.color + " shadow-sm scale-[1.01]"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900/40 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="text-2xl shrink-0">{opt.icon}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold">{opt.label}</div>
                        <div className="text-xs opacity-80 truncate">{opt.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Medication Name */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  2. Which medicine was involved? (दवा का नाम)
                </label>
                <input
                  type="text"
                  value={medicationName}
                  onChange={(e) => setMedicationName(e.target.value)}
                  placeholder="e.g. Metformin 500mg, or 'Green pill from night box'"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-navy-900/60 text-sm font-semibold text-navy-900 dark:text-white"
                />

                {/* Quick medication pill chips */}
                {myMedications.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    <span className="text-[11px] text-slate-400 font-medium">Quick select:</span>
                    {myMedications.map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => {
                          setMedicationName(m.name)
                          if (m.dosage) setDosage(m.dosage)
                        }}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 dark:bg-slate-800 dark:text-slate-300 font-semibold transition-colors"
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 3: Estimated Dosage Taken */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  3. Quantity / Dosage taken (कितनी मात्रा खाई?)
                </label>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="e.g. 2 tablets instead of 1, 1000mg, half tablet"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-navy-900/60 text-sm font-semibold text-navy-900 dark:text-white"
                />
              </div>

              {/* Step 4: Symptoms */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  4. Current Symptoms / Feelings (लक्षण)
                </label>
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  {symptomPresets.map((sym, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => handleToggleSymptom(sym)}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-bold transition-all ${
                        symptoms.includes(sym)
                          ? "bg-red-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Additional symptoms or observations..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-navy-900/60 text-xs font-medium text-navy-900 dark:text-white"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-2xl font-black text-base shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldAlert className="w-5 h-5" />
                    <span>BROADCAST EMERGENCY ALERT TO FAMILY NOW</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-slate-400">
                Emails with immediate first-aid instructions and 1-click responder links will be dispatched to all members.
              </p>
            </form>
          ) : (
            /* Dispatched Confirmation Screen */
            <div className="space-y-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-emerald-600">Emergency Broadcast Dispatched!</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  All family members and caretakers have been alerted via high-priority emergency emails with your report and clinical instructions.
                </p>
              </div>

              {/* Contacted Members List */}
              {result?.contacts_alerted?.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-left border border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-bold text-navy-900 dark:text-white uppercase tracking-wider mb-2">
                    Alerted Emergency Contacts:
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    {result.contacts_alerted.map((c, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span>• <strong>{c.name}</strong> ({c.role})</span>
                        <span className="font-mono text-[11px] text-emerald-600">✓ Sent</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Immediate Clinical Guidance */}
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-4 rounded-2xl text-left space-y-2">
                <div className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Immediate Medical Instructions:</span>
                </div>
                <ul className="text-xs text-amber-900 dark:text-amber-200 space-y-1 pl-4 list-disc">
                  <li><strong>DO NOT</strong> induce vomiting unless instructed by a doctor.</li>
                  <li><strong>Keep the medicine package/foil</strong> ready in hand for doctors.</li>
                  <li>Stay seated comfortably. If breathing becomes difficult or dizzy, call <strong>112 / 108</strong>.</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <a
                  href="tel:112"
                  className="py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Call Emergency 112</span>
                </a>
                <button
                  onClick={handleClose}
                  className="py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold text-xs"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
