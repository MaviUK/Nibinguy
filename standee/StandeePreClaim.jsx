import React, { useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

export default function StandeePreClaim() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [standee, setStandee] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStandee() {
      const { data, error } = await supabase
        .from("standee_location")
        .select("*")
        .eq("current_slug", slug.toLowerCase().trim())
        .maybeSingle()

      if (data) {
        setStandee(data)
      } else {
        setStandee(null)
      }
      setLoading(false)
    }

    fetchStandee()
  }, [slug])

  if (loading) return <div className="bg-black text-white min-h-screen p-6">Loading...</div>

  if (!standee) {
    return (
      <div className="bg-black text-white min-h-screen p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Standee Not Found</h1>
        <p>Please check the link or try again later.</p>
      </div>
    )
  }

  return (
    <div className="bg-black text-white min-h-screen p-6 flex flex-col items-center justify-center text-center">
      <Link to="/">
        <img src="/logo.png" alt="Logo" className="w-48 mb-6 hover:opacity-80 transition" />
      </Link>

      <h1 className="text-3xl font-bold mb-4">The Wheelie Washer is at:</h1>
      <p className="text-xl mb-6 font-semibold">{standee.current_address}</p>

      <button
        onClick={() => navigate(`/standee/${slug}/claim`)}
        className="bg-green-500 text-black font-bold py-3 px-6 rounded mb-4 w-64 hover:bg-green-400 transition"
      >
        I Live Here
      </button>

      <button
        onClick={() => navigate(`/standee/${slug}/spotted`)}
        className="bg-white text-black font-bold py-3 px-6 rounded w-64 hover:bg-gray-300 transition"
      >
        I Spotted the Wheelie Washer
      </button>
    </div>
  )
}
