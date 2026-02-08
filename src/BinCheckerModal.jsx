import React, { useMemo, useState } from "react";

function normalizePostcode(raw) {
  const s = String(raw || "").toUpperCase().trim().replace(/\s+/g, "");
  // Insert a space before the last 3 characters if possible
  if (s.length > 3) return `${s.slice(0, -3)} ${s.slice(-3)}`;
  return s;
}

export default function BinCheckerModal({ onClose }) {
  const [postcode, setPostcode] = useState("");
  const [loading, setLoading] = useState(false);

  const [addresses, setAddresses] = useState([]); // array of strings
  const [selectedAddress, setSelectedAddress] = useState("");

  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState("");

  const canFetchSchedule = useMemo(() => !!selectedAddress, [selectedAddress]);

  async function findAddresses() {
    setError("");
    setSchedule(null);
    setSelectedAddress("");
    setAddresses([]);

    const pc = normalizePostcode(postcode);
    if (!pc || pc.length < 5) {
      setError("Enter a valid postcode.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/.netlify/functions/binLookup?postcode=${encodeURIComponent(pc)}`
      );
      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        setError("Lookup failed. Try again.");
        return;
      }

      // Accept either:
      // - data.addresses as array: ["...", "..."]
      // - data.addresses as object: { "1": "...", "2": "..." }
      // - data as object itself: { "1": "...", "2": "..." }
      let list = [];

      if (Array.isArray(data.addresses)) list = data.addresses;
      else if (data.addresses && typeof data.addresses === "object")
        list = Object.values(data.addresses);
      else if (data && typeof data === "object") list = Object.values(data);

      list = (list || [])
        .map((x) => String(x || "").trim())
        .filter(Boolean);

      if (!list.length) {
        setError("No addresses found for that postcode.");
        return;
      }

      setAddresses(list);
    } catch (e) {
      setError("Lookup failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchSchedule() {
    setError("");
    setSchedule(null);

    if (!selectedAddress) {
      setError("Pick your address first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/.netlify/functions/binSchedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: selectedAddress }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        setError("Couldn’t load schedule for that address.");
        return;
      }

      setSchedule(data);
    } catch (e) {
      setError("Couldn’t load schedule for that address.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-4 relative">
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

      <p className="text-sm text-gray-600 text-center">
        Enter your postcode, pick your address, and we’ll show your next collection dates.
      </p>

      <input
        type="text"
        placeholder="e.g. BT20 5NF"
        value={postcode}
        onChange={(e) => setPostcode(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2"
        autoComplete="postal-code"
      />

      <button
        type="button"
        onClick={findAddresses}
        disabled={loading}
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg w-full disabled:opacity-60"
      >
        {loading ? "Searching..." : "Find my address"}
      </button>

      {!!addresses.length && (
        <select
          value={selectedAddress}
          onChange={(e) => setSelectedAddress(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2"
        >
          <option value="">Select your address...</option>
          {addresses.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      )}

      {!!addresses.length && (
        <button
          type="button"
          onClick={fetchSchedule}
          disabled={loading || !canFetchSchedule}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg w-full disabled:opacity-60"
        >
          {loading ? "Loading..." : "Show my bin days"}
        </button>
      )}

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {schedule && (
        <div className="border border-gray-200 bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="text-sm font-semibold text-gray-800">Next collections</div>

          {/* Render flexibly — depends on what your binSchedule returns */}
          {Array.isArray(schedule.items) ? (
            <div className="space-y-2">
              {schedule.items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="font-medium">{it.bin}</div>
                  <div className="text-gray-700">{it.date}</div>
                </div>
              ))}
            </div>
          ) : (
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(schedule, null, 2)}</pre>
          )}
        </div>
      )}

      <p className="text-[11px] text-gray-500 text-center pt-1">
        If the checker can’t find your address, the council lookup may have changed — tell Andy and we’ll fix it.
      </p>
    </div>
  );
}
