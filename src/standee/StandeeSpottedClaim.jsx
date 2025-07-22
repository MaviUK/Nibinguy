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

  // form fields
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [bin, setBin] = useState("")
  const [dates, setDates] = useState(["", ""])

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

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!name || !email || !phone || !address || !bin || !dates[0] || !dates[1]) {
      setClaimError("Please fill in all fields.")
      return
    }

    const response = await submitClaim({
      address: standee.current_address,
      bins: [bin],
      dates,
      neighbourName: name,
      nominatedAddress: address,
      town: "", // optional
      postcode: "",
      isSpotted: true
    })

    if (response.success) {
      await supabase
        .from("standee_location")
        .update({ spotted_claims: (standee.spotted_claims || 0) + 1 })
        .eq("id", standee.id)

      setSubmitted(true)
    } else {
      setClaimError(response.error || "Something went wrong.")
    }
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Your Name"
          className="w-full p-3 rounded bg-gray-800 text-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 rounded bg-gray-800 text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="tel"
          placeholder="Mobile Number"
          className="w-full p-3 rounded bg-gray-800 text-white"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          type="text"
          placeholder="Your Address"
          className="w-full p-3 rounded bg-gray-800 text-white"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <select
          className="w-full p-3 rounded bg-gray-800 text-white"
          value={bin}
          onChange={(e) => setBin(e.target.value)}
        >
          <option value="">Select Bin Type</option>
          <option value="Black">Black</option>
          <option value="Blue">Blue</option>
          <option value="Brown">Brown</option>
        </select>
        <input
          type="date"
          className="w-full p-3 rounded bg-gray-800 text-white"
          value={dates[0]}
          onChange={(e) => setDates([e.target.value, dates[1]])}
        />
        <input
          type="date"
          className="w-full p-3 rounded bg-gray-800 text-white"
          value={dates[1]}
          onChange={(e) => setDates([dates[0], e.target.value])}
        />

        <button
          type="submit"
          className="bg-red-700 text-white font-bold py-3 px-6 rounded hover:bg-red-600"
        >
          Claim My Free Clean
        </button>
      </form>
    </div>
  )
}
