import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { SosActiveBanner } from "../components/emergency/SosActiveBanner"
import * as apiModule from "../lib/api"
import * as authModule from "../context/AuthContext"

vi.mock("../lib/api", () => ({
  api: {
    getActiveSos: vi.fn(),
    ackSos: vi.fn(),
    resolveSos: vi.fn(),
  },
}))

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}))

describe("SosActiveBanner Component (Feature 3)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authModule.useAuth.mockReturnValue({
      user: { id: 2, name: "Priya Patel", role: "CARETAKER" },
    })
  })

  it("renders nothing when no active SOS is pending", async () => {
    apiModule.api.getActiveSos.mockResolvedValue(null)
    const { container } = render(<SosActiveBanner />)

    await waitFor(() => {
      expect(apiModule.api.getActiveSos).toHaveBeenCalled()
    })

    expect(container.firstChild).toBeNull()
  })

  it("renders high-priority alert banner with accessible ARIA live role when SOS is active", async () => {
    const mockSos = {
      id: 55,
      incident_type: "GENERAL_SOS",
      triggered_by: "Ramesh Patel",
      created_at_local: "10:15 AM",
      status: "TRIGGERED",
      responders_notified: ["Priya Patel (Daughter)", "Dr. Mehta (Cardiologist)"],
      acknowledged_by_names: [],
    }
    apiModule.api.getActiveSos.mockResolvedValue(mockSos)

    render(<SosActiveBanner />)

    await waitFor(() => {
      const banner = screen.getByRole("alert")
      expect(banner).toBeInTheDocument()
      expect(banner).toHaveAttribute("aria-live", "assertive")
      expect(screen.getByText(/Emergency SOS Active/i)).toBeInTheDocument()
      expect(screen.getByText(/Triggered by Ramesh Patel/i)).toBeInTheDocument()
    })
  })
})
