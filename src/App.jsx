import React from "react"
import { Routes, Route } from "react-router-dom"
import NiBinGuyLandingPage from "./LandingPage"
import StandeeClaim from "./standee/StandeeClaim"
import LatestStandeeRedirect from "./pages/standee/latest"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<NiBinGuyLandingPage />} />
      <Route path="/standee/:slug" element={<StandeeClaim />} />
      <Route path="/standee/latest" element={<LatestStandeeRedirect />} /> {/* ✅ Add this line */}
    </Routes>
  )
}
