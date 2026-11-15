// Production / Development API URL configuration
const rawApiUrl = import.meta.env.VITE_API_URL || ""
export const API_BASE = rawApiUrl
  ? (rawApiUrl.replace(/\/+$/, "").endsWith("/api")
      ? rawApiUrl.replace(/\/+$/, "")
      : `${rawApiUrl.replace(/\/+$/, "")}/api`)
  : "/api"

function getAuthHeaders() {
  const token = localStorage.getItem("carecircle_token")
  const headers = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  const headers = options.isFormData
    ? { Authorization: `Bearer ${localStorage.getItem("carecircle_token") || ""}` }
    : { ...getAuthHeaders(), ...options.headers }

  const config = {
    ...options,
    headers,
  }

  const response = await fetch(url, config)
  if (response.status === 401) {
    // If token invalid, clear and redirect to login if not already on public routes
    if (
      !window.location.pathname.startsWith("/login") &&
      !window.location.pathname.startsWith("/action") &&
      !window.location.pathname.startsWith("/e/")
    ) {
      localStorage.removeItem("carecircle_token")
      localStorage.removeItem("carecircle_user")
      window.location.href = "/login"
    }
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const errorMsg = data.detail || response.statusText || "Something went wrong"
    throw new Error(errorMsg)
  }
  return data
}

export const api = {
  // Auth
  login: (profile_code, passcode) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ profile_code, passcode }),
    }),

  createProfile: (payload) =>
    request("/auth/create-profile", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  demoLogin: (role = "ELDER") =>
    request(`/auth/demo-login?role=${encodeURIComponent(role)}`, {
      method: "POST",
    }),

  getMe: () => request("/auth/me"),

  updateProfile: (payload) =>
    request("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  // Medications
  listMedications: (activeOnly = true) =>
    request(`/medications?active_only=${activeOnly}`),

  createMedication: (payload) =>
    request("/medications", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateMedication: (id, payload) =>
    request(`/medications/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteMedication: (id) =>
    request(`/medications/${id}`, {
      method: "DELETE",
    }),

  refillStock: (id, addCount = 30) =>
    request(`/medications/${id}/refill?add_count=${addCount}`, {
      method: "PATCH",
    }),

  // Doses & Adherence
  getTodaySchedule: () => request("/doses/today"),

  markDoseTaken: (id, notes = "") =>
    request(`/doses/${id}/take`, {
      method: "POST",
      body: JSON.stringify({ action: "TAKEN", notes }),
    }),

  markDoseSkipped: (id, notes = "") =>
    request(`/doses/${id}/skip`, {
      method: "POST",
      body: JSON.stringify({ action: "SKIPPED", notes }),
    }),

  snoozeDose: (id, minutes = 30) =>
    request(`/doses/${id}/snooze`, {
      method: "POST",
      body: JSON.stringify({ minutes }),
    }),

  getAdherenceStats: () => request("/doses/stats"),

  // Appointments
  listAppointments: (upcomingOnly = false) =>
    request(`/appointments?upcoming_only=${upcomingOnly}`),

  createAppointment: (payload) =>
    request("/appointments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateAppointment: (id, payload) =>
    request(`/appointments/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteAppointment: (id) =>
    request(`/appointments/${id}`, {
      method: "DELETE",
    }),

  // Vitals
  listVitals: (vitalType = "", limit = 50) =>
    request(`/vitals?vital_type=${encodeURIComponent(vitalType)}&limit=${limit}`),

  recordVital: (payload) =>
    request("/vitals", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Family Care Circle & Privacy
  listMembers: () => request("/care-circle/members"),

  inviteMember: (payload) =>
    request("/care-circle/invite", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updatePermissions: (memberId, payload) =>
    request(`/care-circle/members/${memberId}/permissions`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  getAuditLog: () => request("/care-circle/audit-log"),

  removeMember: (memberId) =>
    request(`/care-circle/members/${memberId}`, {
      method: "DELETE",
    }),

  // Emergency SOS (Feature 1)
  triggerSos: (payload = {}) =>
    request("/sos", {
      method: "POST",
      body: JSON.stringify(typeof payload === "string" ? { notes: payload } : payload),
    }),

  triggerMedicationIncident: (payload) =>
    request("/emergency/medication-incident", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getActiveSos: () => request("/sos/active"),

  ackSos: (sosId) =>
    request(`/sos/${sosId}/ack`, {
      method: "POST",
    }),

  resolveSos: (sosId) =>
    request(`/sos/${sosId}/resolve`, {
      method: "POST",
    }),

  triggerDemoSos: () => request("/demo/trigger-sos", { method: "POST" }),

  // AI Services (Gemini)
  scanPrescription: async (file) => {
    const formData = new FormData()
    if (file) {
      formData.append("file", file)
    }
    return request("/ai/scan-prescription", {
      method: "POST",
      body: formData,
      isFormData: true,
    })
  },

  parseNaturalLanguage: (text, targetType = "AUTO") =>
    request("/ai/parse-nl", {
      method: "POST",
      body: JSON.stringify({ text, target_type: targetType }),
    }),

  getAiInsights: () => request("/ai/insights"),

  companionChat: (message, history = []) =>
    request("/ai/companion-chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    }),

  // Demo & Testing triggers
  reseedDemo: () => request("/demo/seed", { method: "POST" }),

  triggerTestReminder: () => request("/demo/trigger-reminder", { method: "POST" }),

  // Family Community & Live Watch
  getElderLiveStatus: () => request("/community/elder-live-status"),

  getFamilyMessages: () => request("/community/messages"),

  postFamilyMessage: (payload) =>
    request("/community/messages", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  reactToFamilyMessage: (msgId, reaction = "❤️") =>
    request(`/community/messages/${msgId}/react?reaction=${encodeURIComponent(reaction)}`, {
      method: "POST",
    }),

  sendQuickNudge: (payload) =>
    request("/community/quick-nudge", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Daily Care Tasks & 1-Month Planner
  getTodayCareTasks: () => request("/tasks/today"),

  createCareTask: (payload) =>
    request("/tasks", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  completeCareTask: (logId, notes = "") =>
    request(`/tasks/${logId}/complete${notes ? `?notes=${encodeURIComponent(notes)}` : ""}`, {
      method: "POST",
    }),

  nudgeCareTask: (logId) =>
    request(`/tasks/${logId}/nudge`, {
      method: "POST",
    }),

  deleteCareTask: (taskId) =>
    request(`/tasks/${taskId}`, {
      method: "DELETE",
    }),

  // Feature 2: Emergency QR Card
  getEmergencyCardSettings: () => request("/emergency-card/settings"),

  updateEmergencyCardSettings: (payload) =>
    request("/emergency-card/settings", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  regenerateEmergencyCardToken: () =>
    request("/emergency-card/regenerate-token", {
      method: "POST",
    }),

  getPublicEmergencyCard: (token) =>
    request(`/emergency-card/public/${token}`),

  // Omni-Medicine Encyclopedia & AI Pill Identifier
  getMedicineInfo: (query) =>
    request("/ai/medicine-info", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  identifyMedicinePhoto: (file) => {
    const formData = new FormData()
    formData.append("file", file)
    return request("/ai/identify-medicine-photo", {
      method: "POST",
      body: formData,
      isFormData: true,
    })
  },

  // Feature 4: Daily Check-in
  submitCheckin: (payload) =>
    request("/checkins", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getTodayCheckin: () => request("/checkins/today"),

  getCheckinHistory: (days = 14) =>
    request(`/checkins/history?days=${days}`),

  sendCheckinPrompt: () =>
    request("/checkins/send-prompt", {
      method: "POST",
    }),

  // Feature 6: Weekly Digest
  triggerWeeklyDigest: () =>
    request("/demo/trigger-weekly-digest", {
      method: "POST",
    }),

  // Magic Link Action Token Execution
  executeActionToken: (token) =>
    fetch(`${API_BASE}/actions/execute/${encodeURIComponent(token)}`),
}
