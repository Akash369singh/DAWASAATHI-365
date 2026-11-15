import React, { createContext, useContext, useState, useEffect } from "react"
import { translations } from "../lib/i18n"
import { useAuth } from "./AuthContext"

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const { user } = useAuth()
  
  const [theme, setTheme] = useState(() => localStorage.getItem("carecircle_theme") || "light")
  const [fontSize, setFontSize] = useState(() => localStorage.getItem("carecircle_fontsize") || "normal")
  const [language, setLanguage] = useState(() => localStorage.getItem("carecircle_lang") || "en")
  const [elderMode, setElderMode] = useState(() => {
    const saved = localStorage.getItem("carecircle_eldermode")
    return saved !== null ? saved === "true" : true
  })

  // Set default elderMode if user role changes to ELDER
  useEffect(() => {
    if (user?.role === "ELDER") {
      setElderMode(true)
    }
  }, [user?.role])

  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    localStorage.setItem("carecircle_theme", theme)
  }, [theme])

  useEffect(() => {
    document.body.classList.remove("font-normal", "font-large", "font-xlarge")
    document.body.classList.add(`font-${fontSize}`)
    localStorage.setItem("carecircle_fontsize", fontSize)
  }, [fontSize])

  useEffect(() => {
    localStorage.setItem("carecircle_lang", language)
  }, [language])

  useEffect(() => {
    localStorage.setItem("carecircle_eldermode", elderMode.toString())
  }, [elderMode])

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"))
  const toggleElderMode = () => setElderMode((prev) => !prev)

  const t = (key) => {
    const dict = translations[language] || translations.en
    return dict[key] || translations.en[key] || key
  }

  return (
    <SettingsContext.Provider
      value={{
        theme,
        toggleTheme,
        fontSize,
        setFontSize,
        language,
        setLanguage,
        elderMode,
        setElderMode,
        toggleElderMode,
        t,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) throw new Error("useSettings must be used within a SettingsProvider")
  return context
}
