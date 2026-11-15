import React, { createContext, useContext, useState, useEffect } from "react"
import { api } from "../lib/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("carecircle_user")
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("carecircle_token")
    if (token) {
      api
        .getMe()
        .then((userData) => {
          setUser(userData)
          localStorage.setItem("carecircle_user", JSON.stringify(userData))
        })
        .catch(() => {
          localStorage.removeItem("carecircle_token")
          localStorage.removeItem("carecircle_user")
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (profile_code, passcode) => {
    const res = await api.login(profile_code, passcode)
    localStorage.setItem("carecircle_token", res.access_token)
    localStorage.setItem("carecircle_user", JSON.stringify(res))
    setUser(res)
    return res
  }

  const demoLogin = async (role = "ELDER") => {
    const res = await api.demoLogin(role)
    localStorage.setItem("carecircle_token", res.access_token)
    localStorage.setItem("carecircle_user", JSON.stringify(res))
    setUser(res)
    return res
  }

  const logout = () => {
    localStorage.removeItem("carecircle_token")
    localStorage.removeItem("carecircle_user")
    setUser(null)
    window.location.href = "/login"
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        demoLogin,
        logout,
        isAuthenticated: !!user,
        isElder: user?.role === "ELDER",
        isCaretaker: user?.role === "CARETAKER",
        isFamily: user?.role === "FAMILY",
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
