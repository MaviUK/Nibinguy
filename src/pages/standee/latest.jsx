import React from "react"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"

export default function LatestStandeeRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    async function redirectToLatest() {
      const { data, error } = await supabase
        .from("standee_location")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error || !data) {
        console.error("❌ Failed to fetch latest standee:", error)
        return
      }

      navigate(`/standee/${data.current_slug}`)
    }

    redirectToLatest()
  }, [navigate])

  return <p className="text-white p-6">Redirecting to the latest standee...</p>
}
