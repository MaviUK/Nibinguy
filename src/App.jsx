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
      {/* Hero Section */}
      <section className="relative overflow-hidden flex flex-col items-center justify-center text-center pt-10 pb-20 px-4 bg-black">
        {/* Subtle beam effect lower down */}
        <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 w-[800px] h-[800px] bg-green-900 opacity-30 blur-3xl rounded-full z-0"></div>

        {/* Content above glow */}
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
            Professional wheelie bin cleaning at your home. Sparkling clean & fresh smelling bins without any drama.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-6 bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition"
          >
            Book a Clean
          </button>
        </div>
      </section>

      {/* Modal WhatsApp Form */}
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

      {/* Services Section */}
      <section className="py-16 px-6 bg-zinc-900">
        <h2 className="text-3xl font-bold text-green-400 mb-8 text-center">What We Do</h2>
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div className="bg-zinc-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-xl font-bold mb-2">Domestic Bins</h3>
            <p>We clean green/brown, black, and blue bins right outside your home.</p>
          </div>
          <div className="bg-zinc-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-xl font-bold mb-2">Commercial Contracts</h3>
            <p>Need regular bin cleaning? We handle your businesses bins too.</p>
          </div>
          <div className="bg-zinc-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-xl font-bold mb-2">Eco-Friendly Process</h3>
            <p>We use biodegradable products and recycle water to reduce water waste.</p>
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section className="py-16 px-6 bg-black">
        <h2 className="text-3xl font-bold text-green-400 mb-8 text-center">Why Ni Bin Guy?</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-2">Local & Trusted</h3>
            <p>We're based in Bangor and proud to serve the local community and surrounding areas.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Flexible Plans</h3>
            <p>Choose from one-off or monthly cleans.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Affordable Pricing</h3>
            <p>Starting from just £5 per bin. Transparent pricing with no hidden fees.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Fully Insured</h3>
            <p>You're covered. We’re fully licensed and insured for peace of mind.</p>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16 px-6 bg-zinc-900">
        <h2 className="text-3xl font-bold text-green-400 mb-8 text-center">Get in Touch</h2>
        <form className="max-w-xl mx-auto grid gap-4">
          <input type="text" placeholder="Your Name" className="p-3 rounded-lg bg-zinc-800 text-white placeholder-gray-400" />
          <input type="email" placeholder="Email Address" className="p-3 rounded-lg bg-zinc-800 text-white placeholder-gray-400" />
          <textarea rows="4" placeholder="Your Message" className="p-3 rounded-lg bg-zinc-800 text-white placeholder-gray-400" />
          <button className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl transition">Send Message</button>
        </form>
      </section>

      {/* Footer */}
      <footer className="bg-black text-center py-6 text-gray-400">
        <p>© 2025 Ni Bin Guy. All rights reserved.</p>
        <p>Bangor, BT20 5NF · 07555178484 · nibinguy@gmail.com - aabincleaning@gmail.com</p>
      </footer>
    </div>
  );
}
