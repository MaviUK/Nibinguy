function TenSecondChallenge({ debug = false, autoWin = false }) {
  const [elapsedCs, setElapsedCs] = useState(0);
  const [running, setRunning] = useState(false);
  const [hasTriedToday, setHasTriedToday] = useState(false);
  const [alreadyClaimedToday, setAlreadyClaimedToday] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showWinModal, setShowWinModal] = useState(false);

  // winner form state (no bin count control — prize is 1 bin)
  const [form, setForm] = useState({
    binType: "Black Bin", // default so user can submit without changing
    name: "",
    email: "",
    phone: "",
    address: "",
    preferred_date: "",
  });
  const [winSubmitStatus, setWinSubmitStatus] = useState("idle"); // idle | sending | success | error

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

      if (isTyping || showWinModal) return; // let space be typed in fields / ignore under modal
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

    if (!form.name || !form.email || !form.phone || !form.address) {
      setError("Please complete all required fields.");
      return;
    }

    setError("");
    setWinSubmitStatus("sending");

    const loc = winSelectedPlaceRef.current?.geometry?.location;
    const lat = loc ? loc.lat() : null;
    const lng = loc ? loc.lng() : null;

    // Match the booking payload exactly (this is important for your function)
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

      if (res.ok) {
        setWinSubmitStatus("success"); // show confirmation screen
      } else {
        const text = await res.text().catch(() => "");
        console.error("Winner email send failed:", text);
        setWinSubmitStatus("error");
        setError("We couldn't send the email. Please try again or contact us.");
      }
    } catch (err) {
      console.error(err);
      setWinSubmitStatus("error");
      setError("Network error sending the email. Please try again.");
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
                    className="px-5 py-3 rounded-xl bg黑 text-white hover:opacity-90"
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
                <form onSubmit={submitBooking} className="p-6 flex flex-col gap-4">
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

                  {error && <div className="text-red-600 text-sm">{error}</div>}

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
