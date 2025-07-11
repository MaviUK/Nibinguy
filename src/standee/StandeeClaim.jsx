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

  const toggleBin = (bin) => {
    setBins((prev) =>
      prev.includes(bin) ? prev.filter((b) => b !== bin) : [...prev, bin]
    )
  }

  const handleSubmit = async () => {
    const response = await submitClaim({
      address: standee.current_address,
      bins,
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
        <p>Your free bin clean is booked for <strong>{firstDate}</strong> and <strong>{secondDate}</strong>.</p>
        <p>The standee is now heading to <strong>{nominatedAddress}</strong> in <strong>{town}</strong> ({postcode}).</p>
      </div>
    )
  }

  const minDate = new Date().toISOString().split("T")[0]
  const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🎁 You've Been Nominated For A Free Bin Clean!</h1>
      <p className="mb-4">Address: <strong>{standee.current_address}</strong></p>

      <div className="mb-4">
        <label className="block font-medium">Select your bin for free clean:</label>
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
        <label className="block font-medium">Select your next 2 clean dates:</label>
        <div className="flex gap-4 mt-2">
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
        <label className="block font-medium">Nominate your neighbour:</label>
        <input
          type="text"
          placeholder="Full address"
          value={nominatedAddress}
          onChange={(e) => setNominatedAddress(e.target.value)}
          className="mt-2 p-2 border rounded w-full"
        />
      </div>

      <div className="mb-4">
        <label className="block font-medium">Town:</label>
        <input
          type="text"
          value={town}
          onChange={(e) => setTown(e.target.value)}
          className="mt-2 p-2 border rounded w-full"
        />
      </div>

      <div className="mb-6">
        <label className="block font-medium">Postcode:</label>
        <input
          type="text"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          className="mt-2 p-2 border rounded w-full"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={
          !bins.length ||
          !firstDate ||
          !secondDate ||
          !nominatedAddress ||
          !town ||
          !postcode
        }
        className="w-full bg-green-600 text-white py-3 rounded shadow font-bold"
      >
        Claim My Free Clean
      </button>
    </div>
  )
}
