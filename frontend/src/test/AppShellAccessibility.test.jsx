import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { AppShell } from "../components/layout/AppShell"
import * as authModule from "../context/AuthContext"
import * as settingsModule from "../context/SettingsContext"

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}))

vi.mock("../context/SettingsContext", () => ({
  useSettings: vi.fn(),
}))

vi.mock("../lib/api", () => ({
  api: {
    getActiveSos: vi.fn().mockResolvedValue(null),
    getEmergencyCard: vi.fn().mockResolvedValue({}),
  },
}))

describe("AppShell Layout and Accessibility", () => {
  const mockUser = {
    id: 1,
    name: "Ramesh Patel",
    role: "ELDER",
  }

  const mockSettings = {
    theme: "light",
    toggleTheme: vi.fn(),
    fontSize: "normal",
    setFontSize: vi.fn(),
    language: "en",
    setLanguage: vi.fn(),
    elderMode: true,
    toggleElderMode: vi.fn(),
    t: (key) => key,
  }

  it("provides accessible skip link and landmark roles", () => {
    authModule.useAuth.mockReturnValue({
      user: mockUser,
      logout: vi.fn(),
      isElder: true,
    })
    settingsModule.useSettings.mockReturnValue(mockSettings)

    render(
      <MemoryRouter>
        <AppShell>
          <div>Test Content</div>
        </AppShell>
      </MemoryRouter>
    )

    // Skip to main content link for keyboard / screen reader users
    const skipLink = screen.getByRole("link", { name: /Skip to main content/i })
    expect(skipLink).toBeInTheDocument()
    expect(skipLink).toHaveAttribute("href", "#main-content")

    // Landmark banner header
    const header = screen.getByRole("banner")
    expect(header).toBeInTheDocument()

    // Main landmark with id matching the skip link
    const main = screen.getByRole("main")
    expect(main).toBeInTheDocument()
    expect(main).toHaveAttribute("id", "main-content")

    // DawaSaathi branding
    expect(screen.getByText(/DawaSaathi/i)).toBeInTheDocument()
    expect(screen.getByText("365")).toBeInTheDocument()
  })

  it("renders accessible emergency SOS button in the top navigation", () => {
    authModule.useAuth.mockReturnValue({
      user: mockUser,
      logout: vi.fn(),
      isElder: true,
    })
    settingsModule.useSettings.mockReturnValue(mockSettings)

    render(
      <MemoryRouter>
        <AppShell>
          <div>Body</div>
        </AppShell>
      </MemoryRouter>
    )

    const sosButton = screen.getByRole("button", { name: /Emergency SOS/i })
    expect(sosButton).toBeInTheDocument()
  })
})
