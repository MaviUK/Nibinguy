import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * TenSecondChallenge.jsx — LOCAL-ONLY VERSION (no backend)
 * ------------------------------------------------------------
 * - Space/tap to start/stop a stopwatch.
 * - EXACT win at 10.00s (1000 centiseconds).
 * - One try per device per day (localStorage, Europe/London timezone).
 * - If you win, a booking modal appears; submit simply thanks the user.
 * - No environment variables. No external requests.
 */

// ------------------------- Helpers -----------------------------------------
function getTodayKey() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const parts = Object.fromEntries(fmt.map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`; // YYYY-MM-DD
}

export function computeCentiseconds(startMs, stopMs) {
  return Math.round((stopMs - startMs) / 10);
}

// ------------------------- Component ----------------------------------------
export default function TenSecondChallenge({ debug = false, title = "10-Second Stop Watch Challenge" }) {
  const [elapsedCs, setElapsedCs] = useState(0); // centiseconds
  const [running, setRunning] = useState(false);
  const [hasTriedToday, setHasTriedToday] = useState(false);
  const [alreadyClaimedToday, setAlreadyClaimedToday] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showWinModal, setShowWinModal] = useState(false);

  // Booking form (local-only; not sent anywhere)
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", preferred_date: "" });

  const rafRef = useRef(null);
  const startRef = useRef(0);
  const todayKey = useMemo(() => getTodayKey(), []);

  // Init per-day flags from localStorage
  useEffect(() => {
    const tried = typeof window !== "undefined" ? localStorage.getItem(`tensec_try_${todayKey}`) : null;
    const win = typeof window !== "undefined" ? localStorage.getItem(`tensec_winner_${todayKey}`) : null;
    setHasTriedToday(!!tried);
    setAlreadyClaimedToday(!!win);
  }, [todayKey]);

  // Keyboard: Space to start/stop
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleStartStop();
      }
    };
    if (typeof window !== "undefined") window.addEventListener("keydown", onKeyDown);
    return () => typeof window !== "undefined" && window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, hasTriedToday, alreadyClaimedToday]);

  function tick(now) {
    const cs = computeCentiseconds(startRef.current, now);
    setElapsedCs(cs);
    rafRef.current = requestAnimationFrame(tick);
  }

  function handleStartStop() {
    if (hasTriedToday) return;
    if (alreadyClaimedToday) return;

    if (!running) {
      // Start
      setError("");
      setMessage("");
      setElapsedCs(0);
      startRef.current = performance.now();
      setRunning(true);
      rafRef.current = requestAnimationFrame(tick);
    } else {
      // Stop — compute exact value now to avoid rAF lag
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const finalCs = computeCentiseconds(startRef.current, performance.now());
      setElapsedCs(finalCs);
      setRunning(false);

      // One try per day
      if (typeof window !== "undefined") localStorage.setItem(`tensec_try_${todayKey}`, "1");
      setHasTriedToday(true);

      if (finalCs === 1000) {
        handleLocalWin();
      } else {
        setMessage("So close! Try again tomorrow.");
      }
    }
  }

  function handleLocalWin() {
    // Device-scoped daily winner
    if (typeof window !== "undefined") localStorage.setItem(`tensec_winner_${todayKey}`, "1");
    setShowWinModal(true);
    setMessage("You nailed 10.00 seconds! 🎉");
    setAlreadyClaimedToday(true);
  }

  function submitBooking(e) {
    e.preventDefault();
    // No backend — just close and thank the user
    setShowWinModal(false);
    setMessage("Thanks! We'll be in touch to confirm your clean.");
  }

  const seconds = (elapsedCs / 100).toFixed(2);

  // --------------------------- Dev Unit Tests --------------------------------
  // Run simple assertions in dev when `debug` prop passed.
  useEffect(() => {
    if (!debug) return;
    const tests = [];
    const add = (name, pass) => tests.push({ name, pass });

    add("10.000s -> 1000 cs", computeCentiseconds(0, 10000) === 1000);
    add("9.999s rounds to 1000 cs", computeCentiseconds(0, 9999) === 1000);
    add("10.005s -> 1001 cs", computeCentiseconds(0, 10005) === 1001);
    add("1.000s -> 100 cs", computeCentiseconds(42, 1042) === 100);
    add("999.5cs rounds to 1000", computeCentiseconds(0, 9995) === 1000);
    add("1000.4cs rounds to 1000", computeCentiseconds(0, 10004) === 1000);
    add("1000.5cs rounds to 1001", computeCentiseconds(0, 10005) === 1001);

    console.table(tests);
  }, [debug]);

  return (
    <div className="w-full max-w-3xl mx-auto p-4" data-testid="ten-sec-root">
      <div className="bg-neutral-900 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-neutral-800">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
          <div className="text-xs opacity-80">One try per device · Europe/London</div>
        </div>

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
              Press <span className="font-semibold">Space</span> (desktop) or tap (mobile) to start/stop.
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4">
            {alreadyClaimedToday ? (
              <div className="bg-red-900/30 border border-red-800 text-red-200 p-4 rounded-xl" data-testid="already-claimed">
                Today's prize has been claimed on this device. Come back tomorrow!
              </div>
            ) : hasTriedToday ? (
              <div className="bg-amber-900/30 border border-amber-800 text-amber-200 p-4 rounded-xl" data-testid="tried-today">
                You've used your attempt for {todayKey} on this device. Try again tomorrow.
              </div>
            ) : (
              <div className="bg-emerald-900/30 border border-emerald-800 text-emerald-200 p-4 rounded-xl" data-testid="ready">
                Ready when you are — hit Space or tap the big button below.
              </div>
            )}

            <button
              onClick={handleStartStop}
              disabled={hasTriedToday || alreadyClaimedToday}
              className={`w-full rounded-2xl py-6 text-xl font-semibold shadow-lg border transition active:scale-[0.99]
                ${running ? "bg-rose-600 hover:bg-rose-500 border-rose-400" : "bg-emerald-600 hover:bg-emerald-500 border-emerald-400"}
                ${hasTriedToday || alreadyClaimedToday ? "opacity-50 cursor-not-allowed" : ""}`}
              data-testid="start-stop"
            >
              {running ? "Stop" : "Start"}
            </button>

            {message && (
              <div className="text-emerald-300 text-sm" data-testid="message">{message}</div>
            )}
            {error && (
              <div className="text-red-300 text-sm" data-testid="error">{error}</div>
            )}

            <div
              onClick={handleStartStop}
              className={`mt-2 h-44 rounded-2xl border border-dashed border-neutral-700 flex items-center justify-center select-none
                ${hasTriedToday || alreadyClaimedToday ? "opacity-40" : "cursor-pointer hover:bg-neutral-800/40"}`}
              data-testid="tap-area"
            >
              <span className="text-neutral-400">Tap here on mobile to {running ? "stop" : "start"}</span>
            </div>

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
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold">You're a winner! 🎉</h3>
              <p className="text-sm text-neutral-600 mt-1">Fill this in to book your free clean for {todayKey}’s challenge.</p>
            </div>
            <form onSubmit={submitBooking} className="p-6 flex flex-col gap-4">
              <input required className="input" placeholder="Full name" value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))}/>
              <input required type="email" className="input" placeholder="Email" value={form.email} onChange={(e)=>setForm(f=>({...f,email:e.target.value}))}/>
              <input required className="input" placeholder="Phone" value={form.phone} onChange={(e)=>setForm(f=>({...f,phone:e.target.value}))}/>
              <input required className="input" placeholder="Address" value={form.address} onChange={(e)=>setForm(f=>({...f,address:e.target.value}))}/>
              <label className="text-sm">Preferred cleaning date (optional)</label>
              <input type="date" className="input" value={form.preferred_date} onChange={(e)=>setForm(f=>({...f,preferred_date:e.target.value}))}/>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-black text-white rounded-xl py-3 font-semibold hover:opacity-90 active:opacity-80">Submit</button>
                <button type="button" onClick={()=>setShowWinModal(false)} className="px-4 py-3 rounded-xl bg-neutral-200 hover:bg-neutral-300">Close</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tailwind utility for inputs */}
      <style>{`
        .input { @apply w-full rounded-xl border border-neutral-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500; }
      `}</style>
    </div>
  );
}
