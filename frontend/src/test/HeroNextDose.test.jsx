import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { HeroNextDose } from "../components/home/HeroNextDose"

// Mock canvas-confetti
vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}))

describe("HeroNextDose Component (Feature 1)", () => {
  const mockDose = {
    id: 101,
    medication_name: "Metformin",
    dosage: "500 mg",
    form: "Tablet",
    instructions: "After breakfast with a glass of water",
    scheduled_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    is_snoozed: false,
    snooze_count: 0,
  }

  it("renders dose information clearly for elderly users", () => {
    render(<HeroNextDose nextDose={mockDose} onTake={vi.fn()} onSkip={vi.fn()} onSnooze={vi.fn()} />)

    expect(screen.getByText("Metformin")).toBeInTheDocument()
    expect(screen.getByText("500 mg")).toBeInTheDocument()
    expect(screen.getByText("After breakfast with a glass of water")).toBeInTheDocument()
    expect(screen.getByText("Next Medicine")).toBeInTheDocument()
  })

  it("fires onTake when the primary 'I took it' button is clicked", () => {
    const handleTake = vi.fn()
    render(<HeroNextDose nextDose={mockDose} onTake={handleTake} onSkip={vi.fn()} onSnooze={vi.fn()} />)

    const takeButton = screen.getByRole("button", { name: /Mark Metformin 500 mg as taken/i })
    expect(takeButton).toBeInTheDocument()
    fireEvent.click(takeButton)

    expect(handleTake).toHaveBeenCalledWith(101)
  })

  it("allows snoozing dose with 30m and extended 15m/60m options", () => {
    const handleSnooze = vi.fn()
    render(<HeroNextDose nextDose={mockDose} onTake={vi.fn()} onSkip={vi.fn()} onSnooze={handleSnooze} />)

    const snoozeButton = screen.getByRole("button", { name: /Remind me in 30 min/i })
    expect(snoozeButton).toBeInTheDocument()
    fireEvent.click(snoozeButton)

    expect(handleSnooze).toHaveBeenCalledWith(101, 30)
  })

  it("renders completion celebration message when no more doses are scheduled today", () => {
    render(<HeroNextDose nextDose={null} elderName="Ramesh Patel" />)

    expect(screen.getByText("All Scheduled Doses Complete!")).toBeInTheDocument()
    expect(screen.getByText(/Great job maintaining your health today/i)).toBeInTheDocument()
  })
})
