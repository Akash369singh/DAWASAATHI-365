import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Package, RotateCcw, AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { api } from "../lib/api"
import { Button } from "../components/common/Button"
import { Skeleton } from "../components/common/Skeleton"

export function InventoryPage() {
  const [meds, setMeds] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMeds = async () => {
    try {
      const data = await api.listMedications(true)
      setMeds(data)
    } catch (err) {
      console.error("Failed fetching inventory:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMeds()
  }, [])

  const handleRefill = async (id, name) => {
    await api.refillStock(id, 30)
    alert(`Refilled 30 pills for ${name}!`)
    fetchMeds()
  }

  const lowStockCount = meds.filter((m) => m.stock_count <= m.refill_alert_threshold).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-navy-900 dark:text-white tracking-tight">
          Medicine Stock & Inventory
        </h1>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
          Automatic pill countdowns and refill request tracking
        </p>
      </div>

      {lowStockCount > 0 && (
        <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-amber-900 dark:text-amber-300">
                {lowStockCount} Medication(s) Running Low
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Consider reordering soon so daily routines are never interrupted.
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meds.map((med) => {
            const isLow = med.stock_count <= med.refill_alert_threshold
            const dosesPerDay = med.times_per_day || 1
            const daysRemaining = Math.floor(med.stock_count / dosesPerDay)

            return (
              <motion.div
                key={med.id}
                layout
                className={`bg-white dark:bg-app-dark-surface rounded-3xl border p-6 shadow-soft-sm flex flex-col justify-between ${
                  isLow
                    ? "border-amber-300 dark:border-amber-800/60"
                    : "border-app-border dark:border-app-dark-border"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-navy-900 dark:text-white leading-tight">
                          {med.name}
                        </h3>
                        <span className="text-xs font-semibold text-slate-400">
                          {med.dosage} • {med.times_per_day} dose(s)/day
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                        isLow
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                          : "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"
                      }`}
                    >
                      {daysRemaining} Days Left
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">Pills Remaining:</span>
                      <span className={isLow ? "text-amber-600 font-black text-sm" : "text-navy-900 dark:text-white text-sm"}>
                        {med.stock_count} units
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isLow ? "bg-amber-500" : "bg-teal-500"
                        }`}
                        style={{ width: `${Math.min(100, (med.stock_count / 60) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-app-border dark:border-app-dark-border flex items-center justify-between">
                  <span className="text-xs text-slate-400">Auto-decrements on dose taken</span>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={RotateCcw}
                    onClick={() => handleRefill(med.id, med.name)}
                  >
                    Add 30 Pills
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
