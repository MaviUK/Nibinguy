import React from "react";

export default function NiBinGuyLandingPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center py-20 px-4 bg-gradient-to-b from-black via-green-900 to-black">
        <img
          src="/logo.png"
          alt="Ni Bin Guy Logo"
          className="w-40 h-40 mb-6"
        />
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          Bin Cleaning, <span className="text-green-400">Done Right</span>
        </h1>
        <p className="text-lg md:text-xl max-w-xl mb-6">
          Professional wheelie bin cleaning with a hazmat twist. Sparkling clean bins without the drama.
        </p>
        <button className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition">
          Book a Clean
        </button>
      </section>

      {/* Services Section */}
      <section className="py-16 px-6 bg-zinc-900">
        <h2 className="text-3xl font-bold text-green-400 mb-8 text-center">What We Do</h2>
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div className="bg-zinc-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-xl font-bold mb-2">Domestic Bins</h3>
            <p>We clean green, black, and blue bins right outside your home.</p>
          </div>
          <div className="bg-zinc-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-xl font-bold mb-2">Commercial Contracts</h3>
            <p>Need regular bin maintenance? We handle business waste too.</p>
          </div>
          <div className="bg-zinc-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-xl font-bold mb-2">Eco-Friendly Process</h3>
            <p>We use biodegradable products and minimal water waste.</p>
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="py-16 px-6 bg-black">
        <h2 className="text-3xl font-bold text-green-400 mb-8 text-center">Why Ni Bin Guy?</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-2">Local & Trusted</h3>
            <p>We're based in Bangor and proud to serve the local community.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Flexible Plans</h3>
            <p>Choose from one-off or monthly cleans. No contracts needed.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Affordable Pricing</h3>
            <p>Starting from just £3.50 per bin. Transparent pricing with no hidden fees.</p>
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
        <p>Bangor, BT20 5NF · 07555178484 · aabincleaning@gmail.com</p>
      </footer>
    </div>
  );
}
