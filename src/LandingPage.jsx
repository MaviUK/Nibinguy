import React, { useState, useEffect, useRef } from "react";
import TenSecondChallenge from "./TenSecondChallenge.jsx"; // ← uses the metrics-enabled component

/* ───────────────── Google Places loader (shared) ───────────────── */
function loadGooglePlaces(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) return resolve(window.google);

    const existing = document.querySelector('script[data-gmaps]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', reject);
      return;
    }

    const s = document.createElement('script');
    s.dataset.gmaps = '1';
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.google);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   Terms of Service (inline modal + gating)
   ──────────────────────────────────────────────────────────────────────────── */
const TERMS_VERSION = "September 2025";
const TERMS_TITLE = "Ni Bin Guy – Terms of Service";
const TERMS_BODY = `
We keep our Terms of Service simple and transparent. By booking or receiving a bin clean from Ni Bin Guy, you agree to:

1) Service & Contracts
• Regular plans have a minimum 12-month term (unless agreed otherwise).
• One-off cleans have no minimum term.
• Each bin is a separate contract; adding a bin starts a new term for that bin.
• Contracts aren’t transferable without our agreement.

2) Bin Availability (8 AM rule)
• Put bins out or make them accessible by **8 AM** on the scheduled day.
• If your bin isn’t available and you haven’t told us **before 8 AM that day**, the clean **will still be charged**.
• We may still charge if access is blocked, refuse wasn’t collected, there’s excessive/unsafe waste, or conditions are unsafe.

3) Cleaning Process
• Inside & outside cleaned (where safe) using pressurised water and detergent.
• Some stains may take multiple visits or may not fully remove.
• Loosened waste may be bagged and left in your bin for disposal.
• Keep at least 5 m away during cleaning.

4) Payments
• Payment due within 7 days of each clean.
• Accepted: Direct Debit, Bank Transfer, Card (no cash).
• Cancelling a Direct Debit does **not** cancel service — give at least 48 hours’ notice to cancel.
• Overdue accounts may incur fees and be referred to collections.

5) Customer Responsibilities
• Keep contact & payment details up to date.
• Tell us in advance if your bin won’t be available.
• Zero tolerance for abuse toward staff (including online).

6) Other Terms
• We may place a small sticker/service tag on your bin.
• Discounts are discretionary; prices may change outside a fixed term.
• After the minimum term, plans continue on a rolling 30-day basis (30 days’ notice to cancel).

7) Data & Communication
• You consent to us storing your details and contacting you about your service.
• Text reminders are a courtesy; you’re responsible for knowing your schedule.
`;

export default function NiBinGuyLandingPage() {
  const [showForm, setShowForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);

  const [bins, setBins] = useState([{ type: "", count: 1, frequency: "4 Weekly (£5)" }]);

  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [placeId, setPlaceId] = useState(null);
  const selectedPlaceRef = useRef(null);
  const addressRef = useRef(null);

  const phoneNumber = "+447555178484";
  const phoneDisplay = "07555 178484";

  // Terms of Service gating state
  const [showTerms, setShowTerms] = useState(false);
  const [termsViewed, setTermsViewed] = useState(false);
  const [termsScrolledToEnd, setTermsScrolledToEnd] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const termsScrollRef = useRef(null);

  useEffect(() => {
    if (!showTerms) return;
    const el = termsScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
      if (atEnd) setTermsScrolledToEnd(true);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [showTerms]);

  const openTerms = () => { setShowTerms(true); setTermsViewed(true); };
  const canToggleAgree = termsViewed && termsScrolledToEnd;

  // Booking modal: attach Places
  useEffect(() => {
    if (!showForm) return;
    const key = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) return;

    let ac; let cleanup = () => {};
    loadGooglePlaces(key)
      .then((google) => {
        if (!addressRef.current) return;
        ac = new google.maps.places.Autocomplete(addressRef.current, {
          componentRestrictions: { country: ["gb"] },
          fields: ["place_id", "formatted_address", "address_components", "name", "geometry"],
          types: ["address"],
        });
        const listener = ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          selectedPlaceRef.current = place;
          setPlaceId(place.place_id || null);
          const formatted = place.formatted_address || place.name || "";
          setAddress(formatted);
        });
        cleanup = () => listener.remove();
      })
      .catch((e) => console.warn("Places failed to load (booking):", e));

    return () => cleanup();
  }, [showForm]);

  const missingFields = () =>
    (!name || !email || !address || !phone || bins.some((b) => !b.type));

  const TOS_PREFIX = `I confirm I’ve read and agree to the Ni Bin Guy Terms of Service (v${TERMS_VERSION})`;

  const handleSend = () => {
    if (missingFields()) { alert("Please complete all fields before sending."); return; }
    if (!agreeToTerms) { alert("Please view and agree to the Terms of Service before booking."); return; }
    const binDetails = bins
      .filter((b) => b.type !== "")
      .map((b) => `${b.count}x ${b.type.replace(" Bin", "")} (${b.frequency})`)
      .join("%0A");
    const message =
      `${encodeURIComponent(TOS_PREFIX)}%0A%0AHi my name is ${encodeURIComponent(name)}. I'd like to book a bin clean, please.` +
      `%0A${binDetails}%0AAddress: ${encodeURIComponent(address)}%0AEmail: ${encodeURIComponent(email)}%0APhone: ${encodeURIComponent(phone)}`;
    const url = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(url, "_blank");
    setShowForm(false);
  };

  const handleEmailSend = async () => {
    if (missingFields()) { alert("Please complete all fields before sending."); return; }
    if (!agreeToTerms) { alert("Please view and agree to the Terms of Service before booking."); return; }

    const loc = selectedPlaceRef.current?.geometry?.location;
    const lat = loc ? loc.lat() : null;
    const lng = loc ? loc.lng() : null;

    try {
      const res = await fetch("/.netlify/functions/sendBookingEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          address,
          bins,
          placeId,
          lat,
          lng,
          termsAccepted: true,
          termsVersion: TERMS_VERSION,
          termsAcceptanceText: TOS_PREFIX,
        }),
      });

      if (res.ok) {
        alert("Booking email sent successfully! (ToS acceptance included)");
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
    newBins[index][field] = field === "count" ? parseInt(value || 0, 10) : value;
    setBins(newBins);
  };

  const addBinRow = () => setBins([...bins, { type: "", count: 1, frequency: "4 Weekly (£5)" }]);

  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cMessage, setCMessage] = useState("");

  const handleContactWhatsApp = () => {
    if (!cName || !cEmail || !cPhone || !cMessage) {
      alert("Please complete all fields before sending.");
      return;
    }
    const msg =
      `Hi, I'm ${encodeURIComponent(cName)}.` +
      `%0APhone: ${encodeURIComponent(cPhone)}` +
      `%0AEmail: ${encodeURIComponent(cEmail)}` +
      `%0A%0AMessage:%0A${encodeURIComponent(cMessage)}`;
    window.open(`https://wa.me/${phoneNumber}?text=${msg}`, "_blank");
    setShowContactForm(false);
    setCName(""); setCEmail(""); setCPhone(""); setCMessage("");
  };

  const handleContactEmail = async () => {
    if (!cName || !cEmail || !cPhone || !cMessage) {
      alert("Please complete all fields before sending.");
      return;
    }
    try {
      const res = await fetch("/.netlify/functions/sendContactEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cName, email: cEmail, phone: cPhone, message: cMessage }),
      });
      if (res.ok) {
        alert("Your message has been sent!");
        setShowContactForm(false);
        setCName(""); setCEmail(""); setCPhone(""); setCMessage("");
      } else {
        alert("Failed to send your message.");
      }
    } catch (e) {
      console.error(e);
      alert("Error sending your message.");
    }
  };

  const handleCallClick = async () => {
    const isMobile = /Android|iPhone|iPad|iPod|Windows Phone|Mobi/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `tel:${phoneNumber}`;
    } else {
      try {
        await navigator.clipboard.writeText(phoneDisplay);
        alert(`Phone: ${phoneDisplay}\n(The number has been copied to your clipboard.)`);
      } catch {
        alert(`Phone: ${phoneDisplay}`);
      }
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
            Professional wheelie bin cleaning at your home, across
            <span className="text-green-400"> County Down.</span> Sparkling clean &amp; fresh smelling bins without any drama.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => { setShowForm(true); setAgreeToTerms(false); setTermsViewed(false); setTermsScrolledToEnd(false); }}
              className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition"
            >
              Book a Clean
            </button>
            <button
              onClick={() => setShowContactForm(true)}
              className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition"
            >
              Contact Us
            </button>
            <button
              onClick={() => setShowChallenge(true)}
              className="bg-[#9b111e] hover:bg-[#7f0e19] text-white font-bold py-3 px-6 rounded-xl shadow-lg transition focus:outline-none focus:ring-2 focus:ring-[#9b111e]/50 active:scale-[0.99]"
            >
              Free Bin Clean
            </button>
            <a href="#customer-portal" className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition text-center">
              Customer Portal
            </a>
          </div>
        </div>
      </section>

      {/* Booking Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 overflow-y-auto overscroll-contain z-50" onClick={() => setShowForm(false)}>
          <div className="min-h-[100svh] flex justify-center items-center p-4">
            <div
              className="bg-white text-black rounded-xl shadow-xl w-11/12 max-w-md overflow-auto relative"
              onClick={(e) => e.stopPropagation()}
              style={{ maxHeight: 'min(90dvh, 720px)' }}
            >
              <button onClick={() => setShowForm(false)} className="absolute top-3 right-4 text-gray-500 hover:text-red-500 text-2xl z-10">&times;</button>
              <div className="p-6 space-y-4">
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
                      <option value="4 Weekly (£5)">4 Weekly (£5)</option>
                      <option value="One-off (£12.50)">One-off (£12.50)</option>
                      <option value="Commercial <360L 4 Weekly (£5)">Commercial &lt;360L 4 Weekly (£5)</option>
                      <option value="Commercial <360L One-Off (£12.50)">Commercial &lt;360L One-Off (£12.50)</option>
                      <option value="Commercial >660L 4 Weekly (£12.50)">Commercial &gt;660L 4 Weekly (£12.50)</option>
                      <option value="Commercial >660L One-Off (£30)">Commercial &gt;660L One-Off (£30)</option>
                    </select>
                  </div>
                ))}

                <div className="flex items-center justify-between">
                  {bins.length > 1 ? (
                    <div className="flex items-center justify-between w-full">
                      <button onClick={addBinRow} className="text-sm text-green-600 hover:text-green-800 font-semibold">+ Add Another Bin</button>
                      <button onClick={() => setBins(bins.slice(0, -1))} className="text-sm text-red-600 hover:text-red-800 font-semibold">− Remove Last Bin</button>
                    </div>
                  ) : (
                    <button onClick={addBinRow} className="text-sm text-green-600 hover:text-green-800 font-semibold">+ Add Another Bin</button>
                  )}
                </div>

                <input
                  ref={addressRef}
                  type="text"
                  placeholder="Full Address"
                  value={address}
                  onChange={(e) => { setAddress(e.target.value); setPlaceId(null); selectedPlaceRef.current = null; }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-4"
                  autoComplete="off"
                  inputMode="text"
                />
                <p className="text-xs text-gray-500 -mt-2">Tip: pick from suggestions or just type your full address.</p>

                <input type="tel" placeholder="Contact Number" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-2" />
                <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-2" />

                {/* Terms of Service gating */}
                <div className="mt-4 p-3 rounded-lg border border-gray-300 bg-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-700">
                      You must view and agree to the <button type="button" onClick={openTerms} className="underline font-semibold">Terms of Service</button> to book.
                    </div>
                    <span className="text-[10px] text-gray-500">v{TERMS_VERSION}</span>
                  </div>
                  <div className="mt-3 flex items-start gap-2">
                    <input
                      id="agree"
                      type="checkbox"
                      className="mt-1"
                      checked={agreeToTerms}
                      disabled={!canToggleAgree}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                    />
                    <label htmlFor="agree" className="text-sm text-gray-800">
                      I’ve read and agree to the Terms of Service.
                      {!canToggleAgree && (
                        <span className="block text-xs text-gray-500">(Open the Terms and scroll to the bottom to enable this.)</span>
                      )}
                    </label>
                  </div>
                </div>

                <button onClick={handleSend} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg w-full disabled:opacity-60" disabled={!agreeToTerms}>
                  Send via WhatsApp
                </button>
                <button onClick={handleEmailSend} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg w-full disabled:opacity-60" disabled={!agreeToTerms}>
                  Send via Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-[60] bg-black/70" onClick={() => setShowTerms(false)}>
          <div className="min-h-[100svh] flex items-center justify-center p-3 sm:p-6">
            <div className="bg-white text-black w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden" onClick={(e)=>e.stopPropagation()}>
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-bold">{TERMS_TITLE} <span className="text-xs font-normal text-gray-500">(v{TERMS_VERSION})</span></h3>
                <button onClick={() => setShowTerms(false)} className="text-2xl leading-none text-gray-500 hover:text-black">&times;</button>
              </div>
              <div ref={termsScrollRef} className="px-6 py-4 max-h-[70dvh] overflow-y-auto whitespace-pre-line text-sm leading-6">
                {TERMS_BODY}
              </div>
              <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between gap-3">
                <div className="text-xs text-gray-600">Scroll to the end to enable agreement.</div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setShowTerms(false)} className="px-4 py-2 rounded-lg bg-neutral-200 hover:bg-neutral-300">
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAgreeToTerms(true); setShowTerms(false); }}
                    disabled={!termsScrolledToEnd}
                    className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-400"
                    aria-disabled={!termsScrolledToEnd}
                  >
                    Confirm &amp; Agree
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Us Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 overflow-y-auto overscroll-contain z-50" onClick={() => setShowContactForm(false)}>
          <div className="min-h-[100svh] flex justify-center items-center p-4">
            <div
              className="bg-white text-black rounded-xl shadow-xl w-11/12 max-w-md overflow-auto relative"
              onClick={(e) => e.stopPropagation()}
              style={{ maxHeight: 'min(90dvh, 720px)' }}
            >
              <button onClick={() => setShowContactForm(false)} className="absolute top-3 right-4 text-gray-500 hover:text-red-500 text-2xl z-10">&times;</button>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <h2 className="text-2xl font-bold text-center">Contact Us</h2>
                  <button onClick={handleCallClick} className="ml-2 p-2 rounded-full bg-green-100 hover:bg-green-200 focus:outline-none" aria-label="Call us" title="Call us">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.684l1.1 3.3a1 1 0 01-.27 1.06l-1.6 1.6a16 16 0 007.18 7.18l1.6-1.6a1 1 0 011.06-.27l3.3 1.1a1 1 0 01.684.95V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </button>
                </div>

                <input type="text" placeholder="Your Name" value={cName} onChange={(e) => setCName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                <input type="tel" placeholder="Contact Number" value={cPhone} onChange={(e) => setCPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                <input type="email" placeholder="Email Address" value={cEmail} onChange={(e) => setCEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                <textarea placeholder="Your Message" value={cMessage} onChange={(e) => setCMessage(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 h-28 resize-y" />

                <button onClick={handleContactWhatsApp} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg w-full">Send via WhatsApp</button>
                <button onClick={handleContactEmail} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg w-full">Send via Email</button>
                <p className="text-center text-sm text-gray-600 mt-2">Prefer to call? Tap the phone icon.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10-Second Challenge Modal — uses imported component */}
      {showChallenge && (
        <div
          className="fixed inset-0 bg-black/80 overflow-y-auto overscroll-contain z-50"
          onClick={() => setShowChallenge(false)}
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="min-h-[100svh] flex items-center justify-center p-3 sm:p-6">
            <div
              className="bg-neutral-900 text-white w-11/12 max-w-3xl rounded-2xl shadow-2xl border border-neutral-800 p-4 md:p-6 relative overflow-auto"
              onClick={(e) => e.stopPropagation()}
              style={{ maxHeight: 'min(90dvh, 820px)' }}
            >
              <button onClick={() => setShowChallenge(false)} className="absolute top-3 right-4 text-neutral-400 hover:text-white text-2xl" aria-label="Close">
                &times;
              </button>
              <TenSecondChallenge />
            </div>
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

      {/* The Process */}
      <section id="the-process" className="relative py-16 px-6 bg-[#18181b] text-white">
        <h2 className="text-3xl font-bold text-green-400 mb-10 text-center">The Process</h2>
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <div className="rounded-2xl bg-zinc-800/70 border border-white/10 p-6">
            <h3 className="text-xl font-bold">The Booking Process</h3>
            <ol className="mt-6 space-y-5">
              <li className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-400/50 bg-green-500/10 text-sm font-semibold text-green-300">1</span>
                <p>Complete the quick booking form.</p>
              </li>
              <li className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-400/50 bg-green-500/10 text-sm font-semibold text-green-300">2</span>
                <p>We’ll reply with your price and the next clean date (right after your bin collection).</p>
              </li>
              <li className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-400/50 bg-green-500/10 text-sm font-semibold text-green-300">3</span>
                <p>Approve the quote to secure your spot in the schedule.</p>
              </li>
              <li className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-400/50 bg-green-500/10 text-sm font-semibold text-green-300">4</span>
                <p>You’ll receive an email to set up your payment method.</p>
              </li>
            </ol>
          </div>

          <div className="rounded-2xl bg-zinc-800/70 border border-white/10 p-6">
            <h3 className="text-xl font-bold">The Cleaning Process</h3>
            <ol className="mt-6 space-y-5">
              <li className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-400/50 bg-green-500/10 text-sm font-semibold text-green-300">1</span>
                <p>We remove any leftover waste the bin crew missed.</p>
              </li>
              <li className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-400/50 bg-green-500/10 text-sm font-semibold text-green-300">2</span>
                <p>Thorough wash and rinse — inside and out.</p>
              </li>
              <li className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-400/50 bg-green-500/10 text-sm font-semibold text-green-300">3</span>
                <p>We dry the interior to prevent residue.</p>
              </li>
              <li className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-400/50 bg-green-500/10 text-sm font-semibold text-green-300">4</span>
                <p>Sanitise and deodorise for a fresh finish.</p>
              </li>
              <li className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-400/50 bg-green-500/10 text-sm font-semibold text-green-300">5</span>
                <p>Your bin is returned clean and fresh to its usual spot.</p>
              </li>
            </ol>
          </div>
        </div>

        <div className="mt-12 text-center">
          <button onClick={() => setShowForm(true)} className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition">
            Book a Clean
          </button>
        </div>
      </section>

      {/* The Bins We Clean */}
      <section className="relative py-16 px-6 bg-[#18181b] text-white text-center">
        <h2 className="text-3xl font-bold text-green-400 mb-12">The Bins We Clean</h2>
        <div className="relative z-20 flex flex-wrap justify-center items-end gap-12 md:gap-20">
          <div className="flex flex-col items-center">
            <img src="/bins/120L.png" alt="120L Bin" className="h-32 mb-2" />
            <span className="text-sm">120L</span>
          </div>
          <div className="flex flex-col items-center">
            <img src="/bins/240L.png" alt="240L Bin" className="h-36 mb-2" />
            <span className="text-sm">240L</span>
          </div>
          <div className="flex flex-col items-center">
            <img src="/bins/360L.png" alt="360L Bin" className="h-40 mb-2" />
            <span className="text-sm">360L</span>
          </div>
          <div className="flex flex-col items-center">
            <img src="/bins/660L.png" alt="660L Bin" className="h-44 mb-2" />
            <span className="text-sm">660L</span>
          </div>
          <div className="flex flex-col items-center">
            <img src="/bins/1100L.png" alt="1100L Bin" className="h-48 mb-2" />
            <span className="text-sm">1100L</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-b from-[#18181b] to-black pointer-events-none z-10" />
      </section>

      {/* Why Clean Your Bin */}
      <section className="py-16 px-6 bg-gradient-to-b from-black via-[#0a0a0a] to-zinc-900 text-white">
        <h2 className="text-3xl font-bold text-green-400 mb-12 text-center">Why Clean Your Bin?</h2>
        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <div className="flex items-start gap-4">
            <img src="/odour.png" alt="Odours icon" className="w-12 h-12 mt-1" />
            <div>
              <h3 className="text-xl font-semibold mb-1">Prevent Nasty Odours</h3>
              <p className="text-gray-300">Bins can start to smell unpleasant fast. Regular cleaning eliminates those foul smells at the source.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <img src="/bacteria.png" alt="Bacteria icon" className="w-12 h-12 mt-1" />
            <div>
              <h3 className="text-xl font-semibold mb-1">Stop Bacteria Buildup</h3>
              <p className="text-gray-300">Leftover waste can attract harmful bacteria. Professional bin cleaning keeps your environment safer and more hygienic.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <img src="/pests.png" alt="Pests icon" className="w-12 h-12 mt-1" />
            <div>
              <h3 className="text-xl font-semibold mb-1">Deter Insects &amp; Vermin</h3>
              <p className="text-gray-300">Flies, maggots, and rodents are drawn to dirty bins. Keep them away by keeping your bin spotless.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <img src="/family.png" alt="Family icon" className="w-12 h-12 mt-1" />
            <div>
              <h3 className="text-xl font-semibold mb-1">Protect Your Family</h3>
              <p className="text-gray-300">A clean bin reduces exposure to germs and pathogens, helping keep your household healthier.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Ni Bin Guy */}
      <section className="py-16 px-6 bg-gradient-to-b from-zinc-900 via-[#1a1a1a] to-black text-white">
        <h2 className="text-3xl font-bold text-green-400 mb-8 text-center">Why Ni Bin Guy?</h2>
        <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
          <div>
            <h3 className="text-xl font-semibold mb-2">Local &amp; Trusted</h3>
            <p>We’re based in Bangor and proud to serve County Down residents with care.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Flexible Plans</h3>
            <p>Whether you want a one-off clean or recurring service, we’ve got options.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Affordable Pricing</h3>
            <p>From just £5 per bin — clear pricing with no surprises.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Fully Insured</h3>
            <p>We’re fully insured and compliant — so you can rest easy.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
