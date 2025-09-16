import React, { useState, useEffect, useRef, useMemo } from "react";

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

/* ───────────────── TenSecondChallenge (inline) ───────────────── */
function getTodayKey() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const parts = Object.fromEntries(fmt.map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function computeCentiseconds(startMs, stopMs) {
  return Math.round((stopMs - startMs) / 10);
}

function TenSecondChallenge({ debug = false, autoWin = false }) {
  const [elapsedCs, setElapsedCs] = useState(0);
  const [running, setRunning] = useState(false);
  const [hasTriedToday, setHasTriedToday] = useState(false);
  const [alreadyClaimedToday, setAlreadyClaimedToday] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showWinModal, setShowWinModal] = useState(false);

  // Winner form (no bin count control — prize is 1 bin)
  const [form, setForm] = useState({
    binType: "Black Bin", // default so user can submit immediately
    name: "",
    email: "",
    phone: "",
    address: "",
    preferred_date: "",
  });
  const [winSubmitStatus, setWinSubmitStatus] = useState("idle"); // idle | sending | success | error
  const [winSubmitErrorText, setWinSubmitErrorText] = useState("");

  // Google Places for winner form
  const winAddressRef = useRef(null);
  const winSelectedPlaceRef = useRef(null);
  const [winPlaceId, setWinPlaceId] = useState(null);

  const rafRef = useRef(null);
  const startRef = useRef(0);
  const todayKey = useMemo(() => getTodayKey(), []);

  useEffect(() => {
    const tried = typeof window !== "undefined" ? localStorage.getItem(`tensec_try_${todayKey}`) : null;
    const win = typeof window !== "undefined" ? localStorage.getItem(`tensec_winner_${todayKey}`) : null;
    setHasTriedToday(!!tried);
    setAlreadyClaimedToday(!!win);
  }, [todayKey]);

  // Spacebar: don't toggle when typing or when winner modal is open
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code !== "Space") return;

      const t = e.target;
      const isTyping =
        t?.tagName === "INPUT" ||
        t?.tagName === "TEXTAREA" ||
        t?.isContentEditable;

      if (isTyping || showWinModal) return; // let space be typed / or ignore under modal
      e.preventDefault();
      handleStartStop();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, hasTriedToday, alreadyClaimedToday, showWinModal, autoWin]);

  function tick(now) {
    const cs = computeCentiseconds(startRef.current, now);
    setElapsedCs(cs);
    rafRef.current = requestAnimationFrame(tick);
  }

  function handleStartStop() {
    if (!autoWin && (hasTriedToday || alreadyClaimedToday)) return;

    if (!running) {
      setError("");
      setMessage("");
      setElapsedCs(0);
      startRef.current = performance.now();
      setRunning(true);
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const rawFinalCs = computeCentiseconds(startRef.current, performance.now());
      const finalCs = autoWin ? 1000 : rawFinalCs;
      setElapsedCs(finalCs);
      setRunning(false);

      if (typeof window !== "undefined") localStorage.setItem(`tensec_try_${todayKey}`, "1");
      setHasTriedToday(true);

      if (autoWin || finalCs === 1000) {
        if (typeof window !== "undefined") localStorage.setItem(`tensec_winner_${todayKey}`, "1");
        setShowWinModal(true);
        setMessage("You nailed 10.00 seconds! 🎉");
        setAlreadyClaimedToday(true);
      } else {
        setMessage("So close! Try again tomorrow.");
      }
    }
  }

  // Attach Places to the winner address when modal opens (falls back to manual entry if no API key)
  useEffect(() => {
    if (!showWinModal) return;
    const key = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) return;

    let ac; let cleanup = () => {};
    loadGooglePlaces(key)
      .then((google) => {
        if (!winAddressRef.current) return;
        ac = new google.maps.places.Autocomplete(winAddressRef.current, {
          componentRestrictions: { country: ["gb"] },
          fields: ["place_id", "formatted_address", "address_components", "name", "geometry"],
          types: ["address"],
        });
        const listener = ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          winSelectedPlaceRef.current = place;
          setWinPlaceId(place.place_id || null);
          const formatted = place.formatted_address || place.name || "";
          setForm((f) => ({ ...f, address: formatted }));
        });
        cleanup = () => listener.remove();
      })
      .catch((e) => console.warn("Places failed to load (winner):", e));

    return () => cleanup();
  }, [showWinModal]);

  async function submitBooking(e) {
  e.preventDefault();

  if (!form.name || !form.email || !form.phone || !form.address || !form.binType) {
    setError("Please complete all required fields.");
    return;
  }

  setError("");
  setWinSubmitStatus("sending");

  const loc = winSelectedPlaceRef.current?.geometry?.location;
  const lat = loc ? loc.lat() : null;
  const lng = loc ? loc.lng() : null;

  // EXACTLY match the booking payload shape
  const payload = {
    name: form.name,
    email: form.email,
    phone: form.phone,
    address: form.address,
    bins: [{ type: form.binType, count: 1, frequency: "Prize (Free Clean)" }],
    placeId: winPlaceId,
    lat,
    lng,
    source: "ten-second-challenge",
  };

  try {
    const res = await fetch("/.netlify/functions/sendBookingEmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Read body either way so we can show useful info
    const text = await res.text().catch(() => "");
    if (res.ok) {
      setWinSubmitStatus("success");
      // Optional: audible/visible cue so you 100% see it during testing
      alert("Winner details submitted. Confirmation email sent.");
    } else {
      console.error("Winner email failed:", res.status, text);
      setError("We couldn't send the email. Please try again or contact us.");
      setWinSubmitStatus("error");
    }
  } catch (err) {
    console.error(err);
    setError("Network error sending the email. Please try again.");
    setWinSubmitStatus("error");
  }
}

  const seconds = (elapsedCs / 100).toFixed(2);

  // tiny dev checks
  useEffect(() => {
    if (!debug) return;
    const cases = [
      { start: 0, stop: 10000, expect: 1000 },
      { start: 0, stop: 9999, expect: 1000 },
      { start: 0, stop: 10005, expect: 1001 },
      { start: 42, stop: 1042, expect: 100 },
    ];
    console.table(cases.map((c) => ({ ...c, got: computeCentiseconds(c.start, c.stop), pass: computeCentiseconds(c.start, c.stop) === c.expect })));
  }, [debug]);

  return (
    <div className="w-full max-w-3xl mx-auto p-4" data-testid="ten-sec-root">
      <div className="bg-neutral-900 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-neutral-800">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl md:text-3xl font-bold">10-Second Stop Watch Challenge</h2>
          <div className="text-xs opacity-80">One try per device · Europe/London</div>
        </div>

        {autoWin && (
          <div className="mt-3 bg-amber-900/30 border border-amber-700 text-amber-200 text-xs px-3 py-2 rounded-lg" data-testid="test-mode">
            Testing mode is <strong>ON</strong>: stopping the timer will count as a win and display 10.00s.
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Display */}
          <div className="flex flex-col items-center justify-center bg-black/40 rounded-2xl p-8 border border-neutral-800">
            <div className="text-sm uppercase tracking-widest opacity-70">Target</div>
            <div className="text-5xl md:text-6xl font-extrabold">10.00s</div>

            <div className="mt-6 text-sm uppercase tracking-widest opacity-70">Your Time</div>
            <div className={`text-6xl md:text-7xl font-mono tabular-nums ${seconds === "10.00" ? "text-emerald-400" : ""}`} data-testid="time-display">
              {seconds}s
            </div>

            <div className="mt-6 text-xs text-center opacity-70">
              Press <span className="font-semibold">Space</span> (desktop) or use the <span className="font-semibold">Start/Stop</span> button.
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4">
            {autoWin ? (
              <div className="bg-emerald-900/30 border border-emerald-800 text-emerald-200 p-4 rounded-xl">
                Testing mode: the daily lock is bypassed and you'll win on Stop.
              </div>
            ) : alreadyClaimedToday ? (
              <div className="bg-red-900/30 border border-red-800 text-red-200 p-4 rounded-xl" data-testid="already-claimed">
                Today's prize has been claimed on this device. Come back tomorrow!
              </div>
            ) : hasTriedToday ? (
              <div className="bg-amber-900/30 border border-amber-800 text-amber-200 p-4 rounded-xl" data-testid="tried-today">
                You've used your attempt for {todayKey} on this device. Try again tomorrow.
              </div>
            ) : (
              <div className="bg-emerald-900/30 border border-emerald-800 text-emerald-200 p-4 rounded-xl" data-testid="ready">
                Ready when you are — hit Space or click the big button below.
              </div>
            )}

            <button
              onClick={handleStartStop}
              disabled={!autoWin && (hasTriedToday || alreadyClaimedToday)}
              className={`w-full rounded-2xl py-6 text-xl font-semibold shadow-lg border transition active:scale-[0.99]
                ${running ? "bg-rose-600 hover:bg-rose-500 border-rose-400" : "bg-emerald-600 hover:bg-emerald-500 border-emerald-400"}
                ${!autoWin && (hasTriedToday || alreadyClaimedToday) ? "opacity-50 cursor-not-allowed" : ""}`}
              data-testid="start-stop"
            >
              {running ? "Stop" : "Start"}
            </button>

            {message && <div className="text-emerald-300 text-sm" data-testid="message">{message}</div>}
            {error && <div className="text-red-300 text-sm" data-testid="error">{error}</div>}

            <p className="text-xs opacity-60">
              Accuracy uses centiseconds. A win requires your displayed time to read exactly <span className="font-semibold">10.00s</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Winner Booking Modal */}
      {showWinModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white text-black w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            {/* Success screen */}
            {winSubmitStatus === "success" ? (
              <div className="p-6">
                <h3 className="text-xl font-bold">You're all set! 🎉</h3>
                <p className="text-sm text-neutral-700 mt-2">
                  Thanks, {form.name}. We’ve received your winner details and sent a confirmation to <strong>{form.email}</strong>.
                  We’ll be in touch to schedule your free clean.
                </p>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => { setShowWinModal(false); setMessage("Thanks! We'll be in touch to confirm your clean."); }}
                    className="px-5 py-3 rounded-xl bg-black text-white hover:opacity-90"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-6 border-b">
                  <h3 className="text-xl font-bold">You're a winner! 🎉</h3>
                  <p className="text-sm text-neutral-600 mt-1">
                    Fill this in to book your free clean for {todayKey}’s challenge.
                  </p>
                </div>
                <form onSubmit={submitBooking} className="p-6 flex flex-col gap-4" noValidate>
                  {/* Bin type (required). Prize is fixed to 1 bin. */}
                  <select
                    required
                    className="input"
                    value={form.binType}
                    onChange={(e)=>setForm(f=>({...f,binType:e.target.value}))}
                  >
                    <option value="Black Bin">Black</option>
                    <option value="Brown Bin">Brown</option>
                    <option value="Green Bin">Green</option>
                    <option value="Blue Bin">Blue</option>
                  </select>
                  <div className="text-sm text-neutral-600 -mt-2">
                    Prize: <span className="font-semibold">1 bin</span> clean
                  </div>

                  <input required className="input" placeholder="Full name" value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))}/>
                  <input required type="email" className="input" placeholder="Email" value={form.email} onChange={(e)=>setForm(f=>({...f,email:e.target.value}))}/>
                  <input required className="input" placeholder="Phone" value={form.phone} onChange={(e)=>setForm(f=>({...f,phone:e.target.value}))}/>

                  {/* Address with Google Places Autocomplete */}
                  <input
                    ref={winAddressRef}
                    required
                    className="input"
                    placeholder="Address"
                    value={form.address}
                    onChange={(e)=>{
                      const v = e.target.value;
                      setForm(f=>({...f,address:v}));
                      setWinPlaceId(null);
                      winSelectedPlaceRef.current = null;
                    }}
                    autoComplete="off"
                    inputMode="text"
                  />

                  <label className="text-sm">Preferred cleaning date (optional)</label>
                  <input type="date" className="input" value={form.preferred_date} onChange={(e)=>setForm(f=>({...f,preferred_date:e.target.value}))}/>

                  {error && (
                    <div className="text-red-600 text-sm">
                      {error}
                      {winSubmitStatus === "error" && winSubmitErrorText ? (
                        <div className="mt-1 text-xs opacity-80">Details: {winSubmitErrorText}</div>
                      ) : null}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={winSubmitStatus === "sending"}
                      aria-busy={winSubmitStatus === "sending"}
                      className="flex-1 bg-black text-white rounded-xl py-3 font-semibold hover:opacity-90 active:opacity-80 disabled:opacity-60"
                    >
                      {winSubmitStatus === "sending" ? "Submitting..." : "Submit"}
                    </button>
                    <button type="button" onClick={()=>setShowWinModal(false)} className="px-4 py-3 rounded-xl bg-neutral-200 hover:bg-neutral-300">Close</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        .input { @apply w-full rounded-xl border border-neutral-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500; }
      `}</style>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Landing page
   ──────────────────────────────────────────────────────────────────────────── */
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

  const handleSend = () => {
    if (!name || !email || !address || !phone || bins.some((b) => !b.type)) {
      alert("Please complete all fields before sending.");
      return;
    }
    const binDetails = bins
      .filter((b) => b.type !== "")
      .map((b) => `${b.count}x ${b.type.replace(" Bin", "")} (${b.frequency})`)
      .join("%0A");

    const message = `Hi my name is ${encodeURIComponent(name)}. I'd like to book a bin clean, please.%0A${binDetails}%0AAddress: ${encodeURIComponent(address)}%0AEmail: ${encodeURIComponent(email)}%0APhone: ${encodeURIComponent(phone)}`;

    const url = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(url, "_blank");
    setShowForm(false);
  };

  const handleEmailSend = async () => {
    if (!name || !email || !address || !phone || bins.some((b) => !b.type)) {
      alert("Please complete all fields before sending.");
      return;
    }
    const loc = selectedPlaceRef.current?.geometry?.location;
    const lat = loc ? loc.lat() : null;
    const lng = loc ? loc.lng() : null;

    try {
      const res = await fetch("/.netlify/functions/sendBookingEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, address, bins, placeId, lat, lng }),
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
    const msg = `Hi, I'm ${encodeURIComponent(cName)}.%0APhone: ${encodeURIComponent(cPhone)}%0AEmail: ${encodeURIComponent(cEmail)}%0A%0AMessage:%0A${encodeURIComponent(cMessage)}`;
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

          <h1 className="text-4xl md:text-6xl font-bold">Bin Cleaning, <span className="text-green-400">Done Right</span></h1>

          <p className="text-lg md:text-xl max-w-xl mt-4 text-center">
            Professional wheelie bin cleaning at your home, across
            <span className="text-green-400"> County Down.</span> Sparkling clean &amp; fresh smelling bins without any drama.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button onClick={() => setShowForm(true)} className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition">Book a Clean</button>
            <button onClick={() => setShowContactForm(true)} className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition">Contact Us</button>
            <button onClick={() => setShowChallenge(true)} className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition">10-Second Challenge</button>
            <a href="#customer-portal" className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition text-center">Customer Portal</a>
          </div>
        </div>
      </section>

      {/* Booking Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white text-black rounded-xl shadow-xl w-11/12 max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowForm(false)} className="sticky top-2 right-4 text-gray-500 hover:text-red-500 text-xl float-right z-10">&times;</button>
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

            <input ref={addressRef} type="text" placeholder="Full Address" value={address} onChange={(e) => { setAddress(e.target.value); setPlaceId(null); selectedPlaceRef.current = null; }} className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-4" autoComplete="off" inputMode="text" />
            <p className="text-xs text-gray-500 -mt-2">Tip: pick from suggestions or just type your full address.</p>

            <input type="tel" placeholder="Contact Number" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-2" />
            <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-2" />

            <button onClick={handleSend} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg w-full">Send via WhatsApp</button>
            <button onClick={handleEmailSend} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg w-full">Send via Email</button>
          </div>
        </div>
      )}

      {/* Contact Us Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50" onClick={() => setShowContactForm(false)}>
          <div className="bg-white text-black rounded-xl shadow-xl w-11/12 max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowContactForm(false)} className="sticky top-2 right-4 text-gray-500 hover:text-red-500 text-xl float-right z-10">&times;</button>
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
      )}

      {/* 10-Second Challenge Modal */}
      {showChallenge && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowChallenge(false)}>
          <div className="bg-neutral-900 text-white w-11/12 max-w-3xl rounded-2xl shadow-2xl border border-neutral-800 p-4 md:p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowChallenge(false)} className="absolute top-3 right-4 text-neutral-400 hover:text-white text-2xl" aria-label="Close">&times;</button>
            {/* autoWin ON so you can test the win flow end-to-end */}
            <TenSecondChallenge autowin/>
          </div>
        </div>
      )}

      {/* What We Do / The Process / etc … */}
      {/* (unchanged sections omitted for brevity) */}
    </div>
  );
}
