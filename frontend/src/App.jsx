import React from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "./context/AuthContext"
import { AppShell } from "./components/layout/AppShell"
import { LandingPage } from "./pages/LandingPage"
import { HomePage } from "./pages/HomePage"
import { MedicationsPage } from "./pages/MedicationsPage"
import { AppointmentsPage } from "./pages/AppointmentsPage"
import { HealthInsightsPage } from "./pages/HealthInsightsPage"
import { VitalsPage } from "./pages/VitalsPage"
import { CareCirclePage } from "./pages/CareCirclePage"
import { InventoryPage } from "./pages/InventoryPage"
import { NotificationsPage } from "./pages/NotificationsPage"
import { SettingsPage } from "./pages/SettingsPage"
import { ActionLandingPage } from "./pages/ActionLandingPage"
import { EmergencyCardPublicPage } from "./pages/EmergencyCardPublicPage"

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg dark:bg-app-dark-bg">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <AppShell>{children}</AppShell>
}

export function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LandingPage />} />
      <Route path="/action" element={<ActionLandingPage />} />
      <Route path="/e/:token" element={<EmergencyCardPublicPage />} />

      {/* Protected Healthcare Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/medications"
        element={
          <ProtectedRoute>
            <MedicationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <AppointmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/insights"
        element={
          <ProtectedRoute>
            <HealthInsightsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vitals"
        element={
          <ProtectedRoute>
            <VitalsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/care-circle"
        element={
          <ProtectedRoute>
            <CareCirclePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <InventoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
export default App
