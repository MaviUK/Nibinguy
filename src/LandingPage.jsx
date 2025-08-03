import React, { useState } from "react";

export default function NiBinGuyLandingPage() {
  const [showForm, setShowForm] = useState(false);
  const [showPortal, setShowPortal] = useState(false);
  const [bins, setBins] = useState([{ type: "", count: 1, frequency: "One-off" }]);
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSend = () => {
    if (!name || !email || !address || bins.some((b) => !b.type)) {
      alert("Please complete all fields before sending.");
      return;
    }

    const binDetails = bins
      .filter((b) => b.type !== "")
      .map((b) => `${b.count}x ${b.type.replace(" Bin", "")} (${b.frequency})`)
      .join("%0A");

    const message = `Hi my name is ${name}. I'd like to book a bin clean, please.%0A${binDetails}%0A${address}%0A${email}`;
    const phoneNumber = "+447555178484";
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
    setShowForm(false);
  };

  const handleEmailSend = async () => {
    if (!name || !email || !address || bins.some((b) => !b.type)) {
      alert("Please complete all fields before sending.");
      return;
    }

    try {
      const res = await fetch("/.netlify/functions/sendBookingEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, address, bins }),
      });

      if (res.ok) {
        alert("Booking email sent successfully!");
        setShowForm(false);
      } else {
        alert("Failed to send booking email.");
      }
    } catch (err) {
      console.error(err);
      alert("Error sending booking email.");
    }
  };

  const handleBinChange = (index, field, value) => {
    const newBins = [...bins];
    newBins[index][field] = field === "count" ? parseInt(value) : value;
    setBins(newBins);
  };

  const addBinRow = () => {
    setBins([...bins, { type: "", count: 1, frequency: "One-off" }]);
  };

  const removeBinRow = () => {
    if (bins.length > 1) {
      setBins(bins.slice(0, -1));
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Hero Section */}
      <section className="relative overflow-hidden flex flex-col items-center justify-center text-center pt-10 pb-20 px-4 bg-black">
        <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 w-[800px] h-[800px] bg-green-900 opacity-30 blur-3xl rounded-full z-0"></div>
        <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-b from-transparent via-[#121212] to-[#18181b] z-10 pointer-events-none" />
        <div className="relative z-20 flex flex-col items-center gap-4">
          <img src="logo.png" alt="Ni Bin Guy Logo" className="w-64 h-64 md:w-80 md:h-80 rounded-xl shadow-lg" />
          <h1 className="text-4xl md:text-6xl font-bold">
            Bin Cleaning, <span className="text-green-400">Done Right</span>
          </h1>
          <p className="text-lg md:text-xl max-w-xl mt-4 text-center">
            Professional wheelie bin cleaning at your home, across <span className="text-green-400">County Down.</span> Sparkling clean & fresh smelling bins without any drama.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition"
            >
              Book a Clean
            </button>
            <button
              onClick={() => setShowPortal(true)}
              className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition"
            >
              Customer Portal
            </button>
          </div>
        </div>
      </section>

      {/* Booking Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white text-black rounded-xl shadow-xl w-11/12 max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-2 right-4 text-gray-500 hover:text-red-500 text-2xl z-10"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold text-center">Book a Bin Clean</h2>
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
            {bins.map((bin, index) => (
              <div key={index} className="space-y-2 border-b border-gray-200 pb-4 mb-4">
                <div className="flex gap-4">
                  <select
                    value={bin.type}
                    onChange={(e) => handleBinChange(index, "type", e.target.value)}
                    className="w-2/3 border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="">Select Bin</option>
                    <option value="Black Bin">Black</option>
                    <option value="Brown Bin">Brown</option>
                    <option value="Green Bin">Green</option>
                    <option value="Blue Bin">Blue</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={bin.count}
                    onChange={(e) => handleBinChange(index, "count", e.target.value)}
                    className="w-1/3 border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <select
                  value={bin.frequency}
                  onChange={(e) => handleBinChange(index, "frequency", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="One-off">One-off</option>
                  <option value="4 Weekly">4 Weekly</option>
                </select>
              </div>
            ))}
            <div className="flex justify-between items-center">
              <button
                onClick={addBinRow}
                className="text-sm text-green-600 hover:text-green-800 font-semibold"
              >
                + Add Another Bin
              </button>
              {bins.length > 1 && (
                <button
                  onClick={removeBinRow}
                  className="text-sm text-red-600 hover:text-red-800 font-semibold"
                >
                  − Remove Last Bin
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="Full Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-4"
            />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-2"
            />
            <button
              onClick={handleSend}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg w-full"
            >
              Send via WhatsApp
            </button>
            <button
              onClick={handleEmailSend}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg w-full"
            >
              Send via Email
            </button>
          </div>
        </div>
      )}

      {/* Portal Modal */}
      {showPortal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50"
          onClick={() => setShowPortal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-11/12 max-w-4xl max-h-[90vh] overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPortal(false)}
              className="absolute top-2 right-4 text-gray-500 hover:text-red-500 text-2xl z-10"
            >
              &times;
            </button>
            <iframe
              src="https://sqgee.com/booking/25a031e7-75af-4a0e-9f3a-d308fd9b2e3a"
              title="Customer Portal"
              className="w-full h-[80vh] border-0"
            ></iframe>
          </div>
        </div>
      )}

      {/* What We Do */}
      {/* ... rest of your sections remain unchanged ... */}
    </div>
  );
}
