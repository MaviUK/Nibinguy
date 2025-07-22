import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"

export default function LatestStandeeRedirect() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function redirect() {
      const { data, error } = await supabase
        .from("standee_location")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error || !data) {
        console.error("❌ Could not fetch latest standee:", error)
        return
      }

      navigate(`/standee/${data.current_slug}`)
    }

    redirect()
  }, [navigate])

  return <p className="text-white p-6">Redirecting to the latest standee...</p>
}
