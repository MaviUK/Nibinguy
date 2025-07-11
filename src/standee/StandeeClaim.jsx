import React, { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { submitClaim } from "../lib/standeeHelpers.js"

export default function StandeeClaim() {
  const { slug } = useParams()
  const [loading, setLoading] = useState(true)
  const [standee, setStandee] = useState(null)
  const [isMatch, setIsMatch] = useState(false)
  const [bin, setBin] = useState("") // SINGLE bin
  const [firstDate, setFirstDate] = useState("")
  const [secondDate, setSecondDate] = useState("")
  const [nominatedAddress, setNominatedAddress] = useState("")
  const [town, setTown] = useState("")
  const [postcode, setPostcode] = useState("")
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    async function fetchStandee() {
      const normalizedSlug = slug.trim().toLowerCase()
      try {
        const { data } = await supabase
          .from("standee_location")
          .select("*")
          .eq("current_slug", normalizedSlug)
          .maybeSingle()

        if (!data) {
          setStandee(null)
          setIsMatch(false)
        } else {
          setStandee(data)
          setIsMatch(data.current_slug === normalizedSlug)
        }
      } catch (err) {
        console.error("Supabase fetch error:", err)
        setStandee(null)
        setIsMatch(false)
      }
      setLoading(false)
    }

    fetchStandee()
  }, [slug])

  const handleSubmit = async () => {
    const response = await submitClaim({
      address: standee.current_address,
      bins: [bin], // Single bin in array
      dates: [firstDate, secondDate],
      nominatedAddress,
      town,
      postcode
    })

    if (response.success) {
      setSubmitted(true)
    } else {
      alert(`Something went wrong: ${response.error}`)
    }
  }

  if (loading) return <p className="p-6">Loading...</p>

  if (!standee) {
    return (
      <div className="p-6 text-red-500">
        <h1 className="text-2xl font-bold">Standee Not Found</h1>
        <p>Check the URL or try again later.</p>
      </div>
    )
  }

  if (!isMatch) {
    return (
      <div className="p-6 text-red-500">
        <h1 className="text-2xl font-bold">Wrong Standee</h1>
        <p>This standee is currently located at <strong>{standee.current_address}</strong>.</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="p-6 text-green-700">
        <h1 className="text-2xl font-bold">🎉 Success!</h1>
        <p>Your bin clean is booked for <strong>{firstDate}</strong> and <strong>{secondDate}</strong>.</p>
        <p>You've nominated <strong>{nominatedAddress}</strong> in <strong>{town}</strong> ({postcode}).</p>
      </div>
    )
  }

  const today = new Date()
  const minDate = today.toISOString().split("T")[0]
  const maxDate = new Date(today.setDate(today.getDate() + 30)).toISOString().split("T")[0]

  return (
    <div className="p-6 max-w-xl mx-auto text-gray-800">
      <img src="/logo.png" alt="Ni Bin Guy logo" className="w-40 mx-auto mb-6" />

      <h1 className="text-3xl font-bold text-center text-green-700 mb-4">🎁 Claim Your Free Bin Clean</h1>
      <p className="mb-4 text-center">Standee currently located at: <strong>{standee.current_address}</strong></p>

      <div className="mb-4">
        <label className="block font-semibold mb-1">Select your bin:</label>
        <div className="flex gap-3">
          {["Black", "Blue", "Brown"].map((b) => (
            <button
              key={b}
              onClick={() => setBin(b)}
              className={`px-4 py-2 rounded border font-bold ${
                bin === b ? "bg-green-700 text-white" : "bg-white text-black"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block font-semibold mb-1">Select 2 clean dates:</label>
        <div className="flex gap-4">
          <input
            type="date"
            value={firstDate}
            onChange={(e) => setFirstDate(e.target.value)}
            min={minDate}
            max={maxDate}
            className="p-2 border rounded w-1/2"
          />
          <input
            type="date"
            value={secondDate}
            onChange={(e) => setSecondDate(e.target.value)}
            min={minDate}
            max={maxDate}
            className="p-2 border rounded w-1/2"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block font-semibold mb-1">Nominate your neighbour:</label>
        <input
          type="text"
          value={nominatedAddress}
          onChange={(e) => setNominatedAddress(e.target.value)}
          placeholder="Full address"
          className="p-2 border rounded w-full"
        />
      </div>

      <div className="mb-4">
        <label className="block font-semibold mb-1">Town:</label>
        <input
          type="text"
          value={town}
          onChange={(e) => setTown(e.target.value)}
          placeholder="e.g. Bangor"
          className="p-2 border rounded w-full"
        />
      </div>

      <div className="mb-6">
        <label className="block font-semibold mb-1">Postcode:</label>
        <input
          type="text"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          placeholder="e.g. BT20 5NF"
          className="p-2 border rounded w-full"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={
          !bin || !firstDate || !secondDate || !nominatedAddress || !town || !postcode
        }
        className="w-full bg-green-700 text-white py-3 rounded font-bold hover:bg-green-800 transition"
      >
        ✅ Book My Free Bin Clean
      </button>
    </div>
  )
}
