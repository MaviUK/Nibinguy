import React from "react"
import { Routes, Route, useLocation } from "react-router-dom"
import NiBinGuyLandingPage from "./LandingPage"
import StandeeClaim from "./standee/StandeeClaim"
import LatestStandeeRedirect from "./pages/standee/latest"
import CustomerPortalLoader from "./components/CustomerPortalLoader"

export default function App() {
  const location = useLocation()

  // Define routes where the portal should be hidden
  const hidePortalOnRoutes = ['/standee/latest']

  // Hide portal if current path matches, or if it's a dynamic standee claim route
  const hidePortal = hidePortalOnRoutes.includes(location.pathname) || location.pathname.startsWith('/standee/')

  return (
    <>
      <Routes>
        <Route path="/" element={<NiBinGuyLandingPage />} />
        <Route path="/standee/:slug" element={<StandeeClaim />} />
        <Route path="/standee/latest" element={<LatestStandeeRedirect />} />
      </Routes>

      {!hidePortal && <CustomerPortalLoader />}
    </>
  )
}
