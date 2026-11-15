import React, { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Pill,
  Search,
  Camera,
  Mic,
  MicOff,
  Sparkles,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Info,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Flame,
  Droplet,
  Sun,
  Moon,
} from "lucide-react"
import { api } from "../../lib/api"

const SUGGESTIONS = [
  { label: "Metformin 500", query: "Metformin 500" },
  { label: "Pan 40", query: "Pan 40" },
  { label: "Telmisartan 40", query: "Telmisartan 40" },
  { label: "Dolo 650 / Paracetamol", query: "Paracetamol" },
  { label: "Augmentin 625", query: "Augmentin 625" },
  { label: "Combiflam", query: "Combiflam" },
  { label: "Atorvastatin 10", query: "Atorvastatin" },
  { label: "Thyronorm", query: "Thyronorm" },
  { label: "Amlodipine", query: "Amlodipine" },
]

export function OmniMedicineEncyclopedia() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")

  // Voice recording state
  const [listening, setListening] = useState(false)

  // Camera & Photo state
  const fileInputRef = useRef(null)
  const [previewImage, setPreviewImage] = useState(null)

  // Voice Search Handler (Web Speech API)
  const handleVoiceSearch = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert("Voice search is not supported by this browser. Please type the medicine name.")
      return
    }

    if (listening) {
      setListening(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = "hi-IN" // supports Hindi / Hinglish / Indian English
      recognition.interimResults = false

      recognition.onstart = () => {
        setListening(true)
      }

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setQuery(transcript)
        setListening(false)
        performSearch(transcript)
      }

      recognition.onerror = () => {
        setListening(false)
      }

      recognition.onend = () => {
        setListening(false)
      }

      recognition.start()
    } catch (err) {
      setListening(false)
    }
  }

  // Text Search
  const performSearch = async (searchTerm) => {
    const q = (searchTerm || query).trim()
    if (!q) return

    setLoading(true)
    setError("")
    setPreviewImage(null)

    try {
      const data = await api.getMedicineInfo(q)
      setResult(data)
    } catch (err) {
      setError(err.message || "Could not retrieve medicine details. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    performSearch()
  }

  // Camera File Input Trigger
  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Camera Snapshot / Photo Upload Handler
  const handlePhotoSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show instant preview
    const previewUrl = URL.createObjectURL(file)
    setPreviewImage(previewUrl)
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const data = await api.identifyMedicinePhoto(file)
      setResult(data)
      setQuery(data.name || "")
    } catch (err) {
      setError(err.message || "Could not recognize medicine from photo. Please enter name.")
    } finally {
      setLoading(false)
      // reset input so user can choose same photo if wanted
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <div className="rounded-3xl bg-gradient-to-b from-white to-slate-50/80 dark:from-app-dark-surface dark:to-[#091528] border-2 border-teal-500/20 shadow-soft-lg p-5 sm:p-7 relative overflow-hidden transition-all">
      {/* Hidden camera file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handlePhotoSelected}
        className="hidden"
      />

      {/* Ambient background decoration */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-52 h-52 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-52 h-52 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-soft-sm shadow-teal-500/20">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-navy-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Omni-Medicine Encyclopedia</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 uppercase tracking-wider hidden sm:inline-block">
                  AI Pill & Packaging Inspector
                </span>
              </h2>
            </div>
          </div>
          <span className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Global Pharmacopeia
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
          Duniya ki kisi bhi dawa ka naam likhein ya camera se photo khinchein — kisko khana chahiye, kab aur kaise lein, aur buzurgo ke liye vishesh savdhaniyan.
        </p>
      </div>

      {/* Search Input Bar + Camera & Mic Controls */}
      <div className="relative z-10 space-y-3">
        <form onSubmit={handleFormSubmit} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search medicine (e.g. Metformin 500, Pan 40, Telmisartan, Dolo)..."
              className="w-full pl-11 pr-24 py-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-navy-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 shadow-soft-sm transition-all"
            />
            {/* Inline Voice Mic Button */}
            <button
              type="button"
              onClick={handleVoiceSearch}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${
                listening
                  ? "bg-rose-500 text-white animate-pulse"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400"
              }`}
              title={listening ? "Listening... click to stop" : "Speak medicine name"}
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          {/* Camera Scan Pill Button */}
          <button
            type="button"
            onClick={handleCameraClick}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-200 hover:text-teal-600 font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 transition-all shrink-0"
            title="Scan tablet strip / bottle using Camera"
          >
            <Camera className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="hidden sm:inline">Camera Scan</span>
          </button>

          {/* Search Action Button */}
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-bold text-sm shadow-soft-sm shadow-teal-500/20 transition-all shrink-0 flex items-center gap-1.5"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Look up</span>
            )}
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Common:
          </span>
          {SUGGESTIONS.map((sug) => (
            <button
              key={sug.query}
              type="button"
              onClick={() => {
                setQuery(sug.query)
                performSearch(sug.query)
              }}
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-600 dark:text-slate-300 hover:text-teal-600 border border-slate-200 dark:border-slate-700 text-xs font-semibold shrink-0 transition-colors"
            >
              {sug.label}
            </button>
          ))}
        </div>
      </div>

      {/* Photo Preview Strip when photo was captured */}
      {previewImage && (
        <div className="relative z-10 mt-3 p-3 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={previewImage}
              alt="Pill scan preview"
              className="w-14 h-14 rounded-xl object-cover border border-teal-300 dark:border-teal-700 shadow-sm"
            />
            <div>
              <div className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                <span>Captured Pill Packaging</span>
              </div>
              <div className="text-[11px] text-teal-700 dark:text-teal-400">
                {loading ? "AI Vision analyzing packaging text & dosage..." : "Label identified successfully ✓"}
              </div>
            </div>
          </div>
          <button
            onClick={() => setPreviewImage(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading State Animation */}
      {loading && (
        <div className="relative z-10 my-6 text-center py-8">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h3 className="text-base font-bold text-navy-900 dark:text-white">
            Consulting Global Pharmacopeia AI...
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Retrieving clinical indications, dosage guidelines, and geriatric precautions.
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="relative z-10 my-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Rich Medicine Monograph Card */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative z-10 mt-5 space-y-4"
          >
            {/* 1. Header Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-app-border dark:border-slate-700 shadow-soft-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl sm:text-2xl font-black text-navy-900 dark:text-white tracking-tight">
                      {result.name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300">
                      {result.drug_class}
                    </span>
                    {result.detected_from_image && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        AI Vision Recognized
                      </span>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
                    Active Salt: <span className="font-mono font-bold text-navy-900 dark:text-slate-200">{result.generic_name}</span>
                  </div>
                  {result.brand_names && result.brand_names.length > 0 && (
                    <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-1 items-center">
                      <span className="font-bold">Common Brands:</span>
                      {result.brand_names.map((b) => (
                        <span
                          key={b}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 text-[11px] font-medium"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Key Grid: Kisko Khana Chahiye + Kab aur Kaise */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Card A: Kisko Khana Chahiye */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-app-border dark:border-slate-700 shadow-soft-sm space-y-2">
                <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-extrabold text-sm sm:text-base">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Kisko Khana Chahiye? (Who Should Take It)</span>
                </div>
                <p className="text-xs sm:text-sm text-navy-900 dark:text-slate-200 leading-relaxed font-medium">
                  {result.kisko_khana_chahiye}
                </p>

                {result.kisko_nahi_khana_chahiye && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60">
                    <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block mb-1">
                      Kisko Parhez / Savdhani Bartani Chahiye:
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {result.kisko_nahi_khana_chahiye}
                    </p>
                  </div>
                )}
              </div>

              {/* Card B: Kab aur Kaise Khayein */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-app-border dark:border-slate-700 shadow-soft-sm space-y-2">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-extrabold text-sm sm:text-base">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Kab aur Kaise Khayein? (How & When To Take)</span>
                </div>
                <div className="space-y-2 text-xs sm:text-sm text-navy-900 dark:text-slate-200 font-medium">
                  <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30">
                    <span className="font-bold text-blue-900 dark:text-blue-300 block mb-0.5">
                      🥄 Sevan Vidhi (How):
                    </span>
                    <span>{result.how_to_take}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-navy-900 dark:text-white block mb-0.5">
                      🕒 Shahi Samay (When):
                    </span>
                    <span>{result.when_to_take}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Special Elderly Care Precautions (Crucial highlight for elder safety) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-900/50 shadow-soft-sm space-y-2">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-extrabold text-sm sm:text-base">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Buzurgon Ke Liye Vishesh Savdhani (Elderly Care Precautions)</span>
              </div>
              <p className="text-xs sm:text-sm text-amber-950 dark:text-amber-200 leading-relaxed font-semibold">
                {result.elderly_care_precautions}
              </p>
            </div>

            {/* 4. Side Effects & Severe Warning Signs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Side Effects */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-app-border dark:border-slate-700 shadow-soft-sm space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>Samanya Side Effects (Common Signs):</span>
                </div>
                <ul className="space-y-1.5">
                  {result.common_side_effects?.map((eff, i) => (
                    <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span>{eff}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Severe Warnings */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-app-border dark:border-slate-700 shadow-soft-sm space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Khatre Ke Sanket (When to Call Doctor):</span>
                </div>
                <ul className="space-y-1.5">
                  {result.severe_warning_signs?.map((warn, i) => (
                    <li key={i} className="text-xs text-rose-700 dark:text-rose-300 font-medium flex items-start gap-2">
                      <span className="text-rose-500 mt-0.5">⚠️</span>
                      <span>{warn}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 5. Interactions & Missed Dose Guidance */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-app-border dark:border-slate-700 shadow-soft-sm space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    🚫 Food & Drug Interactions:
                  </span>
                  <ul className="space-y-1">
                    {result.food_and_drug_interactions?.map((inter, i) => (
                      <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                        <span className="text-slate-400">-</span>
                        <span>{inter}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    ⏱️ Dawa Chhoot Jane Par (Missed Dose):
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {result.missed_dose_advice}
                  </p>
                  <div className="text-[11px] text-slate-400 mt-2">
                    📦 <strong>Storage:</strong> {result.storage_guidance}
                  </div>
                </div>
              </div>
            </div>

            {/* Medical Disclaimer Banner */}
            <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 text-center text-[11px] text-slate-400 border border-slate-200 dark:border-slate-700/60">
              {result.disclaimer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
