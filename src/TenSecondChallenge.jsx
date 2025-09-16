import React, { useEffect, useMemo, useRef, useState } from "react";

function getTodayKey() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map(p => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
const cs = (a, b) => Math.round((b - a) / 10);

export default function TenSecondChallenge({ autoWin = false }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [hasTriedToday, setHasTriedToday] = useState(false);
  const [message, setMessage] = useState("");
  const [showWinModal, setShowWinModal] = useState(false);

  const startRef = useRef(0);
  const rafRef = useRef(0);
  const todayKey = useMemo(() => getTodayKey(), []);

  useEffect(() => {
    setHasTriedToday(!!localStorage.getItem(`tensec_try_${todayKey}`));
  }, [todayKey]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.code !== "Space" && e.key !== " " && e.key !== "Spacebar") || showWinModal) return;
      const t = e.target;
      const typing = t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.isContentEditable;
      if (typing) return;
      e.preventDefault();
      handleStartStop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showWinModal, running, hasTriedToday, autoWin]);

  const tick = (now) => {
    setElapsed(cs(startRef.current, now));
    rafRef.current = requestAnimationFrame(tick);
  };

  function handleStartStop() {
    if (!autoWin && hasTriedToday) return;

    if (!running) {
      setMessage("");
      setElapsed(0);
      startRef.current = performance.now();
      setRunning(true);
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const finalCs = autoWin ? 1000 : cs(startRef.current, performance.now());
      setElapsed(finalCs);
      setRunning(false);

      localStorage.setItem(`tensec_try_${todayKey}`, "1");
      setHasTriedToday(true);

      if (finalCs === 1000) {
        setShowWinModal(true);
        setMessage("You nailed 10.00 seconds! 🎉");
      } else {
        setMessage("So close! Try again tomorrow.");
      }
    }
  }

  const seconds = (elapsed / 100).toFixed(2);

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <div className="bg-neutral-900 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-neutral-800">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl md:text-3xl font-bold">10-Second Stop Watch Challenge</h2>
          <div className="text-xs opacity-80">One try per device · Europe/London</div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
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

          <div className="flex flex-col gap-4">
            {hasTriedToday ? (
              <div className="bg-amber-900/30 border border-amber-800 text-amber-200 p-4 rounded-xl">
                You've used your attempt for {todayKey} on this device. Try again tomorrow.
              </div>
            ) : (
              <div className="bg-emerald-900/30 border border-emerald-800 text-emerald-200 p-4 rounded-xl">
                Ready when you are — hit Space or click the big button below.
              </div>
            )}

            <button
              onClick={handleStartStop}
              disabled={!autoWin && hasTriedToday}
              className={`w-full rounded-2xl py-6 text-xl font-semibold shadow-lg border transition active:scale-[0.99]
                ${running ? "bg-rose-600 hover:bg-rose-500 border-rose-400" : "bg-emerald-600 hover:bg-emerald-500 border-emerald-400"}
                ${!autoWin && hasTriedToday ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {running ? "Stop" : "Start"}
            </button>

            {message && <div className="text-emerald-300 text-sm">{message}</div>}
          </div>
        </div>
      </div>

      {showWinModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white text-black w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold">You're a winner! 🎉</h3>
              {/* … keep your winner form here unchanged … */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
