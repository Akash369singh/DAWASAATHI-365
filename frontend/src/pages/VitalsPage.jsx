import React, { useState, useEffect } from "react"
import {
  Heart,
  Plus,
  Activity,
  Droplet,
  Wind,
  Scale,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts"
import { api } from "../lib/api"
import { Button } from "../components/common/Button"
import { Drawer } from "../components/common/Drawer"
import { Skeleton } from "../components/common/Skeleton"

export function VitalsPage() {
  const [vitals, setVitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState("BLOOD_PRESSURE")
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [formData, setFormData] = useState({
    vital_type: "BLOOD_PRESSURE",
    value_numeric: 120,
    value_secondary: 80,
    unit: "mmHg",
    context: "Resting morning",
    notes: "",
  })

  const fetchVitals = async () => {
    try {
      const data = await api.listVitals("", 60)
      setVitals(data)
    } catch (err) {
      console.error("Failed fetching vitals:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVitals()
  }, [])

  const handleOpenAdd = (type) => {
    let unit = "mmHg"
    let val = 120
    let sec = 80
    if (type === "BLOOD_GLUCOSE") {
      unit = "mg/dL"
      val = 110
      sec = null
    } else if (type === "OXYGEN_SPO2") {
      unit = "%"
      val = 98
      sec = null
    } else if (type === "HEART_RATE") {
      unit = "bpm"
      val = 72
      sec = null
    } else if (type === "WEIGHT") {
      unit = "kg"
      val = 68.5
      sec = null
    }

    setFormData({
      vital_type: type,
      value_numeric: val,
      value_secondary: sec,
      unit,
      context: "Regular check",
      notes: "",
    })
    setDrawerOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      await api.recordVital(formData)
      setDrawerOpen(false)
      fetchVitals()
    } catch (err) {
      alert("Error logging vital: " + err.message)
    }
  }

  // Filter vitals for current chart view
  const currentVitals = vitals
    .filter((v) => v.vital_type === selectedType)
    .slice()
    .reverse()

  const chartData = currentVitals.map((v) => ({
    time: v.recorded_at_local.split(",")[0],
    value: v.value_numeric,
    secondary: v.value_secondary,
  }))

  const latest = currentVitals[currentVitals.length - 1]

  const vitalTypes = [
    { type: "BLOOD_PRESSURE", label: "Blood Pressure", unit: "mmHg", icon: Activity },
    { type: "BLOOD_GLUCOSE", label: "Blood Glucose", unit: "mg/dL", icon: Droplet },
    { type: "OXYGEN_SPO2", label: "Oxygen (SpO2)", unit: "%", icon: Wind },
    { type: "HEART_RATE", label: "Heart Rate", unit: "bpm", icon: Heart },
    { type: "WEIGHT", label: "Weight", unit: "kg", icon: Scale },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-navy-900 dark:text-white tracking-tight">
            Health Vitals
          </h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Track and visualize blood pressure, sugar, oxygen, and heart metrics
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={Plus}
          onClick={() => handleOpenAdd(selectedType)}
        >
          Log Reading
        </Button>
      </div>

      {/* Vital Metric Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {vitalTypes.map((item) => {
          const Icon = item.icon
          const active = selectedType === item.type
          return (
            <button
              key={item.type}
              onClick={() => setSelectedType(item.type)}
              className={`p-4 rounded-3xl border text-left transition-all ${
                active
                  ? "bg-teal-500 text-white border-teal-500 shadow-soft-md shadow-teal-500/25"
                  : "bg-white dark:bg-app-dark-surface border-app-border dark:border-app-dark-border hover:border-teal-500/40 text-navy-900 dark:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 mb-2 ${active ? "text-white" : "text-teal-500"}`} />
              <div className="text-xs font-semibold opacity-80">{item.label}</div>
              <div className="text-lg font-black mt-1">
                {vitals.find((v) => v.vital_type === item.type)?.value_numeric || "--"}{" "}
                <span className="text-xs font-normal opacity-70">{item.unit}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Historical Trend Chart */}
      <div className="bg-white dark:bg-app-dark-surface rounded-3xl border border-app-border dark:border-app-dark-border p-6 shadow-soft-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-navy-900 dark:text-white">
              {vitalTypes.find((v) => v.vital_type === selectedType)?.label} Trend
            </h3>
            <p className="text-xs text-slate-400">Past readings chronologically</p>
          </div>
          {latest && (
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400 block uppercase">
                Latest Reading
              </span>
              <span className="text-xl font-black text-teal-600 dark:text-teal-400">
                {latest.value_numeric}
                {latest.value_secondary ? `/${latest.value_secondary}` : ""} {latest.unit}
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : chartData.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            No readings recorded for this metric yet. Click "Log Reading" above to record one.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0B1F3A",
                    borderRadius: "16px",
                    color: "#fff",
                    border: "none",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#14B8A6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#14B8A6" }}
                  name={selectedType === "BLOOD_PRESSURE" ? "Systolic" : "Reading"}
                />
                {selectedType === "BLOOD_PRESSURE" && (
                  <Line
                    type="monotone"
                    dataKey="secondary"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#3B82F6" }}
                    name="Diastolic"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* DRAWER: Log Measurement Form */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Log Health Vital Measurement"
        subtitle="Keep your records consistent for doctor reviews"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Vital Type
            </label>
            <select
              value={formData.vital_type}
              onChange={(e) => handleOpenAdd(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm font-semibold"
            >
              {vitalTypes.map((vt) => (
                <option key={vt.type} value={vt.type}>
                  {vt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {formData.vital_type === "BLOOD_PRESSURE" ? "Systolic Value" : "Value"}
              </label>
              <input
                type="number"
                step="any"
                value={formData.value_numeric}
                onChange={(e) =>
                  setFormData({ ...formData, value_numeric: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-4 py-3 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm font-bold"
                required
              />
            </div>

            {formData.vital_type === "BLOOD_PRESSURE" ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Diastolic Value
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.value_secondary || 80}
                  onChange={(e) =>
                    setFormData({ ...formData, value_secondary: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-3 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm font-bold"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  readOnly
                  className="w-full px-4 py-3 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-500"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Context / Notes
            </label>
            <input
              type="text"
              value={formData.context}
              onChange={(e) => setFormData({ ...formData, context: e.target.value })}
              placeholder="e.g. Fasting, Post-lunch, Resting"
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
              Save Measurement
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}
