import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldAlert, X, AlertTriangle, CheckCircle2, Navigation } from "lucide-react"
import { api } from "../../lib/api"
import { useAuth } from "../../context/AuthContext"

export function SosTopBarButton({ onSosTriggered }) {
  const { user } = useAuth()
  const isEligible = user?.role === "ELDER" || user?.role === "CARETAKER"

  // Press & hold state
  const [holding, setHolding] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0) // 0 to 100
  const holdTimerRef = useRef(null)
  const animFrameRef = useRef(null)
  const holdStartTimeRef = useRef(null)

  // 5-second cancel toast state
  const [toastActive, setToastActive] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const cancelTimerRef = useRef(null)
  const [statusMessage, setStatusMessage] = useState("")

  const HOLD_DURATION = 2000 // 2 seconds

  // Start hold timer
  const handleHoldStart = (e) => {
    // Only elder or caretaker can trigger
    if (!isEligible) {
      alert("Only Elder or primary Caretaker can trigger the Emergency SOS.")
      return
    }

    if (toastActive) return

    setHolding(true)
    setHoldProgress(0)
    holdStartTimeRef.current = Date.now()

    const updateProgress = () => {
      const elapsed = Date.now() - holdStartTimeRef.current
      const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100)
      setHoldProgress(progress)

      if (elapsed < HOLD_DURATION) {
        animFrameRef.current = requestAnimationFrame(updateProgress)
      } else {
        // 2 seconds completed!
        setHolding(false)
        setHoldProgress(0)
        startCancelToast()
      }
    }

    animFrameRef.current = requestAnimationFrame(updateProgress)
  }

  // Release early
  const handleHoldEnd = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
    }
    setHolding(false)
    setHoldProgress(0)
  }

  // Start 5-second cancel toast
  const startCancelToast = () => {
    setToastActive(true)
    setCountdown(5)

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200])
    }

    let remaining = 5
    cancelTimerRef.current = setInterval(() => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining <= 0) {
        clearInterval(cancelTimerRef.current)
        executeSosDispatch()
      }
    }, 1000)
  }

  // Cancel toast immediately
  const handleCancelToast = () => {
    if (cancelTimerRef.current) {
      clearInterval(cancelTimerRef.current)
    }
    setToastActive(false)
    setStatusMessage("SOS Aborted.")
    setTimeout(() => setStatusMessage(""), 3000)
  }

  // Geolocation + Backend POST /sos
  const executeSosDispatch = async () => {
    setToastActive(false)
    setStatusMessage("Dispatching Emergency SOS...")

    const proceedWithCoords = async (latitude = null, longitude = null) => {
      try {
        const res = await api.triggerSos({
          latitude,
          longitude,
          notes: `Emergency SOS triggered by ${user?.member_name || user?.name || "User"} via DawaSaathi 365 App`,
        })
        setStatusMessage("🚨 SOS Dispatched! Emergency contacts alerted.")
        if (onSosTriggered) onSosTriggered(res)
        setTimeout(() => setStatusMessage(""), 5000)
      } catch (err) {
        alert("Failed to send SOS: " + err.message)
        setStatusMessage("")
      }
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          proceedWithCoords(pos.coords.latitude, pos.coords.longitude)
        },
        (err) => {
          // Never block SOS if permission denied or timeout
          console.warn("Geolocation skipped for SOS:", err.message)
          proceedWithCoords(null, null)
        },
        { timeout: 2000, maximumAge: 60000 }
      )
    } else {
      proceedWithCoords(null, null)
    }
  }

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (cancelTimerRef.current) clearInterval(cancelTimerRef.current)
    }
  }, [])

  return (
    <>
      {/* Small, always-visible Top Bar Icon with Circular Progress Indicator */}
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onMouseDown={handleHoldStart}
          onMouseUp={handleHoldEnd}
          onMouseLeave={handleHoldEnd}
          onTouchStart={handleHoldStart}
          onTouchEnd={handleHoldEnd}
          title="Hold 2s for Emergency SOS"
          className="relative select-none flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-xs shadow-soft-sm shadow-red-500/30 transition-all cursor-pointer overflow-hidden"
        >
          {/* Circular Progress Ring while holding */}
          {holding && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <rect
                x="0"
                y="0"
                width={`${holdProgress}%`}
                height="100%"
                fill="rgba(255, 255, 255, 0.35)"
              />
            </svg>
          )}

          <ShieldAlert className={`w-4 h-4 ${holding ? "animate-pulse" : ""}`} />
          <span>{holding ? "HOLD..." : "SOS"}</span>

          {holding && (
            <span className="text-[10px] opacity-90 font-mono">
              {Math.round(holdProgress)}%
            </span>
          )}
        </button>

        {statusMessage && (
          <span className="hidden md:inline-block ml-2 text-xs font-bold text-red-600 dark:text-red-400 animate-pulse">
            {statusMessage}
          </span>
        )}
      </div>

      {/* 5-Second Cancel Toast */}
      <AnimatePresence>
        {toastActive && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md">
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="bg-red-600 text-white rounded-2xl p-4 shadow-2xl border-2 border-red-400 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-xl shrink-0 animate-ping [animation-duration:1.5s]">
                  {countdown}
                </div>
                <div className="min-w-0">
                  <div className="font-black text-sm tracking-tight flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Emergency SOS Triggering in {countdown}s...</span>
                  </div>
                  <p className="text-xs text-red-100 font-medium truncate">
                    Tap Cancel immediately if this was accidental.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCancelToast}
                className="px-4 py-2 rounded-xl bg-white text-red-700 hover:bg-red-50 font-black text-xs uppercase tracking-wider shrink-0 shadow-soft-sm transition-transform active:scale-95"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
