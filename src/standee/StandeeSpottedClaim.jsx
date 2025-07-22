import React, { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { submitClaim } from "../lib/standeeHelpers"

export default function StandeeSpottedClaim() {
  const { slug } = useParams()
  const [standee, setStandee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [claimError, setClaimError] = useState(null)

  useEffect(() => {
    async function fetchStandee() {
      const { data, error } = await supabase
        .from("standee_location")
        .select("*")
        .eq("current_slug", slug)
        .maybeSingle()

      if (error || !data) {
        setClaimError("Standee not found.")
      } else if ((data.spotted_claims || 0) >= 3) {
        setClaimError("This standee has reached the claim limit.")
      } else {
        setStandee(data)
      }

      setLoading(false)
    }

    fetchStandee()
  }, [slug])

  const handleSubmit = async () => {
    setLoading(true)

    const response = await submitClaim({
      address: standee.current_address,
      bins: [],
      dates: [],
      neighbourName: "",
      nominatedAddress: "",
      town: "",
      postcode: "",
      newSlug: slug,
      newAddress: standee.current_address,
      isSpotted: true   // ✅ This flag tells your submitClaim to NOT touch current_slug
    })

    if (response.success) {
      await supabase
        .from("standee_location")
        .update({ spotted_claims: (standee.spotted_claims || 0) + 1 })
        .eq("id", standee.id)

      setSubmitted(true)
    } else {
      setClaimError(response.error || "Something went wrong. Please try again.")
    }

    setLoading(false)
  }

  if (loading) return <div className="bg-black text-white p-6">Loading...</div>

  if (claimError) {
    return (
      <div className="bg-black text-red-500 p-6 min-h-screen">
        <h1 className="text-2xl font-bold">{claimError}</h1>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="bg-black text-green-500 p-6 min-h-screen">
        <h1 className="text-2xl font-bold">🎉 Success!</h1>
        <p>Your free bin clean is booked. Thank you for spotting the Wheelie Washer!</p>
      </div>
    )
  }

  return (
    <div className="bg-black text-white p-6 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">🎉 Claim Your Free Bin Clean</h1>
      <p className="mb-4">
        You’ve spotted the Wheelie Washer at <strong>{standee.current_address}</strong>.
      </p>
      <button
        onClick={handleSubmit}
        className="bg-red-700 text-white font-bold py-3 px-6 rounded hover:bg-red-600"
      >
        Claim My Free Clean
      </button>
    </div>
  )
}
