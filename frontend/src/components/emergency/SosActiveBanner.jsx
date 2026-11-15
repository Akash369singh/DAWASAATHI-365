import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldAlert, MapPin, CheckCircle2, AlertTriangle, ShieldCheck, Check } from "lucide-react"
import { api } from "../../lib/api"
import { useAuth } from "../../context/AuthContext"

export function SosActiveBanner() {
  const { user } = useAuth()
  const [activeSos, setActiveSos] = useState(null)
  const [loadingAction, setLoadingAction] = useState(false)

  const fetchActive = async () => {
    try {
      const data = await api.getActiveSos()
      setActiveSos(data)
    } catch (err) {
      console.warn("Failed fetching active SOS:", err)
    }
  }

  useEffect(() => {
    fetchActive()
    const timer = setInterval(fetchActive, 7000)
    return () => clearInterval(timer)
  }, [])

  const handleAcknowledge = async () => {
    if (!activeSos) return
    try {
      setLoadingAction(true)
      await api.ackSos(activeSos.id)
      await fetchActive()
    } catch (err) {
      alert(err.message || "Failed to acknowledge SOS")
    } finally {
      setLoadingAction(false)
    }
  }

  const handleResolve = async () => {
    if (!activeSos) return
    if (!confirm("Are you sure this emergency has been handled safely and can be resolved?")) {
      return
    }
    try {
      setLoadingAction(true)
      await api.resolveSos(activeSos.id)
      setActiveSos(null)
    } catch (err) {
      alert(err.message || "Failed to resolve SOS")
    } finally {
      setLoadingAction(false)
    }
  }

  if (!activeSos) return null

  const isAck = activeSos.status === "ACK"

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="w-full z-30 sticky top-[61px] shadow-lg"
      >
        <div
          className={`px-4 py-3 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-3 ${
            isAck
              ? "bg-amber-600 text-white"
              : "bg-red-600 text-white animate-pulse"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md text-[11px]">
                  {isAck
                    ? "SOS In Progress (ACK)"
                    : activeSos.incident_type && activeSos.incident_type !== "GENERAL_SOS"
                    ? `🚨 MEDICATION EMERGENCY (${activeSos.incident_type.replace(/_/g, " ")})`
                    : "Emergency SOS Active"}
                </span>
                <span className="font-extrabold text-sm sm:text-base">
                  Triggered by {activeSos.triggered_by}
                </span>
                <span className="text-xs opacity-90">
                  at {activeSos.created_at_local}
                </span>
              </div>

              {activeSos.medication_details && (
                <div className="text-xs font-bold bg-black/20 px-2.5 py-1 rounded-lg mt-1 inline-block">
                  ⚠️ {activeSos.medication_details}
                </div>
              )}

              <div className="text-xs opacity-95 flex items-center gap-3 mt-0.5 flex-wrap">
                {activeSos.maps_url && (
                  <a
                    href={activeSos.maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold underline text-white hover:text-amber-100"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>View Location on Google Maps</span>
                  </a>
                )}

                {isAck && activeSos.acknowledged_by && (
                  <span className="inline-flex items-center gap-1 font-bold bg-white/25 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{activeSos.acknowledged_by} is responding ("I'm on it")</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isAck && (
              <button
                onClick={handleAcknowledge}
                disabled={loadingAction}
                className="px-3.5 py-1.5 rounded-xl bg-white text-red-700 hover:bg-red-50 font-black text-xs uppercase tracking-wider shadow-sm transition-transform active:scale-95 disabled:opacity-50"
              >
                I'm on it (Acknowledge)
              </button>
            )}

            <button
              onClick={handleResolve}
              disabled={loadingAction}
              className="px-3.5 py-1.5 rounded-xl bg-black/30 hover:bg-black/50 text-white font-extrabold text-xs uppercase tracking-wider border border-white/30 transition-all disabled:opacity-50 flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Resolve SOS ✓</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
