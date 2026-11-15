import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { LandingPage } from "../pages/LandingPage"
import * as authModule from "../context/AuthContext"

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}))

describe("LandingPage Login Form", () => {
  const mockLogin = vi.fn()
  const mockDemoLogin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    authModule.useAuth.mockReturnValue({
      login: mockLogin,
      demoLogin: mockDemoLogin,
      user: null,
      loading: false,
    })
  })

  it("renders profile code and passcode input fields", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )

    expect(screen.getByPlaceholderText(/e\.g\. CARE-7291/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText("••••")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Enter DawaSaathi 365/i })).toBeInTheDocument()
  })

  it("shows error when login API throws an error", async () => {
    mockLogin.mockRejectedValue(new Error("Invalid profile code or passcode"))

    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )

    const codeInput = screen.getByPlaceholderText(/e\.g\. CARE-7291/i)
    const passcodeInput = screen.getByPlaceholderText("••••")
    const submitBtn = screen.getByRole("button", { name: /Enter DawaSaathi 365/i })

    fireEvent.change(codeInput, { target: { value: "CARE-TEST" } })
    fireEvent.change(passcodeInput, { target: { value: "0000" } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText("Invalid profile code or passcode")).toBeInTheDocument()
    })
  })

  it("calls login with entered credentials on valid submission", async () => {
    mockLogin.mockResolvedValue({ role: "ELDER" })

    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )

    const codeInput = screen.getByPlaceholderText(/e\.g\. CARE-7291/i)
    const passcodeInput = screen.getByPlaceholderText("••••")
    const submitBtn = screen.getByRole("button", { name: /Enter DawaSaathi 365/i })

    fireEvent.change(codeInput, { target: { value: "CARE-7291" } })
    fireEvent.change(passcodeInput, { target: { value: "1234" } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("CARE-7291", "1234")
    })
  })

  it("triggers 1-click live demo login", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )

    const demoBtn = screen.getByRole("button", { name: /Try Live Demo \(1-Click\)/i })
    fireEvent.click(demoBtn)

    expect(mockDemoLogin).toHaveBeenCalledWith("ELDER")
  })
})
