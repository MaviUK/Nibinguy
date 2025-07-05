import React, { useState } from "react";

export default function NiBinGuyLandingPage() {
  const [showForm, setShowForm] = useState(false);
  const [bins, setBins] = useState("");
  const [frequency, setFrequency] = useState("One-off");
  const [address, setAddress] = useState("");

  const handleSend = () => {
    const message = `Hi! I'd like to book a bin clean.%0ABin/s: ${bins}%0AFrequency: ${frequency}%0AAddress: ${address}`;
    const phoneNumber = "+447555178484";
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden flex flex-col items-center justify-center text-center pt-10 pb-20 px-4 bg-black">
        <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 w-[800px] h-[800px] bg-green-900 opacity-30 blur-3xl rounded-full z-0"></div>

        <div className="relative z-10 flex flex-col items-center gap-4">
          <img
            src="logo.png"
            alt="Ni Bin Guy Logo"
            className="w-64 h-64 md:w-80 md:h-80 rounded-xl shadow-lg"
          />
          <h1 className="text-4xl md:text-6xl font-bold">
            Bin Cleaning, <span className="text-green-400">Done Right</span>
          </h1>
          <p className="text-lg md:text-xl max-w-xl mt-4">
            Professional wheelie bin cleaning with a hazmat twist. Sparkling clean bins without the drama.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-6 bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition"
          >
            Book a Clean
          </button>
        </div>
      </section>

      {/* MODAL FORM */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50">
          <div className="bg-white text-black rounded-xl shadow-xl w-11/12 max-w-md p-6 space-y-4 relative">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-2 right-4 text-gray-500 hover:text-red-500 text-xl"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-2 text-center">Book a Bin Clean</h2>

            <input
              type="text"
              placeholder="Bin/s (e.g. 1x Black, 1x Green)"
              value={bins}
              onChange={(e) => setBins(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />

            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            >
              <option>One-off</option>
              <option>4 Weekly</option>
            </select>

            <input
              type="text"
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />

            <button
              onClick={handleSend}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg w-full"
            >
              Send via WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-black text-center py-6 text-gray-400">
        <p>© 2025 Ni Bin Guy. All rights reserved.</p>
        <p>Bangor, BT20 5NF · 07555178484 · aabincleaning@gmail.com</p>
      </footer>
    </div>
  );
}
