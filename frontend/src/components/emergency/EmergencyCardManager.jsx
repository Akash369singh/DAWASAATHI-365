import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { QRCodeSVG } from "qrcode.react"
import {
  QrCode,
  ShieldCheck,
  Lock,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Eye,
  AlertTriangle,
  Printer,
  Sparkles,
} from "lucide-react"
import { api } from "../../lib/api"
import { useAuth } from "../../context/AuthContext"

const FIELD_LABELS = [
  { key: "name", label: "Elder Full Name & Age", default: true },
  { key: "blood_group", label: "Blood Group (e.g. B+, O+)", default: false },
  { key: "allergies", label: "Known Drug & Food Allergies", default: true },
  { key: "current_medicines", label: "Active Medication List & Dosages", default: true },
  { key: "doctor", label: "Primary Consulting Doctor", default: false },
  { key: "emergency_contacts", label: "Family Emergency Contacts & Phone", default: true },
]

export function EmergencyCardManager() {
  const { user } = useAuth()
  const canEdit = user?.role === "ELDER" || user?.role === "CARETAKER"

  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  // Local form state
  const [isEnabled, setIsEnabled] = useState(false)
  const [fields, setFields] = useState({})
  const [bloodGroup, setBloodGroup] = useState("")
  const [allergies, setAllergies] = useState("")
  const [notes, setNotes] = useState("")
  const [saveSuccess, setSaveSuccess] = useState(false)

  const fetchSettings = async () => {
    try {
      const data = await api.getEmergencyCardSettings()
      setSettings(data)
      setIsEnabled(data.is_enabled)
      setFields(data.exposed_fields || {})
      setBloodGroup(data.blood_group || "")
      setAllergies(data.allergies || "")
      setNotes(data.emergency_notes || "")
    } catch (err) {
      console.warn("Failed fetching emergency card settings:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleToggleField = (key) => {
    if (!canEdit) return
    setFields((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSave = async () => {
    if (!canEdit) return
    try {
      setSaving(true)
      const updated = await api.updateEmergencyCardSettings({
        is_enabled: isEnabled,
        exposed_fields: fields,
        blood_group: bloodGroup,
        allergies: allergies,
        emergency_notes: notes,
      })
      setSettings(updated)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      alert("Failed saving settings: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerate = async () => {
    if (!canEdit) return
    if (!confirm("Regenerating the token will immediately REVOKE the previous QR link. Any printed cards with the old QR code will stop working. Continue?")) {
      return
    }

    try {
      setRegenerating(true)
      const res = await api.regenerateEmergencyCardToken()
      alert("Old link revoked! New emergency token generated.")
      await fetchSettings()
    } catch (err) {
      alert("Failed to regenerate token: " + err.message)
    } finally {
      setRegenerating(false)
    }
  }

  const copyUrl = () => {
    if (!settings?.public_url) return
    navigator.clipboard.writeText(settings.public_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="p-6 rounded-3xl bg-white dark:bg-app-dark-surface border border-app-border dark:border-app-dark-border shadow-soft-sm animate-pulse">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3" />
        <div className="h-28 w-full bg-slate-100 dark:bg-slate-800 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="rounded-3xl bg-white dark:bg-app-dark-surface border border-app-border dark:border-app-dark-border shadow-soft-md p-5 sm:p-6 transition-all duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-soft-sm shadow-red-500/20">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-navy-900 dark:text-white tracking-tight">
                Emergency QR Card & Wallet Pass
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300">
                Feature 2
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              Unguessable public medical card for first responders (Paramedics, ER, Good Samaritans)
            </p>
          </div>
        </div>

        {/* Master Enable/Disable Toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">
            {isEnabled ? "Card Active" : "Card Disabled"}
          </span>
          <div
            onClick={() => {
              if (canEdit) setIsEnabled(!isEnabled)
            }}
            className={`w-12 h-6.5 rounded-full p-1 transition-colors flex items-center ${
              isEnabled ? "bg-red-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
            }`}
          >
            <motion.div
              layout
              className="w-4.5 h-4.5 rounded-full bg-white shadow-md"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </div>
        </label>
      </div>

      {/* Main Configuration Layout */}
      {isEnabled ? (
        <div className="space-y-5">
          {/* QR Preview & Action Strip */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0 w-full md:w-auto">
              {settings?.public_url && (
                <div className="p-2.5 rounded-2xl bg-white border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                  <QRCodeSVG value={settings.public_url} size={84} level="M" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Unguessable Public Link
                </span>
                <div className="text-xs font-mono font-bold text-navy-900 dark:text-white truncate max-w-sm mt-0.5">
                  {settings?.public_url || "Generating token..."}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Public, read-only, strict noindex, rate-limited to 30 req/min.
                </p>
                {settings?.last_viewed_at && (
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    Last viewed by first responders: {new Date(settings.last_viewed_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Link Buttons */}
            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={copyUrl}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-navy-900 dark:text-white text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-soft-sm transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy Link"}</span>
              </button>

              <a
                href={settings?.public_url}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black flex items-center gap-1.5 shadow-soft-sm transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View & Print Card</span>
              </a>

              {canEdit && (
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  title="Revokes previous URL and generates a new token"
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} />
                </button>
              )}
            </div>
          </div>

          {/* Privacy Field Selectors (Elder chooses which fields to expose) */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Elder Privacy Control: Select Exposed Fields
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                Defaults: Minimal
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {FIELD_LABELS.map((item) => {
                const checked = fields[item.key] ?? item.default
                return (
                  <label
                    key={item.key}
                    className={`p-3 rounded-2xl border flex items-center gap-2.5 cursor-pointer select-none transition-all ${
                      checked
                        ? "bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/40"
                        : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!canEdit}
                      checked={checked}
                      onChange={() => handleToggleField(item.key)}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <span className="text-xs font-extrabold text-navy-900 dark:text-white">
                      {item.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Emergency Medical Data Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div>
              <label className="block text-xs font-bold text-navy-900 dark:text-slate-300 mb-1">
                Blood Group
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value.toUpperCase())}
                placeholder="e.g. B+ POSITIVE, O+, A-"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-app-border dark:border-app-dark-border text-navy-900 dark:text-white font-mono text-sm uppercase focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-900 dark:text-slate-300 mb-1">
                Known Drug & Food Allergies
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. Penicillin, Sulfa drugs, Peanuts"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-app-border dark:border-app-dark-border text-navy-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-navy-900 dark:text-slate-300 mb-1">
                Critical Medical Notes for Paramedics
              </label>
              <textarea
                rows={2}
                disabled={!canEdit}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Type-2 Diabetic, Pacemaker fitted 2022, carries nitro tablets for chest pain."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-app-border dark:border-app-dark-border text-navy-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* Save Action */}
          {canEdit && (
            <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {saveSuccess ? "✓ Emergency Card preferences saved!" : ""}
              </span>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-extrabold text-xs shadow-soft-sm transition-all disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Card Preferences"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/40 text-center border border-dashed border-slate-200 dark:border-slate-800">
          <Lock className="w-6 h-6 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Emergency QR card is currently disabled by elder privacy controls.
          </p>
          {canEdit && (
            <button
              onClick={() => {
                setIsEnabled(true)
                handleSave()
              }}
              className="mt-2 text-xs font-extrabold text-red-600 dark:text-red-400 underline"
            >
              Enable Emergency QR Card
            </button>
          )}
        </div>
      )}
    </div>
  )
}
