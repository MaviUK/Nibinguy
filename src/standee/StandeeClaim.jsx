// ...imports and logic unchanged...

  return (
    <div className="bg-black min-h-screen text-white font-sans px-6 py-10">
      <div className="flex justify-center mb-6">
        <img src="/logo.png" alt="Ni Bin Guy Logo" className="w-56 md:w-72" />
      </div>

      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">🎁 You've Been Nominated!</h1>
        <p className="text-center mb-6">Current Standee Location: <strong>{standee.current_address}</strong></p>

        <div className="mb-6">
          <label className="block font-medium">Select your bin:</label>
          <div className="flex gap-3 mt-2">
            {["Black", "Blue", "Brown"].map((bin) => (
              <button
                key={bin}
                onClick={() => setSelectedBin(bin)}
                className={`px-4 py-2 rounded border ${
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

        {/* ✅ Moved Date Selection here */}
        <div className="mb-6">
          <label className="block font-medium">Select 2 clean dates:</label>
          <div className="flex gap-3 mt-2">
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

        <div className="mb-6">
          <label className="block font-medium">Neighbour's Name:</label>
          <input
            type="text"
            value={neighbourName}
            onChange={(e) => setNeighbourName(e.target.value)}
            className="mt-2 p-2 border rounded w-full text-black"
          />
        </div>

        <div className="mb-6">
          <label className="block font-medium">Nominate your neighbour:</label>
          <input
            type="text"
            value={nominatedAddress}
            onChange={(e) => setNominatedAddress(e.target.value)}
            className="mt-2 p-2 border rounded w-full text-black"
          />
        </div>

        <div className="mb-6 flex gap-4">
          <div className="flex-1">
            <label className="block font-medium">Town:</label>
            <input
              type="text"
              value={town}
              onChange={(e) => setTown(e.target.value)}
              className="mt-2 p-2 border rounded w-full text-black"
            />
          </div>
          <div className="w-32">
            <label className="block font-medium">Postcode:</label>
            <input
              type="text"
              maxLength={10}
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              className="mt-2 p-2 border rounded w-full text-black"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={
            !selectedBin ||
            !firstDate ||
            !secondDate ||
            !neighbourName ||
            !nominatedAddress ||
            !town ||
            !postcode
          }
          className="w-full py-3 bg-red-700 text-white font-bold rounded shadow hover:bg-red-600 transition"
        >
          Claim My Free Clean
        </button>
      </div>
    </div>
  )
}
