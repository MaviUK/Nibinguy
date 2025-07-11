import React, { useEffect, useState, useRef } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { submitClaim } from "../lib/standeeHelpers.js"

export default function StandeeClaim() {
  const { slug } = useParams()
  const [loading, setLoading] = useState(true)
  const [standee, setStandee] = useState(null)
  const [isMatch, setIsMatch] = useState(false)
  const [bins, setBins] = useState([])
  const [selectedDate, setSelectedDate] = useState("")
  const [nominatedAddress, setNominatedAddress] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    async function fetchStandee() {
      const normalizedSlug = slug.trim().toLowerCase()
      console.log("Checking slug:", normalizedSlug)

      try {
        const { data, error } = await supabase
          .from("standee_location")
          .select("*")
          .eq("current_slug", normalizedSlug)
          .maybeSingle()

        console.log("Fetched data:", data)

        if (!data) {
          console.warn("No standee found for slug.")
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

  // Google Maps Autocomplete
  useEffect(() => {
    if (!window.google || !inputRef.current) return

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: { country: "uk" }
    })

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace()
      if (place && place.formatted_address) {
        setNominatedAddress(place.formatted_address)
      }
    })
  }, [inputRef.current])

  const toggleBin = (bin) => {
    setBins((prev) =>
      prev.includes(bin) ? prev.filter((b) => b !== bin) : [...prev, bin]
    )
  }

  const handleSubmit = async () => {
    const response = await submitClaim({
      address: standee.current_address,
      bins,
      selectedDate,
      nominatedAddress
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
        <h1 className="text-2xl font-bold">No standee found</h1>
        <p>Please check the URL or try again later.</p>
      </div>
    )
  }

  if (!isMatch) {
    return (
      <div className="p-6 text-red-500">
        <h1 className="text-2xl font-bold">This isn't your standee!</h1>
        <p>This standee is meant for: <strong>{standee?.current_address}</strong></p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="p-6 text-green-600">
        <h1 className="text-2xl font-bold">🎉 Success!</h1>
        <p>Your free bin clean is booked for <strong>{selectedDate}</strong>.</p>
        <p>The standee is now heading to <strong>{nominatedAddress}</strong>.</p>
      </div>
    )
  }

  const today = new Date()
  const nextTuesdays = []
  for (let i = 1; nextTuesdays.length < 2; i++) {
    const d = new Date()
    d.setDate(today.getDate() + i)
    if (d.getDay() === 2) nextTuesdays.push(d.toISOString().split("T")[0])
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🎁 You've Been Nominated!</h1>
      <p className="mb-4">Address: <strong>{standee.current_address}</strong></p>

      <div className="mb-4">
        <label className="block font-medium">Select your bins:</label>
        <div className="flex gap-2 mt-2">
          {["Black", "Blue", "Brown"].map((bin) => (
            <button
              key={bin}
              onClick={() => toggleBin(bin)}
              className={`px-4 py-2 rounded border ${
                bins.includes(bin) ? "bg-green-500 text-white" : "bg-white text-black"
              }`}
            >
              {bin}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block font-medium">Pick a clean date:</label>
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="mt-2 p-2 border rounded w-full"
        >
          <option value="">-- Select a date --</option>
          {nextTuesdays.map((date) => (
            <option key={date} value={date}>{date}</option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <label className="block font-medium">Nominate your neighbour:</label>
        <input
          ref={inputRef}
          placeholder="Start typing their address..."
          className="mt-2 p-2 border rounded w-full"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!bins.length || !selectedDate || !nominatedAddress}
        className="w-full bg-green-600 text-white py-3 rounded shadow font-bold"
      >
        Claim My Free Clean
      </button>
    </div>
  )
}
