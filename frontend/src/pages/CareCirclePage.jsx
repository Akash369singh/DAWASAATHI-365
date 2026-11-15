import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Users, UserPlus, Shield, Lock, Eye, Bell, Copy, Check, Trash2, Clock } from "lucide-react"
import { api } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { Button } from "../components/common/Button"
import { Drawer } from "../components/common/Drawer"
import { Skeleton } from "../components/common/Skeleton"
import { EmergencyCardManager } from "../components/emergency/EmergencyCardManager"

export function CareCirclePage() {
  const { user, isElder } = useAuth()
  const [members, setMembers] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "FAMILY",
    passcode: "1234",
  })
  const [createdPasscode, setCreatedPasscode] = useState(null)
  const [copied, setCopied] = useState(false)

  const fetchData = async () => {
    try {
      const [membersData, logsData] = await Promise.all([
        api.listMembers(),
        api.getAuditLog(),
      ])
      setMembers(membersData)
      setAuditLogs(logsData)
    } catch (err) {
      console.error("Failed fetching care circle data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleInviteSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await api.inviteMember(inviteForm)
      setCreatedPasscode(res.member.passcode)
      fetchData()
    } catch (err) {
      alert("Error inviting member: " + err.message)
    }
  }

  const handleTogglePermission = async (memberId, permKey, currentValue) => {
    try {
      await api.updatePermissions(memberId, { [permKey]: !currentValue })
      fetchData()
    } catch (err) {
      alert("Permission update failed: " + err.message)
    }
  }

  const handleRemoveMember = async (memberId, memberName) => {
    if (confirm(`Revoke DawaSaathi 365 access for ${memberName}?`)) {
      await api.removeMember(memberId)
      fetchData()
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-navy-900 dark:text-white tracking-tight">
            Family Care Circle & Privacy
          </h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Manage authorized members, passcodes, and elder-governed privacy controls
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={UserPlus}
          onClick={() => {
            setCreatedPasscode(null)
            setInviteOpen(true)
          }}
        >
          Invite Member
        </Button>
      </div>

      {/* Circle Members Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-navy-900 dark:text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-teal-500" />
          <span>Active Care Circle Members ({members.length})</span>
        </h3>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-56 rounded-3xl" />
            <Skeleton className="h-56 rounded-3xl" />
            <Skeleton className="h-56 rounded-3xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((m) => {
              const perms = m.permissions || {}
              return (
                <div
                  key={m.id}
                  className="bg-white dark:bg-app-dark-surface rounded-3xl border border-app-border dark:border-app-dark-border p-6 shadow-soft-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-extrabold text-lg text-navy-900 dark:text-white leading-tight">
                          {m.name}
                        </h4>
                        <span className="text-xs text-slate-400 font-medium">{m.email}</span>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          m.role === "ELDER"
                            ? "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"
                            : m.role === "CARETAKER"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {m.role}
                      </span>
                    </div>

                    {/* Elder-controlled privacy switches */}
                    <div className="space-y-2.5 pt-3 border-t border-app-border dark:border-app-dark-border text-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Privacy & Permissions
                      </div>

                      {/* Can edit medications */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-300">Edit Medication</span>
                        <button
                          disabled={m.role === "ELDER"}
                          onClick={() =>
                            handleTogglePermission(m.id, "can_edit_meds", perms.can_edit_meds)
                          }
                          className={`w-9 h-5 rounded-full transition-colors relative ${
                            perms.can_edit_meds ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                              perms.can_edit_meds ? "right-1" : "left-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Receive missed dose escalation alerts */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-300">
                          Missed Dose Alerts
                        </span>
                        <button
                          onClick={() =>
                            handleTogglePermission(
                              m.id,
                              "receive_missed_alerts",
                              perms.receive_missed_alerts
                            )
                          }
                          className={`w-9 h-5 rounded-full transition-colors relative ${
                            perms.receive_missed_alerts
                              ? "bg-teal-500"
                              : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                              perms.receive_missed_alerts ? "right-1" : "left-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* View appointments */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-300">View Appointments</span>
                        <button
                          onClick={() =>
                            handleTogglePermission(
                              m.id,
                              "view_appointments",
                              perms.view_appointments
                            )
                          }
                          className={`w-9 h-5 rounded-full transition-colors relative ${
                            perms.view_appointments
                              ? "bg-teal-500"
                              : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                              perms.view_appointments ? "right-1" : "left-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {m.role !== "ELDER" && (
                    <div className="pt-4 mt-4 border-t border-app-border dark:border-app-dark-border flex justify-end">
                      <button
                        onClick={() => handleRemoveMember(m.id, m.name)}
                        className="text-xs text-red-500 hover:underline font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Access
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Feature 2: Emergency QR Card & Wallet Pass */}
      <EmergencyCardManager />

      {/* Transparency Audit Log ("Who viewed/changed what") */}
      <div className="bg-white dark:bg-app-dark-surface rounded-3xl border border-app-border dark:border-app-dark-border p-6 shadow-soft-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-navy-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-500" />
            <span>Transparency Audit Trail</span>
          </h3>
          <span className="text-xs text-slate-400">Live action history</span>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-navy-900/40 border border-app-border dark:border-app-dark-border text-xs flex items-center justify-between gap-3"
            >
              <div>
                <span className="font-extrabold text-navy-900 dark:text-white mr-2">
                  {log.actor_name}
                </span>
                <span className="text-teal-600 dark:text-teal-400 font-bold uppercase mr-2">
                  {log.action}
                </span>
                <span className="text-slate-500">
                  {log.details ? JSON.stringify(log.details) : ""}
                </span>
              </div>
              <span className="text-slate-400 shrink-0 font-medium">
                {log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
              </span>
            </div>
          ))}
          {auditLogs.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs">
              No audit records generated yet.
            </div>
          )}
        </div>
      </div>

      {/* DRAWER: Invite Member Modal */}
      <Drawer
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite Care Circle Member"
        subtitle="Generate a secure passcode for family or caretaker access"
      >
        {!createdPasscode ? (
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                placeholder="e.g. Amit Patel"
                className="w-full px-4 py-3 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Email Address (for notifications)
              </label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="e.g. amit@example.com"
                className="w-full px-4 py-3 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Role
              </label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm font-semibold"
              >
                <option value="FAMILY">Family Member (View adherence, receive alerts)</option>
                <option value="CARETAKER">Caretaker (Manage meds, appointments, alerts)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Assign 4-Digit Passcode
              </label>
              <input
                type="password"
                value={inviteForm.passcode}
                onChange={(e) => setInviteForm({ ...inviteForm, passcode: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-app-border dark:border-app-dark-border bg-slate-50 dark:bg-navy-900 text-sm font-mono tracking-widest"
                required
              />
            </div>

            <Button variant="primary" size="lg" type="submit" className="w-full">
              Generate Invite & Passcode
            </Button>
          </form>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h3 className="text-xl font-bold text-navy-900 dark:text-white">
              Member Invited Successfully!
            </h3>
            <p className="text-xs text-slate-500">
              Share these login credentials with {inviteForm.name}. They will enter the profile code
              and passcode on the DawaSaathi 365 login screen.
            </p>

            <div className="bg-slate-50 dark:bg-navy-900 p-4 rounded-2xl text-left space-y-2 border border-app-border dark:border-app-dark-border">
              <div>
                <span className="text-xs text-slate-400 block">Profile Code:</span>
                <span className="text-base font-mono font-bold text-navy-900 dark:text-white">
                  {user?.profile_code}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Passcode (Shown once):</span>
                <span className="text-xl font-mono font-black text-teal-600 dark:text-teal-400 tracking-widest">
                  {createdPasscode}
                </span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="md"
              icon={Copy}
              className="w-full"
              onClick={() =>
                copyToClipboard(
                  `DawaSaathi 365 Invite:\nProfile Code: ${user?.profile_code}\nPasscode: ${createdPasscode}`
                )
              }
            >
              {copied ? "Copied to Clipboard!" : "Copy Login Credentials"}
            </Button>
          </div>
        )}
      </Drawer>
    </div>
  )
}
