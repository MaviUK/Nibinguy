import React, { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { submitClaim } from "../lib/standeeHelpers"

export default function StandeeClaim() {
  const { slug } = useParams()
  const [loading, setLoading] = useState(true)
  const [standee, setStandee] = useState(null)
  const [isMatch, setIsMatch] = useState(false)
  const [selectedBin, setSelectedBin] = useState("")
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
      bins: [selectedBin],
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

  const minDate = new Date().toISOString().split("T")[0]
  const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  if (loading) return <div className="text-white p-6">Loading...</div>

  if (!standee) {
    return (
      <div className="text-white p-6">
        <h1 className="text-2xl font-bold">No standee found</h1>
        <p>Please check the URL or try again later.</p>
      </div>
    )
  }

  if (!isMatch) {
    return (
      <div className="text-red-400 p-6">
        <h1 className="text-2xl font-bold">This isn't your standee!</h1>
        <p>This standee is meant for: <strong>{standee?.current_address}</strong></p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="text-green-400 p-6">
        <h1 className="text-2xl font-bold">🎉 Success!</h1>
        <p>Your free bin clean is booked for <strong>{firstDate}</strong> and <strong>{secondDate}</strong>.</p>
        <p>The standee is now heading to <strong>{nominatedAddress}</strong> in <strong>{town}</strong> ({postcode}).</p>
      </div>
    )
  }

  return (
    <div className="bg-black min-h-screen text-white font-sans p-6 max-w-xl mx-auto">
      <img src="/logo.png" alt="Ni Bin Guy Logo" className="w-32 mb-6 mx-auto" />

      <h1 className="text-3xl font-bold text-center mb-6">🎁 You've Been Nominated!</h1>
      <p className="text-center mb-6">Current Standee Location: <strong>{standee.current_address}</strong></p>

      <div className="mb-6">
        <label className="block mb-2 font-medium">Select your bin:</label>
        <div className="flex gap-3">
          {["Black", "Blue", "Brown"].map((bin) => (
            <button
              key={bin}
              onClick={() => setSelectedBin(bin)}
              className={`px-4 py-2 rounded border transition-all duration-200 ${
                selectedBin === bin
                  ? "bg-green-500 text-black font-bold"
                  : "bg-white text-black"
              }`}
            >
              {bin}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block mb-2 font-medium">Select 2 clean dates:</label>
        <div className="flex gap-3">
          <input
            type="date"
            value={firstDate}
            onChange={(e) => setFirstDate(e.target.value)}
            min={minDate}
            max={maxDate}
            className="p-2 rounded border w-1/2 text-black"
          />
          <input
            type="date"
            value={secondDate}
            onChange={(e) => setSecondDate(e.target.value)}
            min={minDate}
            max={maxDate}
            className="p-2 rounded border w-1/2 text-black"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block font-medium">Nominate your neighbour:</label>
        <input
          type="text"
          value={nominatedAddress}
          onChange={(e) => setNominatedAddress(e.target.value)}
          placeholder="Full address"
          className="mt-2 p-2 rounded border w-full text-black"
        />
      </div>

      <div className="mb-4">
        <label className="block font-medium">Town:</label>
        <input
          type="text"
          value={town}
          onChange={(e) => setTown(e.target.value)}
          className="mt-2 p-2 rounded border w-full text-black"
        />
      </div>

      <div className="mb-6">
        <label className="block font-medium">Postcode:</label>
        <input
          type="text"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          className="mt-2 p-2 rounded border w-full text-black"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!selectedBin || !firstDate || !secondDate || !nominatedAddress || !town || !postcode}
        className="w-full py-3 bg-pink-500 text-white font-bold rounded shadow hover:bg-pink-400 transition"
      >
        Claim My Free Clean
      </button>
    </div>
  )
}
