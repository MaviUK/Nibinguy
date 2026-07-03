import React, { useEffect } from "react"
import { Routes, Route } from "react-router-dom"
import NiBinGuyLandingPage from "./LandingPage"
import StandeeClaim from "./standee/StandeeClaim"
import StandeeSpottedClaim from "./standee/StandeeSpottedClaim"
import StandeePreClaim from "./standee/StandeePreClaim"
import LatestStandeeRedirect from "./pages/standee/latest"
import StandeeSpottedClosed from "./standee/StandeeSpottedClosed"
import AdminLogin from "./admin/AdminLogin"
import AdminDashboard from "./admin/AdminDashboard"
import AuthCallback from "./auth/AuthCallback"

export default function App() {

  <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

  useEffect(() => {
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY

    if (!siteKey) {
      console.error("Missing VITE_RECAPTCHA_SITE_KEY")
      return
    }

    // Prevent duplicate script injection
    if (document.getElementById("recaptcha-script")) return

    const script = document.createElement("script")
    script.id = "recaptcha-script"
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`
    script.async = true
    script.defer = true

    document.head.appendChild(script)

    return () => {
      // optional cleanup
      const existing = document.getElementById("recaptcha-script")
      if (existing) existing.remove()
    }
  }, [])

  return (
    <Routes>
      <Route path="/" element={<NiBinGuyLandingPage />} />
      <Route path="/standee/:slug" element={<StandeePreClaim />} />
      <Route path="/standee/:slug/claim" element={<StandeeClaim />} />
      <Route path="/standee/:slug/spotted" element={<StandeeSpottedClaim />} />
      <Route path="/standee/latest" element={<LatestStandeeRedirect />} />
      <Route path="/standee/:slug/spotted/closed" element={<StandeeSpottedClosed />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
    </Routes>
  )
}
