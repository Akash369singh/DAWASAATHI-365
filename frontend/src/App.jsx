import React, { Suspense, lazy } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "./context/AuthContext"
import { AppShell } from "./components/layout/AppShell"
import { LandingPage } from "./pages/LandingPage"
import { HomePage } from "./pages/HomePage"

// Route-level code splitting for optimized bundle efficiency and sub-second load times
const MedicationsPage = lazy(() => import("./pages/MedicationsPage").then((m) => ({ default: m.MedicationsPage })))
const AppointmentsPage = lazy(() => import("./pages/AppointmentsPage").then((m) => ({ default: m.AppointmentsPage })))
const HealthInsightsPage = lazy(() => import("./pages/HealthInsightsPage").then((m) => ({ default: m.HealthInsightsPage })))
const VitalsPage = lazy(() => import("./pages/VitalsPage").then((m) => ({ default: m.VitalsPage })))
const CareCirclePage = lazy(() => import("./pages/CareCirclePage").then((m) => ({ default: m.CareCirclePage })))
const InventoryPage = lazy(() => import("./pages/InventoryPage").then((m) => ({ default: m.InventoryPage })))
const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then((m) => ({ default: m.NotificationsPage })))
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })))
const ActionLandingPage = lazy(() => import("./pages/ActionLandingPage").then((m) => ({ default: m.ActionLandingPage })))
const EmergencyCardPublicPage = lazy(() => import("./pages/EmergencyCardPublicPage").then((m) => ({ default: m.EmergencyCardPublicPage })))

const PageLoader = () => (
  <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-pulse" role="status" aria-label="Loading page content">
    <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
    <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
  </div>
)

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg dark:bg-app-dark-bg" role="status" aria-label="Checking authentication session">
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
    <Suspense fallback={<PageLoader />}>
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
    </Suspense>
  )
}

export default App
