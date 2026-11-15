import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Pill,
  Plus,
  Camera,
  Mic,
  Clock,
  Check,
  Edit2,
  Trash2,
  Sparkles,
  AlertTriangle,
  RotateCcw,
} from "lucide-react"
import { api } from "../lib/api"
import { Button } from "../components/common/Button"
import { Drawer } from "../components/common/Drawer"
import { Skeleton } from "../components/common/Skeleton"
import { EmptyState } from "../components/common/EmptyState"

export function MedicationsPage() {
  const [medications, setMedications] = useState([])
  const [loading, setLoading] = useState(true)

  // Drawer state for manual Add/Edit
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingMed, setEditingMed] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    form: "Tablet",
    instructions: "After food",
    times_per_day: 1,
    schedule_times: ["08:30"],
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    stock_count: 30,
    notes: "",
  })

  // Prescription OCR Modal state
  const [ocrModalOpen, setOcrModalOpen] = useState(false)
  const [ocrFile, setOcrFile] = useState(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrResult, setOcrResult] = useState(null)

  // Natural Language Voice Modal state
  const [nlModalOpen, setNlModalOpen] = useState(false)
  const [nlText, setNlText] = useState("")
  const [nlLoading, setNlLoading] = useState(false)
  const [nlResult, setNlResult] = useState(null)

  const fetchMeds = async () => {
    try {
      const data = await api.listMedications(false)
      setMedications(data)
    } catch (err) {
      console.error("Failed fetching medications:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMeds()
  }, [])

  const handleOpenAdd = () => {
    setEditingMed(null)
    setFormData({
      name: "",
      dosage: "",
      form: "Tablet",
      instructions: "After food",
      times_per_day: 1,
      schedule_times: ["08:30"],
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      stock_count: 30,
      notes: "",
    })
    setDrawerOpen(true)
  }

  const handleOpenEdit = (med) => {
    setEditingMed(med)
    setFormData({
      name: med.name,
      dosage: med.dosage,
      form: med.form,
      instructions: med.instructions || "",
      times_per_day: med.times_per_day,
      schedule_times: med.schedule_times || ["08:30"],
      days_of_week: med.days_of_week || [0, 1, 2, 3, 4, 5, 6],
      stock_count: med.stock_count,
      notes: med.notes || "",
    })
    setDrawerOpen(true)
  }

  const handleSaveMed = async (e) => {
    e.preventDefault()
    try {
      if (editingMed) {
        await api.updateMedication(editingMed.id, formData)
      } else {
        await api.createMedication(formData)
      }
      setDrawerOpen(false)
      fetchMeds()
    } catch (err) {
      alert("Error saving medication: " + err.message)
    }
  }

  const handleDeleteMed = async (id) => {
    if (confirm("Are you sure you want to deactivate this medication?")) {
      await api.deleteMedication(id)
      fetchMeds()
    }
  }

  const handleRefillPills = async (id) => {
    await api.refillStock(id, 30)
    fetchMeds()
  }

  // Prescription OCR Scanner
  const handleOcrSubmit = async () => {
    setOcrLoading(true)
    try {
      const res = await api.scanPrescription(ocrFile)
      setOcrResult(res)
    } catch (err) {
      alert("OCR scanning failed: " + err.message)
    } finally {
      setOcrLoading(false)
    }
  }

  const handleConfirmOcrMed = async (item) => {
    try {
      await api.createMedication({
        name: item.name,
        dosage: item.dosage,
        form: item.form || "Tablet",
        instructions: item.instructions || "After food",
        times_per_day: item.times_per_day || 1,
        schedule_times: item.schedule_times || ["08:30"],
        days_of_week: item.days_of_week || [0, 1, 2, 3, 4, 5, 6],
        stock_count: item.stock_count || 30,
        notes: item.notes || "Extracted from prescription image",
      })
      alert(`Added ${item.name} to active schedule!`)
      fetchMeds()
    } catch (err) {
      alert("Error adding medication: " + err.message)
    }
  }

  // Natural Language Voice Parser
  const handleNlParse = async () => {
    if (!nlText.trim()) return
    setNlLoading(true)
    try {
      const res = await api.parseNaturalLanguage(nlText, "MEDICATION")
      setNlResult(res)
    } catch (err) {
      alert("Natural language parse failed: " + err.message)
    } finally {
      setNlLoading(false)
    }
  }

  const handleConfirmNlMed = async () => {
    if (!nlResult?.parsed_data) return
    const p = nlResult.parsed_data
    try {
      await api.createMedication({
        name: p.name,
        dosage: p.dosage,
        form: p.form || "Tablet",
        instructions: p.instructions || "After food",
        times_per_day: p.times_per_day || 1,
        schedule_times: p.schedule_times || ["08:30"],
        days_of_week: p.days_of_week || [0, 1, 2, 3, 4, 5, 6],
        stock_count: p.stock_count || 30,
        notes: p.notes || "Added via voice input",
      })
      setNlModalOpen(false)
      setNlText("")
      setNlResult(null)
      fetchMeds()
    } catch (err) {
      alert("Error saving medication: " + err.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-navy-900 dark:text-white tracking-tight">
            My Medications
          </h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Active daily schedule and stock inventory
          </p>
        </div>

        {/* 3 Action Buttons: Add Manually, AI Prescription Scan, Voice Add */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            icon={Camera}
            onClick={() => {
              setOcrResult(null)
              setOcrFile(null)
              setOcrModalOpen(true)
            }}
          >
            Scan Prescription (AI)
          </Button>

          <Button
            variant="secondary"
            size="md"
            icon={Mic}
            onClick={() => {
              setNlResult(null)
              setNlText("")
              setNlModalOpen(true)
            }}
          >
            Add by Speaking
          </Button>

          <Button variant="primary" size="md" icon={Plus} onClick={handleOpenAdd}>
            Add Medicine
          </Button>
        </div>
      </div>

      {/* Medication Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
        </div>
      ) : medications.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No Medications Scheduled Yet"
          description="Add your first medicine manually, take a photo of a prescription, or simply say it aloud."
          actionLabel="Add Medicine"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {medications.map((med) => {
            const isLowStock = med.stock_count <= med.refill_alert_threshold
            return (
              <motion.div
                key={med.id}
                layout
                className={`bg-white dark:bg-app-dark-surface rounded-3xl border p-6 shadow-soft-sm transition-all ${
                  med.is_active
                    ? "border-app-border dark:border-app-dark-border"
                    : "opacity-60 border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <Pill className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-navy-900 dark:text-white leading-tight">
                        {med.name}
                      </h3>
                      <div className="text-sm font-bold text-teal-600 dark:text-teal-400 mt-0.5">
                        {med.dosage} • <span className="font-medium text-slate-500">{med.form}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(med)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-navy-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMed(med.id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-sm text-slate-600 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-navy-900/50 p-3 rounded-2xl">
                  {med.instructions || "Take as prescribed"}
                </div>

                {/* Schedule times pills */}
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  {med.schedule_times?.map((t, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 text-xs font-bold"
                    >
                      <Clock className="w-3 h-3" />
                      {t}
                    </span>
                  ))}
                </div>

                {/* Stock info and refill trigger */}
                <div className="flex items-center justify-between pt-3 border-t border-app-border dark:border-app-dark-border text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-500">Stock:</span>
                    <span
                      className={`font-bold ${
                        isLowStock ? "text-red-500 flex items-center gap-1" : "text-navy-900 dark:text-white"
                      }`}
                    >
                      {isLowStock && <AlertTriangle className="w-3.5 h-3.5" />}
                      {med.stock_count} pills left
                    </span>
                  </div>

                  <button
                    onClick={() => handleRefillPills(med.id)}
                    className="text-teal-600 dark:text-teal-400 hover:underline font-bold flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Refill (+30)
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* DRAWER: Add / Edit Medication */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingMed ? "Edit Medication" : "Add Medication"}
        subtitle="Manage dosage, frequency, and daily scheduled timings"
      >
        <form onSubmit={handleSaveMed} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Medicine Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Metformin Extended Release"
              className="w-full px-4 py-3 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Dosage
              </label>
              <input
                type="text"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                placeholder="e.g. 500 mg"
                className="w-full px-4 py-3 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Form
              </label>
              <select
                value={formData.form}
                onChange={(e) => setFormData({ ...formData, form: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm font-semibold"
              >
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Drops">Drops</option>
                <option value="Injection">Injection</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Instructions
            </label>
            <input
              type="text"
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="e.g. After food with warm water"
              className="w-full px-4 py-3 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Scheduled Times (HH:MM, comma-separated)
            </label>
            <input
              type="text"
              value={formData.schedule_times.join(", ")}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  schedule_times: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              placeholder="08:30, 20:30"
              className="w-full px-4 py-3 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Pills Stock Count
              </label>
              <input
                type="number"
                value={formData.stock_count}
                onChange={(e) =>
                  setFormData({ ...formData, stock_count: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-3 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Refill Alert When Below
              </label>
              <input
                type="number"
                value={formData.refill_alert_threshold || 7}
                onChange={(e) =>
                  setFormData({ ...formData, refill_alert_threshold: parseInt(e.target.value) || 7 })
                }
                className="w-full px-4 py-3 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm"
              />
            </div>
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
              {editingMed ? "Save Changes" : "Save Medication"}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* MODAL: AI Prescription OCR Scanner */}
      <Drawer
        isOpen={ocrModalOpen}
        onClose={() => setOcrModalOpen(false)}
        title="AI Prescription Scanner"
        subtitle="Upload a prescription image to automatically extract medication schedules"
      >
        <div className="space-y-5">
          <div className="border-2 border-dashed border-app-border dark:border-app-dark-border rounded-3xl p-6 text-center bg-slate-50/50 dark:bg-navy-900/30">
            <Camera className="w-10 h-10 text-teal-500 mx-auto mb-3" />
            <h4 className="font-bold text-sm text-navy-900 dark:text-white mb-1">
              Choose or snap a prescription photo
            </h4>
            <p className="text-xs text-slate-400 mb-4">PNG, JPG, or PDF supported</p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setOcrFile(e.target.files[0])}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-500 file:text-white hover:file:bg-teal-600"
            />
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            loading={ocrLoading}
            onClick={handleOcrSubmit}
          >
            Extract Medications with Gemini Vision
          </Button>

          {/* OCR Result Table (Never auto-saves; user verifies first) */}
          {ocrResult && (
            <div className="space-y-4 pt-4 border-t border-app-border dark:border-app-dark-border">
              <div className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 px-3 py-1 rounded-full text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI-Assisted Extraction • Please Review Before Adding</span>
              </div>

              {ocrResult.doctor_name && (
                <div className="text-xs text-slate-500">
                  Doctor: <strong>{ocrResult.doctor_name}</strong> •{" "}
                  {ocrResult.clinic_or_hospital}
                </div>
              )}

              <div className="space-y-3">
                {ocrResult.extracted_medications?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/50 border border-app-border dark:border-app-dark-border flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-base text-navy-900 dark:text-white">
                        {item.name} ({item.dosage})
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {item.instructions} • {item.schedule_times?.join(", ")}
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleConfirmOcrMed(item)}
                    >
                      Add ✓
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Drawer>

      {/* MODAL: Natural Language Input (Hinglish/Hindi/English) */}
      <Drawer
        isOpen={nlModalOpen}
        onClose={() => setNlModalOpen(false)}
        title="Add by Speaking or Typing"
        subtitle="Speak in natural Hinglish or Hindi, e.g. 'Metformin 500 subah shaam khana khane ke baad'"
      >
        <div className="space-y-5">
          <div>
            <textarea
              rows={4}
              value={nlText}
              onChange={(e) => setNlText(e.target.value)}
              placeholder="e.g. Metformin 500 subah shaam khane ke baad"
              className="w-full p-4 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm font-medium focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="md"
              icon={Mic}
              onClick={() => {
                setNlText("Metformin 500 subah shaam khane ke baad")
              }}
            >
              Demo Phrase
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              loading={nlLoading}
              onClick={handleNlParse}
            >
              Parse with Gemini
            </Button>
          </div>

          {nlResult && (
            <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/40 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                Understood Entry:
              </div>
              <p className="text-sm font-semibold text-navy-900 dark:text-white">
                {nlResult.explanation}
              </p>

              <div className="bg-white dark:bg-app-dark-surface p-3 rounded-xl text-xs space-y-1">
                <div>
                  <strong>Medicine:</strong> {nlResult.parsed_data?.name}
                </div>
                <div>
                  <strong>Dosage:</strong> {nlResult.parsed_data?.dosage}
                </div>
                <div>
                  <strong>Instructions:</strong> {nlResult.parsed_data?.instructions}
                </div>
                <div>
                  <strong>Times:</strong> {nlResult.parsed_data?.schedule_times?.join(", ")}
                </div>
              </div>

              <Button variant="primary" size="md" className="w-full" onClick={handleConfirmNlMed}>
                Confirm & Save Medication ✓
              </Button>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  )
}
