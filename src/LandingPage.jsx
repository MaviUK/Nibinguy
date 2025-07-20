import React, { useState } from "react";

export default function NiBinGuyLandingPage() {
  const [showForm, setShowForm] = useState(false);
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

  const handleBinChange = (index, field, value) => {
    const newBins = [...bins];
    newBins[index][field] = field === "count" ? parseInt(value) : value;
    setBins(newBins);
  };

  const addBinRow = () => {
    setBins([...bins, { type: "", count: 1, frequency: "One-off" }]);
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
          <button onClick={() => setShowForm(true)} className="mt-6 bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition">
            Book a Clean
          </button>
        </div>
      </section>

      {/* WhatsApp Booking Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white text-black rounded-xl shadow-xl w-11/12 max-w-md p-6 space-y-4 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowForm(false)} className="absolute top-2 right-4 text-gray-500 hover:text-red-500 text-xl">&times;</button>
            <h2 className="text-2xl font-bold text-center">Book a Bin Clean</h2>
            <input type="text" placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
            {bins.map((bin, index) => (
              <div key={index} className="space-y-2 border-b border-gray-200 pb-4 mb-4">
                <div className="flex gap-4">
                  <select value={bin.type} onChange={(e) => handleBinChange(index, "type", e.target.value)} className="w-2/3 border border-gray-300 rounded-lg px-4 py-2">
                    <option value="">Select Bin</option>
                    <option value="Black Bin">Black</option>
                    <option value="Brown Bin">Brown</option>
                    <option value="Green Bin">Green</option>
                    <option value="Blue Bin">Blue</option>
                  </select>
                  <input type="number" min="1" value={bin.count} onChange={(e) => handleBinChange(index, "count", e.target.value)} className="w-1/3 border border-gray-300 rounded-lg px-4 py-2" />
                </div>
                <select value={bin.frequency} onChange={(e) => handleBinChange(index, "frequency", e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2">
                  <option value="One-off">One-off</option>
                  <option value="4 Weekly">4 Weekly</option>
                </select>
              </div>
            ))}
            <button onClick={addBinRow} className="text-sm text-green-600 hover:text-green-800 font-semibold">+ Add Another Bin</button>
            <input type="text" placeholder="Full Address" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-4" />
            <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-2" />
            <button onClick={handleSend} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg w-full">Send via WhatsApp</button>
          </div>
        </div>
      )}

      {/* What We Do */}
      <section className="relative py-16 px-6 bg-[#18181b]">
        <h2 className="text-3xl font-bold text-green-400 mb-8 text-center">What We Do</h2>
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div className="bg-zinc-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-bold mb-2">Domestic Bins</h3>
            <p>We clean green, black, and blue bins right outside your home.</p>
          </div>
          <div className="bg-zinc-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-bold mb-2">Commercial Contracts</h3>
            <p>Need regular bin cleaning? We handle your business waste too.</p>
          </div>
          <div className="bg-zinc-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-bold mb-2">Eco-Friendly Process</h3>
            <p>We use biodegradable products and minimal water waste.</p>
          </div>
        </div>
      </section>

      {/* Why Clean Your Bin */}
      <section className="py-16 px-6 bg-gradient-to-b from-black via-[#0a0a0a] to-zinc-900 text-white">
        <h2 className="text-3xl font-bold text-green-400 mb-12 text-center">Why Clean Your Bin?</h2>
        {/* Keep your 4 reasons here */}
      </section>

      {/* Why Ni Bin Guy */}
      <section className="py-16 px-6 bg-gradient-to-b from-zinc-900 via-[#1a1a1a] to-black text-white">
        <h2 className="text-3xl font-bold text-green-400 mb-8 text-center">Why Ni Bin Guy?</h2>
        {/* Keep your 4 features here */}
      </section>

      {/* Footer */}
      <footer className="bg-black text-center py-6 text-gray-400">
        <p>© 2025 Ni Bin Guy. All rights reserved.</p>
        <p>Bangor, BT20 5NF · 07555178484 · nibinguy@gmail.com · aabincleaning@gmail.com</p>
      </footer>
    </div>
  );
}
