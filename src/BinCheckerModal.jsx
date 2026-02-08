// src/BinCheckerModal.jsx
import React, { useEffect, useMemo, useState } from "react";

const PHONE_E164 = "+447555178484";
const WA_NUMBER = PHONE_E164.replace("+", "");

// Helpers
function fmtDateISOToPretty(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
}

function dayBeforeISO(iso) {
  try {
    const d = new Date(iso);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}

export default function BinCheckerModal({ onClose }) {
  const [postcode, setPostcode] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [selectedUprn, setSelectedUprn] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");

  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState("");

  const canLookup = useMemo(() => postcode.trim().length >= 5, [postcode]);

  // ESC closes (nice UX)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function lookupAddresses() {
    setError("");
    setSchedule(null);
    setAddresses([]);
    setSelectedUprn("");
    setSelectedLabel("");

    if (!canLookup) {
      setError("Enter a valid postcode (e.g. BT20 3AH).");
      return;
    }

    setLoadingAddresses(true);
    try {
      const res = await fetch(
        `/.netlify/functions/binLookup?postcode=${encodeURIComponent(postcode.trim())}`
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || "Address lookup failed.");

      const list = Array.isArray(data.addresses) ? data.addresses : [];
      setAddresses(list);

      if (list.length === 0) setError("No addresses found for that postcode.");
    } catch (e) {
      setError(e.message || "Address lookup failed.");
    } finally {
      setLoadingAddresses(false);
    }
  }

  async function fetchSchedule() {
    setError("");
    setSchedule(null);

    if (!selectedUprn) {
      setError("Select your address first.");
      return;
    }

    setLoadingSchedule(true);
    try {
      const res = await fetch(
        `/.netlify/functions/binSchedule?postcode=${encodeURIComponent(postcode)}`
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || "Schedule fetch failed.");

      // attach label so WhatsApp message can include it
      setSchedule({ ...data, addressLabel: selectedLabel || data.addressLabel || "" });
    } catch (e) {
      setError(e.message || "Schedule fetch failed.");
    } finally {
      setLoadingSchedule(false);
    }
  }

  function bookWhatsApp() {
    if (!schedule?.next?.length) return;

    const sorted = [...schedule.next].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const soonest = sorted[0];

    const cleanDay = dayBeforeISO(soonest.date);

    const msg =
      `Hi Andy 👋\n\n` +
      `Can I book a bin clean?\n\n` +
      `Postcode: ${postcode.trim()}\n` +
      (schedule.addressLabel ? `Address: ${schedule.addressLabel}\n` : "") +
      `UPRN: ${schedule.uprn}\n\n` +
      `Next collection: ${soonest.type} on ${fmtDateISOToPretty(soonest.date)}\n` +
      `Best clean day: ${fmtDateISOToPretty(cleanDay)}\n`;

    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
    onClose?.();
  }

  return (
    <div className="p-6 space-y-4">
      <button
        onClick={onClose}
        className="absolute top-3 right-4 text-gray-500 hover:text-red-500 text-2xl z-10"
        aria-label="Close bin checker"
      >
        &times;
      </button>

      <h2 id="bin-checker-title" className="text-2xl font-bold text-center">
        Bin Day Checker
      </h2>

      <p className="text-center text-sm text-gray-600">
        Enter your postcode, pick your address, and we’ll show your next collection dates.
      </p>

      {/* Postcode */}
      <input
        value={postcode}
        onChange={(e) => setPostcode(e.target.value)}
        placeholder="Postcode (e.g. BT20 3AH)"
        className="w-full border border-gray-300 rounded-lg px-4 py-2"
        autoComplete="postal-code"
        inputMode="text"
      />

      <button
        onClick={lookupAddresses}
        disabled={!canLookup || loadingAddresses}
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg w-full disabled:opacity-60"
      >
        {loadingAddresses ? "Finding addresses..." : "Find my address"}
      </button>

      {/* Address dropdown */}
      {addresses.length > 0 && (
        <div className="space-y-3">
          <select
            value={selectedUprn}
            onChange={(e) => {
              const uprn = e.target.value;
              setSelectedUprn(uprn);
              const found = addresses.find((a) => String(a.uprn) === String(uprn));
              setSelectedLabel(found?.label || "");
            }}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
          >
            <option value="">Select your address…</option>
            {addresses.map((a) => (
              <option key={a.uprn} value={a.uprn}>
                {a.label}
              </option>
            ))}
          </select>

          <button
            onClick={fetchSchedule}
            disabled={!selectedUprn || loadingSchedule}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg w-full disabled:opacity-60"
          >
            {loadingSchedule ? "Loading dates..." : "Show my bin dates"}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Results */}
      {schedule?.next?.length > 0 && (
        <div className="mt-2 space-y-3">
          <div className="text-sm font-semibold text-gray-800">Next collections</div>

          <div className="space-y-2">
            {schedule.next.map((x, idx) => (
              <div
                key={`${x.type}-${idx}`}
                className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2"
              >
                <span className="font-bold">{x.type}</span>
                <span className="font-semibold">{fmtDateISOToPretty(x.date)}</span>
              </div>
            ))}
          </div>

          <button
            onClick={bookWhatsApp}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg w-full"
          >
            Book the day before (WhatsApp)
          </button>

          <p className="text-center text-xs text-gray-500">
            We’ll prefill a message with the best clean day.
          </p>

          {/* Debug helper: shows if backend isn't parsing yet */}
          {schedule.debugHtmlSample && (
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer">Debug (for setup)</summary>
              <pre className="text-[10px] bg-gray-900 text-white p-2 rounded-lg overflow-auto max-h-40">
                {schedule.debugHtmlSample}
              </pre>
            </details>
          )}
        </div>
      )}

      <p className="text-center text-[10px] text-gray-400 pt-2">
        If the checker can’t find your address, the council lookup may have changed — tell Andy and we’ll fix it.
      </p>
    </div>
  );
}
