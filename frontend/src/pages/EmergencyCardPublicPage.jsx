import React, { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { QRCodeSVG } from "qrcode.react"
import {
  ShieldAlert,
  Heart,
  AlertTriangle,
  Pill,
  Phone,
  User,
  Activity,
  Printer,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from "lucide-react"
import { api } from "../lib/api"

export function EmergencyCardPublicPage() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Inject noindex meta tag for strict search engine privacy
    let metaTag = document.querySelector('meta[name="robots"]')
    if (!metaTag) {
      metaTag = document.createElement("meta")
      metaTag.name = "robots"
      document.head.appendChild(metaTag)
    }
    metaTag.content = "noindex, nofollow, noarchive"

    const fetchCard = async () => {
      try {
        const res = await api.getPublicEmergencyCard(token)
        setData(res)
      } catch (err) {
        setError(err.message || "Emergency Card not found or has been disabled.")
      } finally {
        setLoading(false)
      }
    }

    if (token) fetchCard()
  }, [token])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-navy-900">Card Unavailable</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            {error || "This emergency medical card is either revoked or private."}
          </p>
          <div className="text-xs text-slate-400 pt-2">
            DawaSaathi 365 Patient Privacy Guard
          </div>
        </div>
      </div>
    )
  }

  const patient = data.patient
  const currentUrl = window.location.href

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-navy-900 p-4 sm:p-6 lg:p-8 font-sans antialiased selection:bg-red-500 selection:text-white">
      {/* Top Warning Banner for First Responders */}
      <div className="max-w-xl mx-auto mb-4 bg-red-600 text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <ShieldAlert className="w-5 h-5 shrink-0 text-white animate-pulse" />
          <div className="min-w-0">
            <div className="font-black text-xs sm:text-sm uppercase tracking-wider">
              Emergency Medical Information
            </div>
            <div className="text-[11px] opacity-90 truncate">
              Authorized public view for First Responders & Medical Staff
            </div>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-red-700 font-extrabold text-xs shadow-sm hover:bg-red-50 transition-all shrink-0"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Wallet Card</span>
        </button>
      </div>

      {/* Main Card Container (Optimized for Mobile Screen & Print Wallet Size) */}
      <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden print:border-2 print:border-red-600 print:shadow-none print:w-[85.6mm] print:h-auto print:rounded-2xl">
        {/* Card Red Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-5 sm:p-6 relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-md">
                  Emergency Medical ID
                </span>
                <span className="text-[10px] font-bold text-red-200">
                  DawaSaathi 365
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                {patient ? patient.name : "Patient"}
              </h1>
              {patient?.age && (
                <p className="text-xs font-semibold text-red-100 mt-0.5">
                  Age {patient.age} • Senior Citizen Care
                </p>
              )}
            </div>

            {/* Blood Group Badge */}
            {data.blood_group && (
              <div className="bg-white text-red-600 px-3.5 py-2 rounded-2xl text-center shadow-lg shrink-0">
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Blood Group
                </div>
                <div className="text-xl sm:text-2xl font-black leading-none mt-0.5">
                  {data.blood_group}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Critical Allergies Box */}
          {data.allergies && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950">
              <div className="flex items-center gap-2 mb-1 font-black text-xs uppercase tracking-wider text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Known Allergies & Drug Alerts</span>
              </div>
              <p className="text-sm font-extrabold text-amber-900 leading-snug pl-6">
                {data.allergies}
              </p>
            </div>
          )}

          {/* Current Medications List */}
          {data.current_medicines && data.current_medicines.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                <Pill className="w-4 h-4 text-teal-600" />
                <span>Active Prescriptions & Dosages</span>
              </div>
              <div className="space-y-2">
                {data.current_medicines.map((med, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-extrabold text-sm text-navy-900">
                        {med.name}
                        <span className="ml-2 font-semibold text-slate-500">
                          {med.dosage}
                        </span>
                      </div>
                      {med.instructions && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {med.instructions}
                        </div>
                      )}
                    </div>
                    {med.schedule_times && med.schedule_times.length > 0 && (
                      <span className="font-mono text-[10px] font-bold bg-white px-2 py-1 rounded-lg border text-slate-600 shrink-0">
                        {med.schedule_times.join(", ")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Contacts with Tap-to-Call */}
          {data.emergency_contacts && data.emergency_contacts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>Emergency Contacts (Tap to Call)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {data.emergency_contacts.map((contact, i) => (
                  <a
                    key={i}
                    href={contact.phone ? `tel:${contact.phone}` : `mailto:${contact.email}`}
                    className="p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-black text-sm text-emerald-950 flex items-center gap-1.5">
                        <span>{contact.name}</span>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-200/60 text-emerald-800">
                          {contact.role}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-emerald-700 mt-0.5">
                        {contact.phone || contact.email}
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                      <Phone className="w-4 h-4" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Primary Doctor */}
          {data.doctor && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-extrabold uppercase text-[10px] text-slate-400 block mb-1">
                Primary Consulting Doctor
              </span>
              <div className="font-black text-sm text-navy-900">
                {data.doctor.name} ({data.doctor.specialty || "Physician"})
              </div>
              {data.doctor.location && (
                <div className="text-slate-500 mt-0.5">{data.doctor.location}</div>
              )}
            </div>
          )}

          {/* Medical Notes */}
          {data.emergency_notes && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-extrabold uppercase text-[10px] text-slate-400 block mb-1">
                Emergency Medical Notes
              </span>
              <p className="text-slate-700 font-medium leading-relaxed">
                {data.emergency_notes}
              </p>
            </div>
          )}

          {/* QR Code Verification Section */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-black text-navy-900">
                Scan for Live Medical Record
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Always up-to-date. Maintained securely by elder and designated family caretakers.
              </p>
              <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                {currentUrl}
              </div>
            </div>

            <div className="p-2 rounded-2xl bg-white border border-slate-200 shadow-sm shrink-0">
              <QRCodeSVG value={currentUrl} size={76} level="M" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 text-center border-t border-slate-200 text-[11px] text-slate-400 font-semibold">
          DawaSaathi 365 Emergency Identity Circuit • Confidential Health Record
        </div>
      </div>
    </div>
  )
}
