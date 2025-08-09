import React, { useEffect, useState } from "react"
import { useNavigate, useParams, Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

export default function StandeePreClaim() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [standee, setStandee] = useState(null)

  useEffect(() => {
    async function fetchStandee() {
      const { data } = await supabase
        .from("standee_location")
        .select("*")
        .eq("current_slug", slug.toLowerCase().trim())
        .maybeSingle()

      if (data) setStandee(data)
      setLoading(false)
    }

    fetchStandee()
  }, [slug])

  if (loading) return <div className="bg-black text-white min-h-screen p-6">Loading...</div>

  if (!standee) {
    return (
      <div className="bg-black text-white min-h-screen p-6 text-center">
        <h1 className="text-2xl font-bold">Standee not found</h1>
        <p>Check your link and try again.</p>
      </div>
    )
  }

  // --- UI logic: what's available? ---
  const limit = Number.isFinite(standee.spotted_limit) ? standee.spotted_limit : 2
  const spottedFull = (standee.spotted_claims ?? 0) >= limit
  const residentTaken = !!standee.claimed

  // If BOTH resident is taken AND spotted is full, show final message
  if (residentTaken && spottedFull) {
    return (
      <div className="bg-black text-white min-h-screen p-6 text-center">
        <Link to="/">
          <img src="/logo.png" alt="Ni Bin Guy Logo" className="mx-auto w-56 mb-6 hover:opacity-80" />
        </Link>
        <h1 className="text-3xl font-bold mb-4">All free cleans claimed here</h1>
        <p className="text-lg mb-8">The Wheelie Washer is on his way to a new location.</p>
        <a
          href="https://api.whatsapp.com/send?phone=447555178484&text=Hey!%20I’d%20like%20to%20book%20a%20bin%20clean."
          className="inline-block py-3 px-5 bg-white text-black font-bold rounded shadow hover:bg-gray-200 transition"
        >
          Book a Bin Clean on WhatsApp
        </a>
      </div>
    )
  }

  return (
    <div className="bg-black text-white min-h-screen p-6 text-center">
      <Link to="/">
        <img src="/logo.png" alt="Ni Bin Guy Logo" className="mx-auto w-56 mb-6 hover:opacity-80" />
      </Link>
      <h1 className="text-3xl font-bold mb-4">The Wheelie Washer is at:</h1>
      <p className="text-xl mb-8 font-semibold">{standee.current_address}</p>

      <div className="flex flex-col gap-4 max-w-sm mx-auto">
        {/* Resident path */}
        {!residentTaken ? (
          <button
            onClick={() => navigate(`/standee/${slug}/claim`)}
            className="py-3 bg-green-500 text-black font-bold rounded shadow hover:bg-green-400 transition"
          >
            I Live Here
          </button>
        ) : (
          <button
            onClick={() => navigate(`/standee/${slug}/resident-already-claimed`)}
            className="py-3 bg-zinc-800 text-white font-bold rounded shadow"
          >
            Resident claim unavailable
          </button>
        )}

        {/* Spotted path */}
        {!spottedFull ? (
          <button
            onClick={() => navigate(`/standee/${slug}/spotted`)}
            className="py-3 bg-white text-black font-bold rounded shadow hover:bg-gray-200 transition"
          >
            I Spotted the Wheelie Washer
          </button>
        ) : (
          <button
            disabled
            className="py-3 bg-zinc-800 text-white font-bold rounded shadow opacity-60"
          >
            Spotted claims full
          </button>
        )}
      </div>
    </div>
  )
}
