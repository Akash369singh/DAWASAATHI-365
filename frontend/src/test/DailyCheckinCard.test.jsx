import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { DailyCheckinCard } from "../components/home/DailyCheckinCard"
import * as apiModule from "../lib/api"
import * as authModule from "../context/AuthContext"

vi.mock("../lib/api", () => ({
  api: {
    getTodayCheckin: vi.fn(),
    submitCheckin: vi.fn(),
  },
}))

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}))

describe("DailyCheckinCard Component (Feature 4)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authModule.useAuth.mockReturnValue({
      user: { name: "Ramesh Patel", role: "ELDER", elder_name: "Ramesh ji" },
      isElder: true,
    })
  })

  it("renders 3 wellbeing mood buttons with accessible labels when no check-in exists yet", async () => {
    apiModule.api.getTodayCheckin.mockResolvedValue(null)

    render(<DailyCheckinCard />)

    await waitFor(() => {
      expect(screen.getByText(/How are you feeling today/i)).toBeInTheDocument()
    })

    expect(screen.getByRole("button", { name: /feeling good/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /feeling okay/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /not feeling well/i })).toBeInTheDocument()
  })

  it("allows selecting a mood and automatically records check-in with 1 tap for elderly users", async () => {
    apiModule.api.getTodayCheckin.mockResolvedValue(null)
    apiModule.api.submitCheckin.mockResolvedValue({
      id: 1,
      mood: "GOOD",
      note: null,
    })

    render(<DailyCheckinCard />)

    await waitFor(() => {
      expect(screen.getByText(/How are you feeling today/i)).toBeInTheDocument()
    })

    const goodBtn = screen.getByRole("button", { name: /feeling good/i })
    fireEvent.click(goodBtn)

    await waitFor(() => {
      expect(apiModule.api.submitCheckin).toHaveBeenCalledWith({
        mood: "GOOD",
        note: null,
      })
    })
  })

  it("shows quiet confirmation badge when today's checkin is already recorded", async () => {
    apiModule.api.getTodayCheckin.mockResolvedValue({
      id: 1,
      mood: "GOOD",
      note: "Feeling energetic",
    })

    render(<DailyCheckinCard />)

    await waitFor(() => {
      expect(screen.getByText(/Today's Wellbeing Check-in/i)).toBeInTheDocument()
      expect(screen.getByText(/Feeling Good/i)).toBeInTheDocument()
    })
  })
})
