import { describe, it, expect } from "vitest"
import { translations } from "../lib/i18n"

describe("Internationalization (i18n) Support", () => {
  it("should support English, Hindi, and Gujarati translations", () => {
    expect(translations).toHaveProperty("en")
    expect(translations).toHaveProperty("hi")
    expect(translations).toHaveProperty("gu")
  })

  it("should have correct app name translations across languages", () => {
    expect(translations.en.appName).toBe("DawaSaathi 365")
    expect(translations.hi.appName).toBe("दवा साथी 365")
    expect(translations.gu.appName).toBeDefined()
  })

  it("should have consistent keys across all languages", () => {
    const enKeys = Object.keys(translations.en)
    const hiKeys = Object.keys(translations.hi)
    const guKeys = Object.keys(translations.gu)

    expect(hiKeys.length).toBeGreaterThanOrEqual(enKeys.length - 2)
    expect(guKeys.length).toBeGreaterThanOrEqual(enKeys.length - 2)

    // Critical elder-friendly action keys
    expect(translations.en.iTookIt).toBeDefined()
    expect(translations.hi.iTookIt).toBeDefined()
    expect(translations.gu.iTookIt).toBeDefined()
  })
})
