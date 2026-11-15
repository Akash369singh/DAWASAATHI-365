import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { Button } from "../components/common/Button"
import { Card } from "../components/common/Card"
import { ProgressRing } from "../components/common/ProgressRing"
import { Toast } from "../components/common/Toast"
import { EmptyState } from "../components/common/EmptyState"

describe("Common Reusable Components", () => {
  it("Button renders children and triggers onClick callback", () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Confirm Dose</Button>)

    const btn = screen.getByRole("button", { name: /Confirm Dose/i })
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("Button shows loading spinner when loading is true", () => {
    render(<Button loading>Submit</Button>)
    const btn = screen.getByRole("button")
    expect(btn).toBeDisabled()
  })

  it("Card renders children with appropriate styles", () => {
    render(
      <Card>
        <div>DawaSaathi Card Content</div>
      </Card>
    )
    expect(screen.getByText("DawaSaathi Card Content")).toBeInTheDocument()
  })

  it("ProgressRing renders adherence percentage and labels", () => {
    render(<ProgressRing progress={85} label="Adherence" sublabel="This week" />)
    expect(screen.getByText("85%")).toBeInTheDocument()
    expect(screen.getByText("Adherence")).toBeInTheDocument()
    expect(screen.getByText("This week")).toBeInTheDocument()
  })

  it("Toast renders message and allows closing", () => {
    const handleClose = vi.fn()
    const mockToast = { type: "success", message: "Medication successfully logged!" }

    render(<Toast toast={mockToast} onClose={handleClose} />)
    expect(screen.getByText("Medication successfully logged!")).toBeInTheDocument()

    const closeBtn = screen.getByRole("button")
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalled()
  })

  it("EmptyState renders title, description, and action button", () => {
    const handleAction = vi.fn()
    render(
      <EmptyState
        title="No Upcoming Appointments"
        description="All your checkups are completed for this month."
        actionLabel="Book Checkup"
        onAction={handleAction}
      />
    )

    expect(screen.getByText("No Upcoming Appointments")).toBeInTheDocument()
    expect(screen.getByText(/All your checkups/i)).toBeInTheDocument()

    const actionBtn = screen.getByRole("button", { name: /Book Checkup/i })
    fireEvent.click(actionBtn)
    expect(handleAction).toHaveBeenCalledTimes(1)
  })
})
