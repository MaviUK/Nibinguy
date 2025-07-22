import React, { useState } from "react";
import CustomerPortalLoader from "./components/CustomerPortalLoader";

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

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Hero Section */}
      <section className="relative overflow-hidden flex flex-col items-center justify-center text-center pt-10 pb-20 px-4 bg-black">
        {/* ... your hero content ... */}
      </section>

      {/* WhatsApp & Email Booking Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50" onClick={() => setShowForm(false)}>
          {/* ... your modal content ... */}
        </div>
      )}

      {/* What We Do */}
      <section className="relative py-16 px-6 bg-[#18181b]">
        {/* ... your "What We Do" content ... */}
      </section>

      {/* Why Clean Your Bin */}
      <section className="py-16 px-6 bg-gradient-to-b from-black via-[#0a0a0a] to-zinc-900 text-white">
        {/* ... your "Why Clean" content ... */}
      </section>

      {/* Why Ni Bin Guy */}
      <section className="py-16 px-6 bg-gradient-to-b from-zinc-900 via-[#1a1a1a] to-black text-white">
        {/* ... your "Why Ni Bin Guy" content ... */}
      </section>

      {/* ✅ Customer Portal */}
      <CustomerPortalLoader />
    </div>
  );
}
