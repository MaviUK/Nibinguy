import React, { useEffect, useState } from "react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { useParams } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { submitClaim } from "../lib/standeeHelpers.js"

export default function StandeeClaim() {
  const { slug } = useParams()
  const [loading, setLoading] = useState(true)
  const [standee, setStandee] = useState(null)
  const [isMatch, setIsMatch] = useState(false)
  const [bins, setBins] = useState([])
  const [date1, setDate1] = useState(null)
  const [date2, setDate2] = useState(null)
  const [streetAddress, setStreetAddress] = useState("")
  const [town, setTown] = useState("")
  const [postcode, setPostcode] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const today = new Date()
  const maxDate = new Date()
  maxDate.setDate(today.getDate() + 30)

  useEffect(() => {
    async function fetchStandee() {
      const normalizedSlug = slug.trim().toLowerCase()
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
    const fullNominatedAddress = `${streetAddress}, ${town}, ${postcode}`
    const response = await submitClaim({
      address: standee.current_address,
      bins,
      selectedDates: [date1.toISOString(), date2.toISOString()],
      nominatedAddress: fullNominatedAddress
    })

    if (response.success) {
      setSubmitted(true)
    } else {
      alert(`Something went wrong: ${response.error}`)
    }
  }

  const allFieldsFilled = bins.length && date1 && date2 && streetAddress && town && postcode

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
        <p>Your free bin cleans are booked for:</p>
        <ul className="mt-2 list-disc list-inside">
          <li>{date1.toLocaleDateString()}</li>
          <li>{date2.toLocaleDateString()}</li>
        </ul>
        <p className="mt-4">The standee is now heading to <strong>{streetAddress}, {town}, {postcode}</strong>.</p>
      </div>
    )
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
        <label className="block font-medium">Pick 2 clean dates (within 30 days):</label>
        <div className="flex gap-4 mt-2">
          <DatePicker
            selected={date1}
            onChange={(date) => setDate1(date)}
            placeholderText="Select first date"
            className="p-2 border rounded w-full"
            dateFormat="yyyy-MM-dd"
            minDate={today}
            maxDate={maxDate}
          />
          <DatePicker
            selected={date2}
            onChange={(date) => setDate2(date)}
            placeholderText="Select second date"
            className="p-2 border rounded w-full"
            dateFormat="yyyy-MM-dd"
            minDate={today}
            maxDate={maxDate}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block font-medium">Neighbour's Street Address:</label>
        <input
          type="text"
          value={streetAddress}
          onChange={(e) => setStreetAddress(e.target.value)}
          placeholder="e.g. 7 Beechfield Drive"
          className="mt-2 p-2 border rounded w-full"
        />
      </div>

      <div className="mb-4">
        <label className="block font-medium">Town:</label>
        <input
          type="text"
          value={town}
          onChange={(e) => setTown(e.target.value)}
          placeholder="e.g. Bangor"
          className="mt-2 p-2 border rounded w-full"
        />
      </div>

      <div className="mb-6">
        <label className="block font-medium">Postcode:</label>
        <input
          type="text"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          placeholder="e.g. BT20 5NF"
          className="mt-2 p-2 border rounded w-full"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!allFieldsFilled}
        className={`w-full py-3 rounded shadow font-bold ${
          allFieldsFilled ? "bg-green-600 text-white" : "bg-gray-400 text-white cursor-not-allowed"
        }`}
      >
        Claim My Free Clean
      </button>
    </div>
  )
}
