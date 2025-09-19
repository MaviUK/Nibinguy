import React, { useEffect, useMemo, useRef, useState } from "react";

/* =========================
   Time + Utility Functions
   ========================= */
const TZ = "Europe/London";
// How many attempts per device per day
const CHANCES_PER_DAY = 10; // ← change this number to whatever you want

// Round to nearest centisecond between two high-res timestamps (ms)
function computeCentiseconds(startMs, stopMs) {
  const deltaMs = Math.max(0, stopMs - startMs);
  return Math.round(deltaMs / 10); // 9,999ms -> 1000 cs; 10,005ms -> 1001 cs
}

// Today key in Europe/London, e.g. "2025-09-19"
function getTodayKey() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const parts = Object.fromEntries(fmt.map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// Lazy-load Google Places if not available yet
let googleLoaderPromise = null;
function loadGooglePlaces(apiKey) {
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (!googleLoaderPromise) {
    googleLoaderPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        apiKey
      )}&libraries=places`;
      s.async = true;
      s.onerror = () => reject(new Error("Failed to load Google Maps JS"));
      s.onload = () => {
        if (window.google?.maps?.places) resolve(window.google);
        else reject(new Error("Google Maps Places not available"));
      };
      document.head.appendChild(s);
    });
  }
  return googleLoaderPromise;
}

/* =========================
   Metrics (Netlify Function)
   ========================= */
// fire-and-forget; don’t block UI if it fails
async function postMetric(kind) {
  try {
    const res = await fetch("/.netlify/functions/tensec-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    await res.text();
  } catch {}
}

/* =========================
   Component
   ========================= */
export default function TenSecondChallenge({ debug = false, autoWin = false }) {
  const [elapsedCs, setElapsedCs] = useState(0);
  const [running, setRunning] = useState(false);

  // NEW: counter-based daily attempts
  const [triesToday, setTriesToday] = useState(0);
  const outOfTries = !autoWin && triesToday >= CHANCES_PER_DAY;
  const remainingTries = Math.max(0, CHANCES_PER_DAY - triesToday);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showWinModal, setShowWinModal] = useState(false);

  // Winner form (prize is 1 bin)
  const [form, setForm] = useState({
    binType: "Black Bin",
    name: "",
    email: "",
    phone: "",
    address: "",
    preferred_date: "",
  });
  const [winSubmitStatus, setWinSubmitStatus] = useState("idle"); // idle | sending | success | error
  const [winSubmitErrorText, setWinSubmitErrorText] = useState("");

  // Places refs
  const winAddressRef = useRef(null);
  const winSelectedPlaceRef = useRef(null);
  const [winPlaceId, setWinPlaceId] = useState(null);

  const rafRef = useRef(null);
  const startRef = useRef(0);
  const todayKey = useMemo(() => getTodayKey(), []);

  // Load today's try count
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(`tensec_tries_${todayKey}`);
    setTriesToday(raw ? parseInt(raw, 10) || 0 : 0);
  }, [todayKey]);

  // Spacebar: ignore while typing or when modal open
  useEffect(() => {
    const onKeyDown = (e) => {
      const isSpace =
        e.code === "Space" || e.key === " " || e.key === "Spacebar";
      if (!isSpace) return;
      const t = e.target;
      const isTyping =
        t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.isContentEditable;
      if (isTyping || showWinModal) return;
      e.preventDefault();
      handleStartStop();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, triesToday, showWinModal, autoWin]);

  function tick(now) {
    const cs = computeCentiseconds(startRef.current, now);
    setElapsedCs(cs);
    rafRef.current = requestAnimationFrame(tick);
  }

  function handleStartStop() {
    if (outOfTries) return;

    if (!running) {
      // START: record an attempt metric (optional)
      if (!autoWin) postMetric("attempt");
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

      // INCREMENT today's tries
      if (typeof window !== "undefined") {
        const newTries = triesToday + 1;
        localStorage.setItem(`tensec_tries_${todayKey}`, String(newTries));
        setTriesToday(newTries);
      }

      if (finalCs === 1000) {
        if (!autoWin) postMetric("win");
        setShowWinModal(true);
        setMessage("You nailed 10.00 seconds! 🎉");
      } else {
        const left = Math.max(0, CHANCES_PER_DAY - (triesToday + 1));
        setMessage(
          left > 0
            ? `So close! ${left} attempt${left === 1 ? "" : "s"} left today.`
            : "So close! That's your last attempt today — try again tomorrow."
        );
      }
    }
  }

  // Attach Places inside the winner modal
  useEffect(() => {
    if (!showWinModal) return;
    const key = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) return;

    let ac;
    let cleanup = () => {};
    loadGooglePlaces(key)
      .then((google) => {
        if (!winAddressRef.current) return;
        ac = new google.maps.places.Autocomplete(winAddressRef.current, {
          componentRestrictions: { country: ["gb"] },
          fields: [
            "place_id",
            "formatted_address",
            "address_components",
            "name",
            "geometry",
          ],
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
      .catch(() => {});
    return () => cleanup();
  }, [showWinModal]);

  async function submitBooking(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.address || !form.binType) {
      setError("Please complete all required fields.");
      return;
    }

    setError("");
    setWinSubmitErrorText("");
    setWinSubmitStatus("sending");

    const loc = winSelectedPlaceRef.current?.geometry?.location;
    const lat = loc ? loc.lat() : null;
    const lng = loc ? loc.lng() : null;

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
      preferred_date: form.preferred_date || null,
    };

    try {
      const res = await fetch("/.netlify/functions/sendBookingEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text().catch(() => "");
      if (res.ok) {
        setWinSubmitStatus("success");
        alert("Winner details submitted. Confirmation email sent.");
      } else {
        setWinSubmitStatus("error");
        setError("We couldn't send the email. Please try again or contact us.");
        setWinSubmitErrorText(text || "");
      }
    } catch (err) {
      setWinSubmitStatus("error");
      setError("Network error sending the email. Please try again.");
    }
  }

  const seconds = (elapsedCs / 100).toFixed(2);

  // (Optional) debug check
  useEffect(() => {
    if (!debug) return;
    const cases = [
      { start: 0, stop: 10000, expect: 1000 },
      { start: 0, stop: 9999, expect: 1000 },
      { start: 0, stop: 10005, expect: 1001 },
      { start: 42, stop: 1042, expect: 100 },
    ];
    // eslint-disable-next-line no-console
    console.table(
      cases.map((c) => ({
        ...c,
        got: computeCentiseconds(c.start, c.stop),
        pass: computeCentiseconds(c.start, c.stop) === c.expect,
      }))
    );
  }, [debug]);

  return (
    <div className="w-full max-w-3xl mx-auto p-4" data-testid="ten-sec-root">
      <div className="bg-neutral-900 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-neutral-800">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">
              10-Second Stop Watch Challenge
            </h2>
            <p className="text-xs md:text-sm opacity-80">
              Stop the timer on exactly <strong>10.00s</strong> to win a free bin clean.
            </p>
          </div>
          <div className="text-xs opacity-80 text-right">
            {CHANCES_PER_DAY === 1
              ? "1 try per device · Europe/London"
              : `${CHANCES_PER_DAY} tries per device · Europe/London`}
          </div>
        </div>

        {autoWin && (
          <div className="mt-3 bg-amber-900/30 border border-amber-700 text-amber-200 text-xs px-3 py-2 rounded-lg">
            Testing mode is <strong>ON</strong>: stopping the timer will count as a win and display 10.00s.
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Display */}
          <div className="flex flex-col items-center justify-center bg-black/40 rounded-2xl p-8 border border-neutral-800">
            <div className="text-sm uppercase tracking-widest opacity-70">Target</div>
            <div className="text-5xl md:text-6xl font-extrabold">10.00s</div>

            <div className="mt-6 text-sm uppercase tracking-widest opacity-70">Your Time</div>
            <div className={`text-6xl md:text-7xl font-mono tabular-nums ${seconds === "10.00" ? "text-emerald-400" : ""}`}>
              {seconds}s
            </div>

            <div className="mt-6 text-xs text-center opacity-70">
              Press <span className="font-semibold">Space</span> (desktop) or use the <span className="font-semibold">Start/Stop</span> button.
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4">
            {outOfTries ? (
              <div className="bg-amber-900/30 border border-amber-800 text-amber-200 p-4 rounded-xl">
                You’ve used your {CHANCES_PER_DAY === 1 ? "attempt" : `${CHANCES_PER_DAY} attempts`} for {todayKey}. Come back tomorrow!
              </div>
            ) : (
              <div className="bg-emerald-900/30 border border-emerald-800 text-emerald-200 p-4 rounded-xl">
                Ready when you are — hit Space or click the big button below.
                <div className="mt-1 text-emerald-300/80 text-xs">
                  {remainingTries} attempt{remainingTries === 1 ? "" : "s"} left today.
                </div>
              </div>
            )}

            <button
              onClick={handleStartStop}
              disabled={outOfTries}
              className={`w-full rounded-2xl py-6 text-xl font-semibold shadow-lg border transition active:scale-[0.99]
                ${running ? "bg-rose-600 hover:bg-rose-500 border-rose-400" : "bg-emerald-600 hover:bg-emerald-500 border-emerald-400"}
                ${outOfTries ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {running ? "Stop" : "Start"}
            </button>

            {message && <div className="text-emerald-300 text-sm">{message}</div>}
            {error && <div className="text-red-300 text-sm">{error}</div>}

            <p className="text-xs opacity-60">
              Accuracy uses centiseconds. A win requires your displayed time to read exactly <span className="font-semibold">10.00s</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Winner Booking Modal */}
      {showWinModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white text-black w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
            {winSubmitStatus === "success" ? (
              <div className="p-6">
                <h3 className="text-xl font-bold">You're all set! 🎉</h3>
                <p className="text-sm text-neutral-700 mt-2">
                  Thanks, {form.name}. We’ve received your winner details and sent a confirmation to <strong>{form.email}</strong>. We’ll be in touch to schedule your free clean.
                </p>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setShowWinModal(false);
                      setMessage("Thanks! We'll be in touch to confirm your clean.");
                    }}
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
                  <select
                    required
                    className="input"
                    value={form.binType}
                    onChange={(e) => setForm((f) => ({ ...f, binType: e.target.value }))}
                  >
                    <option value="Black Bin">Black</option>
                    <option value="Brown Bin">Brown</option>
                    <option value="Green Bin">Green</option>
                    <option value="Blue Bin">Blue</option>
                  </select>
                  <div className="text-sm text-neutral-600 -mt-2">
                    Prize: <span className="font-semibold">1 bin</span> clean
                  </div>

                  <input required className="input" placeholder="Full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  <input required type="email" className="input" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  <input required className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />

                  <input
                    ref={winAddressRef}
                    required
                    className="input"
                    placeholder="Address"
                    value={form.address}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => ({ ...f, address: v }));
                      setWinPlaceId(null);
                      winSelectedPlaceRef.current = null;
                    }}
                    autoComplete="off"
                    inputMode="text"
                  />

                  <label className="text-sm">Preferred cleaning date (optional)</label>
                  <input
                    type="date"
                    className="input"
                    value={form.preferred_date}
                    onChange={(e) => setForm((f) => ({ ...f, preferred_date: e.target.value }))}
                  />

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
                    <button type="button" onClick={() => setShowWinModal(false)} className="px-4 py-3 rounded-xl bg-neutral-200 hover:bg-neutral-300">
                      Close
                    </button>
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
