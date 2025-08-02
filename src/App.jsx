import React from "react"
import { Routes, Route } from "react-router-dom"
import NiBinGuyLandingPage from "./LandingPage"
import StandeeClaim from "./standee/StandeeClaim"
import StandeeSpottedClaim from "./standee/StandeeSpottedClaim"
import StandeePreClaim from "./standee/StandeePreClaim"
import LatestStandeeRedirect from "./pages/standee/latest"
import StandeeSpottedClosed from "./standee/StandeeSpottedClosed"
import AdminLogin from "./admin/AdminLogin"
import AdminDashboard from "./admin/AdminDashboard"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<NiBinGuyLandingPage />} />
      <Route path="/standee/:slug" element={<StandeePreClaim />} />   {/* Pre-claim choice */}
      <Route path="/standee/:slug/claim" element={<StandeeClaim />} />   {/* I live here */}
      <Route path="/standee/:slug/spotted" element={<StandeeSpottedClaim />} />  {/* I spotted */}
      <Route path="/standee/latest" element={<LatestStandeeRedirect />} />
      <Route path="/standee/:slug/spotted/closed" element={<StandeeSpottedClosed />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  )
}



