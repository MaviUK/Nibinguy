import React, { useEffect, useMemo, useRef, useState } from "react";
import TenSecondChallenge from "./TenSecondChallenge.jsx";

/**
 * Ni Bin Guy — Landing Page
 * - WhatsApp + Email booking
 * - ToS gating + modal (Confirm & Agree)
 * - Google Places Autocomplete
 * - 10-Second Challenge modal
 * - WhatsApp bookings now send a ToS receipt via Netlify function
 *
 * UPDATED:
 * - Discount code field
 * - Discount validation (client-side)
 * - Discounted prices shown in dropdown
 * - Total + breakdown included in WhatsApp + Email payload/message
 */

/* ────────────────────────────────────────────────────────────────────────────
   Constants & Utilities
   ──────────────────────────────────────────────────────────────────────────── */
const PHONE_E164 = "+447555178484";
const PHONE_DISPLAY = "07555 178484";

const TERMS_VERSION = "September 2025";
const TERMS_TITLE = "Ni Bin Guy – Terms of Service";
const TERMS_BODY = `We keep our Terms of Service simple and transparent. By booking or receiving a bin clean from Ni Bin Guy, you agree to:

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
• Text reminders are a courtesy; you’re responsible for knowing your schedule.`;

// Load Google Places once
function loadGooglePlaces(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) return resolve(window.google);
    const existing = document.querySelector("script[data-gmaps]");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google));
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.dataset.gmaps = "1";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.google);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   Discount + Plans
   ──────────────────────────────────────────────────────────────────────────── */

// Your frequency dropdown options — now structured (id, label, price)
const PLANS = [
  { id: "domestic_4w", label: "4 Weekly", price: 5 },
  { id: "domestic_oneoff", label: "One-off", price: 12.5 },

  { id: "comm_lt360_4w", label: "Commercial <360L 4 Weekly", price: 5 },
  { id: "comm_lt360_oneoff", label: "Commercial <360L One-Off", price: 12.5 },

  { id: "comm_gt660_4w", label: "Commercial >660L 4 Weekly", price: 12.5 },
  { id: "comm_gt660_oneoff", label: "Commercial >660L One-Off", price: 30 },
];

// Discount rules (edit these whenever you want)
const DISCOUNT_CODES = {
  // 10% off domestic regular + one-off
  NIB10: {
    type: "percent",
    value: 10,
    appliesTo: ["domestic_4w", "domestic_oneoff"],
  },

  // £2 off one-off domestic only
  OFF2: {
    type: "fixed",
    value: 2,
    appliesTo: ["domestic_oneoff"],
  },

  // Free domestic 4-weekly only (sets unit price to £0)
  FREE4W: {
    type: "free",
    value: 0,
    appliesTo: ["domestic_4w"],
  },
};

function normalizeCode(code) {
  return (code || "").trim().toUpperCase();
}

function money(n) {
  // keep it simple and consistent for UI/messages
  const x = Math.round((Number(n) || 0) * 100) / 100;
  return x % 1 === 0 ? `${x.toFixed(0)}` : `${x.toFixed(2)}`;
}

function getPlanById(id) {
  return PLANS.find((p) => p.id === id) || null;
}

function computeDiscountedUnitPrice(basePrice, planId, code) {
  const c = normalizeCode(code);
  if (!c) return { unitPrice: basePrice, discounted: false, reason: null };

  const rule = DISCOUNT_CODES[c];
  if (!rule) return { unitPrice: basePrice, discounted: false, reason: "Invalid code" };

  if (!rule.appliesTo.includes(planId)) {
    return { unitPrice: basePrice, discounted: false, reason: "Code not valid for this clean" };
  }

  if (rule.type === "percent") {
    const unitPrice = Math.max(0, Math.round(basePrice * (1 - rule.value / 100) * 100) / 100);
    return { unitPrice, discounted: true, reason: null };
  }

  if (rule.type === "fixed") {
    const unitPrice = Math.max(0, Math.round((basePrice - rule.value) * 100) / 100);
    return { unitPrice, discounted: true, reason: null };
  }

  if (rule.type === "free") {
    return { unitPrice: 0, discounted: true, reason: null };
  }

  return { unitPrice: basePrice, discounted: false, reason: "Invalid code" };
}

function validateCodeAgainstSelection(bins, code) {
  const c = normalizeCode(code);
  if (!c) return { state: "empty", message: "" };

  const rule = DISCOUNT_CODES[c];
  if (!rule) return { state: "invalid", message: "That code isn’t valid." };

  // valid overall if it applies to at least one selected plan
  const appliesToAtLeastOne = bins.some((b) => !!b.planId && rule.appliesTo.includes(b.planId));
  if (!appliesToAtLeastOne) {
    return { state: "invalid", message: "That code doesn’t apply to your selected clean(s)." };
  }

  return { state: "valid", message: "Discount code applied ✅" };
}

/* ────────────────────────────────────────────────────────────────────────────
   Generic UI (Modal shell)
   ──────────────────────────────────────────────────────────────────────────── */
function Modal({ open, onClose, children, maxWidth = "max-w-md", labelledBy }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/80 overflow-y-auto overscroll-contain z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="min-h-[100svh] flex justify-center items-center p-4">
        <div
          className={`bg-white text-black rounded-xl shadow-xl w-11/12 ${maxWidth} overflow-auto relative`}
          onClick={(e) => e.stopPropagation()}
          style={{ maxHeight: "min(90dvh, 820px)" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Terms Modal
   ──────────────────────────────────────────────────────────────────────────── */
function TermsModal({ open, onClose, onConfirm, version, title, body }) {
  const scrollRef = useRef(null);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
      if (atEnd) setScrolledToEnd(true);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/70" onClick={onClose}>
      <div className="min-h-[100svh] flex items-center justify-center p-3 sm:p-6">
        <div
          className="bg-white text-black w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tos-title"
        >
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 id="tos-title" className="text-lg font-bold">
              {title} <span className="text-xs font-normal text-gray-500">(v{version})</span>
            </h3>
            <button onClick={onClose} className="text-2xl leading-none text-gray-500 hover:text-black" aria-label="Close Terms">
              &times;
            </button>
          </div>
          <div ref={scrollRef} className="px-6 py-4 max-h-[70dvh] overflow-y-auto whitespace-pre-line text-sm leading-6">
            {body}
          </div>
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between gap-3">
            <div className="text-xs text-gray-600">Scroll to the end to enable agreement.</div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-neutral-200 hover:bg-neutral-300">
                Close
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!scrolledToEnd}
                className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-400"
                aria-disabled={!scrolledToEnd}
              >
                Confirm &amp; Agree
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Booking Form
   ──────────────────────────────────────────────────────────────────────────── */
const DEFAULT_BIN = { type: "", count: 1, planId: "domestic_4w" };

function BookingForm({ onClose }) {
  const [bins, setBins] = useState([DEFAULT_BIN]);
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [placeId, setPlaceId] = useState(null);

  // Discount state
  const [discountCode, setDiscountCode] = useState("");
  const [discountStatus, setDiscountStatus] = useState({ state: "empty", message: "" });

  const addressInputRef = useRef(null);
  const selectedPlaceRef = useRef(null);

  // Terms gating state
  const [showTerms, setShowTerms] = useState(false);
  const [termsViewed, setTermsViewed] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const canToggleAgree = termsViewed;

  // Attach Google Places autocomplete when modal opens
  useEffect(() => {
    const key = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;
    if (!key || !addressInputRef.current) return;

    let cleanup = () => {};

    loadGooglePlaces(key)
      .then((google) => {
        const ac = new google.maps.places.Autocomplete(addressInputRef.current, {
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
  }, []);

  // Re-validate discount whenever selection changes
  useEffect(() => {
    setDiscountStatus(validateCodeAgainstSelection(bins, discountCode));
  }, [bins, discountCode]);

  const missingFields = useMemo(
    () => !name || !email || !address || !phone || bins.some((b) => !b.type),
    [name, email, address, phone, bins]
  );

  const TOS_PREFIX = useMemo(
    () => `I confirm I’ve read and agree to the Ni Bin Guy Terms of Service (v${TERMS_VERSION})`,
    []
  );

  const addBinRow = () => setBins((prev) => [...prev, { ...DEFAULT_BIN }]);
  const removeLastBin = () => setBins((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));

  const handleBinChange = (index, field, value) => {
    setBins((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: field === "count" ? parseInt(value || 0, 10) : value,
      };
      return next;
    });
  };

  // Pricing breakdown
  const pricing = useMemo(() => {
    const lines = bins
      .filter((b) => b.type)
      .map((b, idx) => {
        const plan = getPlanById(b.planId);
        const baseUnit = plan?.price ?? 0;
        const planLabel = plan?.label ?? "Unknown";
        const { unitPrice, discounted } = computeDiscountedUnitPrice(baseUnit, b.planId, discountCode);

        const qty = Math.max(1, Number(b.count) || 1);
        const lineTotal = Math.round(unitPrice * qty * 100) / 100;

        return {
          idx,
          type: b.type,
          count: qty,
          planId: b.planId,
          planLabel,
          baseUnit,
          unitPrice,
          discounted,
          lineTotal,
        };
      });

    const subtotal = lines.reduce((acc, l) => acc + l.baseUnit * l.count, 0);
    const total = lines.reduce((acc, l) => acc + l.lineTotal, 0);

    return {
      lines,
      subtotal: Math.round(subtotal * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }, [bins, discountCode]);

  const buildBinDetails = () => {
    // WhatsApp line items (URL safe new lines)
    return pricing.lines
      .map((l) => {
        const typeName = l.type.replace(" Bin", "");
        const unitText = `£${money(l.unitPrice)}`;
        const planText = `${l.planLabel} (${unitText})`;
        return `${l.count}x ${typeName} — ${planText} = £${money(l.lineTotal)}`;
      })
      .join("%0A");
  };

  const buildPricingSummary = () => {
    const code = normalizeCode(discountCode);
    const codeLine =
      code && discountStatus.state === "valid"
        ? `Discount Code: ${code} (applied)`
        : code
        ? `Discount Code: ${code} (not applied)`
        : `Discount Code: None`;

    return (
      `${codeLine}%0A` +
      `Subtotal: £${money(pricing.subtotal)}%0A` +
      `Total: £${money(pricing.total)}`
    );
  };

  // UPDATED: WhatsApp + background ToS receipt
  const handleSendWhatsApp = () => {
    if (missingFields) {
      alert("Please complete all fields before sending.");
      return;
    }
    if (!agreeToTerms) {
      alert("Please view and agree to the Terms of Service before booking.");
      return;
    }
    // If they typed a code but it's invalid, block sending (you can relax this if you prefer)
    if (normalizeCode(discountCode) && discountStatus.state !== "valid") {
      alert("That discount code isn’t valid for your selected clean(s).");
      return;
    }

    const payload = {
      source: "whatsapp",
      name,
      email,
      phone,
      address,
      bins,
      discountCode: normalizeCode(discountCode) || null,
      pricing,
      termsAccepted: true,
      termsVersion: TERMS_VERSION,
      termsAcceptanceText: TOS_PREFIX,
      termsTimestamp: new Date().toISOString(),
    };

    try {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      if (!navigator.sendBeacon("/.netlify/functions/sendTosReceipt", blob)) {
        throw new Error("sendBeacon not sent");
      }
    } catch {
      fetch("/.netlify/functions/sendTosReceipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify(payload),
      }).catch(() => {});
    }

    const message =
      `${encodeURIComponent(TOS_PREFIX)}%0A%0AHi my name is ${encodeURIComponent(name)}. I'd like to book a bin clean, please.` +
      `%0A%0A${buildBinDetails()}%0A%0A${buildPricingSummary()}` +
      `%0A%0AAddress: ${encodeURIComponent(address)}%0AEmail: ${encodeURIComponent(email)}%0APhone: ${encodeURIComponent(phone)}`;

    const url = `https://wa.me/${PHONE_E164}?text=${message}`;
    window.open(url, "_blank");
    onClose?.();
  };

  const handleSendEmail = async () => {
    if (missingFields) {
      alert("Please complete all fields before sending.");
      return;
    }
    if (!agreeToTerms) {
      alert("Please view and agree to the Terms of Service before booking.");
      return;
    }
    if (normalizeCode(discountCode) && discountStatus.state !== "valid") {
      alert("That discount code isn’t valid for your selected clean(s).");
      return;
    }

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
          discountCode: normalizeCode(discountCode) || null,
          pricing,
          termsAccepted: true,
          termsVersion: TERMS_VERSION,
          termsAcceptanceText: TOS_PREFIX,
        }),
      });

      if (res.ok) {
        try {
          await fetch("/.netlify/functions/sendTosReceipt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source: "email",
              name,
              email,
              phone,
              address,
              bins,
              discountCode: normalizeCode(discountCode) || null,
              pricing,
              termsAccepted: true,
              termsVersion: TERMS_VERSION,
              termsAcceptanceText: TOS_PREFIX,
              termsTimestamp: new Date().toISOString(),
            }),
          });
        } catch {}

        alert("Booking email sent successfully! (Pricing + discount included)");
        onClose?.();
      } else {
        alert("Failed to send booking email.");
      }
    } catch (err) {
      console.error(err);
      alert("Error sending booking email.");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <button
        onClick={onClose}
        className="absolute top-3 right-4 text-gray-500 hover:text-red-500 text-2xl z-10"
        aria-label="Close booking"
      >
        &times;
      </button>

      <h2 id="booking-title" className="text-2xl font-bold text-center">
        Book a Bin Clean
      </h2>

      <input
        type="text"
        placeholder="Your Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2"
      />

      {bins.map((bin, index) => {
        return (
          <div key={index} className="space-y-2 border-b border-gray-200 pb-4 mb-4">
            <div className="flex gap-4">
              <select
                value={bin.type}
                onChange={(e) => handleBinChange(index, "type", e.target.value)}
                className="w-2/3 border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="">Select Bin</option>
                <option value="Black Bin">Black</option>
                <option value="Brown Bin">Brown</option>
                <option value="Green Bin">Green</option>
                <option value="Blue Bin">Blue</option>
              </select>

              <input
                type="number"
                min="1"
                value={bin.count}
                onChange={(e) => handleBinChange(index, "count", e.target.value)}
                className="w-1/3 border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>

            {/* Plan dropdown (discount-aware display) */}
            <select
              value={bin.planId}
              onChange={(e) => handleBinChange(index, "planId", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            >
              {PLANS.map((p) => {
                const { unitPrice, discounted } = computeDiscountedUnitPrice(p.price, p.id, discountCode);
                const label = `${p.label} (£${money(unitPrice)})${discounted ? " ✓" : ""}`;
                return (
                  <option key={p.id} value={p.id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        );
      })}

      <div className="flex items-center justify-between">
        <button onClick={addBinRow} className="text-sm text-green-600 hover:text-green-800 font-semibold">
          + Add Another Bin
        </button>
        {bins.length > 1 && (
          <button onClick={removeLastBin} className="text-sm text-red-600 hover:text-red-800 font-semibold">
            − Remove Last Bin
          </button>
        )}
      </div>

      {/* Discount Code */}
      <div className="mt-2">
        <label className="block text-sm font-semibold text-gray-700 mb-1">Discount Code (optional)</label>
        <input
          type="text"
          placeholder="Enter code"
          value={discountCode}
          onChange={(e) => setDiscountCode(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2"
        />

        {discountStatus.state === "valid" && (
          <p className="text-sm mt-2 text-green-700 font-semibold">{discountStatus.message}</p>
        )}
        {discountStatus.state === "invalid" && (
          <p className="text-sm mt-2 text-red-600 font-semibold">{discountStatus.message}</p>
        )}
      </div>

      {/* Pricing summary */}
      <div className="mt-2 p-3 rounded-lg border border-gray-200 bg-gray-50">
        <div className="text-sm font-semibold text-gray-800">Pricing Summary</div>
        <div className="mt-2 space-y-1 text-sm text-gray-700">
          {pricing.lines.length ? (
            pricing.lines.map((l) => (
              <div key={l.idx} className="flex items-start justify-between gap-3">
                <div className="pr-2">
                  <div className="font-medium">
                    {l.count}x {l.type.replace(" Bin", "")}
                  </div>
                  <div className="text-xs text-gray-500">
                    {l.planLabel} — £{money(l.unitPrice)} each{l.discounted ? " (discounted)" : ""}
                  </div>
                </div>
                <div className="font-bold text-gray-900">£{money(l.lineTotal)}</div>
              </div>
            ))
          ) : (
            <div className="text-gray-500">Select a bin type to see pricing.</div>
          )}

          <div className="pt-2 mt-2 border-t border-gray-200 flex items-center justify-between">
            <div className="font-semibold">Total</div>
            <div className="font-extrabold">£{money(pricing.total)}</div>
          </div>
        </div>
      </div>

      <input
        ref={addressInputRef}
        type="text"
        placeholder="Full Address"
        value={address}
        onChange={(e) => {
          setAddress(e.target.value);
          setPlaceId(null);
          selectedPlaceRef.current = null;
        }}
        className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-4"
        autoComplete="off"
        inputMode="text"
      />
      <p className="text-xs text-gray-500 -mt-2">Tip: pick from suggestions or just type your full address.</p>

      <input
        type="tel"
        placeholder="Contact Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-2"
      />
      <input
        type="email"
        placeholder="Email Address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-2"
      />

      {/* Terms of Service gating */}
      <div className="mt-4 p-3 rounded-lg border border-gray-300 bg-gray-50">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-gray-700">
            You must view and agree to the{" "}
            <button
              type="button"
              onClick={() => {
                setShowTerms(true);
                setTermsViewed(true);
              }}
              className="underline font-semibold"
            >
              Terms of Service
            </button>{" "}
            to book.
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
              <span className="block text-xs text-gray-500">
                (Open the Terms and scroll to the bottom to enable this.)
              </span>
            )}
          </label>
        </div>
      </div>

      <button
        onClick={handleSendWhatsApp}
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg w-full disabled:opacity-60"
        disabled={!agreeToTerms}
      >
        Send via WhatsApp
      </button>
      <button
        onClick={handleSendEmail}
        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg w-full disabled:opacity-60"
        disabled={!agreeToTerms}
      >
        Send via Email
      </button>

      <TermsModal
        open={showTerms}
        onClose={() => setShowTerms(false)}
        onConfirm={() => {
          setAgreeToTerms(true);
          setShowTerms(false);
        }}
        version={TERMS_VERSION}
        title={TERMS_TITLE}
        body={TERMS_BODY}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Contact Form
   ──────────────────────────────────────────────────────────────────────────── */
function ContactForm({ onClose }) {
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cMessage, setCMessage] = useState("");

  const handleCallClick = async () => {
    const isMobile = /Android|iPhone|iPad|iPod|Windows Phone|Mobi/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `tel:${PHONE_E164}`;
    } else {
      try {
        await navigator.clipboard.writeText(PHONE_DISPLAY);
        alert(`Phone: ${PHONE_DISPLAY}\n(The number has been copied to your clipboard.)`);
      } catch {
        alert(`Phone: ${PHONE_DISPLAY}`);
      }
    }
  };

  const missing = useMemo(() => !cName || !cEmail || !cPhone || !cMessage, [cName, cEmail, cPhone, cMessage]);

  const handleWhatsApp = () => {
    if (missing) {
      alert("Please complete all fields before sending.");
      return;
    }
    const msg = `Hi, I'm ${encodeURIComponent(cName)}.%0APhone: ${encodeURIComponent(cPhone)}%0AEmail: ${encodeURIComponent(cEmail)}%0A%0AMessage:%0A${encodeURIComponent(cMessage)}`;
    window.open(`https://wa.me/${PHONE_E164}?text=${msg}`, "_blank");
    onClose?.();
    setCName("");
    setCEmail("");
    setCPhone("");
    setCMessage("");
  };

  const handleEmail = async () => {
    if (missing) {
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
        onClose?.();
        setCName("");
        setCEmail("");
        setCPhone("");
        setCMessage("");
      } else {
        alert("Failed to send your message.");
      }
    } catch (e) {
      console.error(e);
      alert("Error sending your message.");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <button onClick={onClose} className="absolute top-3 right-4 text-gray-500 hover:text-red-500 text-2xl z-10" aria-label="Close contact">
        &times;
      </button>

      <div className="flex items-center justify-center gap-3">
        <h2 id="contact-title" className="text-2xl font-bold text-center">
          Contact Us
        </h2>
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

      <button onClick={handleWhatsApp} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg w-full">
        Send via WhatsApp
      </button>
      <button onClick={handleEmail} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg w-full">
        Send via Email
      </button>
      <p className="text-center text-sm text-gray-600 mt-2">Prefer to call? Tap the phone icon.</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Challenge Modal (wraps TenSecondChallenge)
   ──────────────────────────────────────────────────────────────────────────── */
function ChallengeModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/80 overflow-y-auto overscroll-contain z-50"
      onClick={onClose}
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="challenge-title"
    >
      <div className="min-h-[100svh] flex items-center justify-center p-3 sm:p-6">
        <div
          className="bg-neutral-900 text-white w-11/12 max-w-3xl rounded-2xl shadow-2xl border border-neutral-800 p-4 md:p-6 relative overflow-auto"
          onClick={(e) => e.stopPropagation()}
          style={{ maxHeight: "min(90dvh, 820px)" }}
        >
          <button onClick={onClose} className="absolute top-3 right-4 text-neutral-400 hover:text-white text-2xl" aria-label="Close">
            &times;
          </button>
          <TenSecondChallenge />
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Page Sections
   ──────────────────────────────────────────────────────────────────────────── */
function Hero({ onBook, onContact, onChallenge }) {
  return (
    <section className="relative overflow-hidden flex flex-col items-center justify-center text-center pt-10 pb-20 px-4 bg-black">
      <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 w-[800px] h-[800px] bg-green-900 opacity-30 blur-3xl rounded-full z-0" />
      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-b from-transparent via-[#121212] to-[#18181b] z-10 pointer-events-none" />
      <div className="relative z-20 flex flex-col items-center gap-4">
        <img src="logo.png" alt="Ni Bin Guy Logo" className="w-64 h-64 md:w-80 md:h-80 rounded-xl shadow-lg" />
        <h1 className="text-4xl md:text-6xl font-bold">
          Bin Cleaning, <span className="text-green-400">Done Right</span>
        </h1>
        <p className="text-lg md:text-xl max-w-xl mt-4 text-center">
          Professional wheelie bin cleaning at your home, across <span className="text-green-400">County Down.</span> Sparkling clean &amp; fresh smelling bins without any drama.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <button onClick={onBook} className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition">
            Book a Clean
          </button>
          <button onClick={onContact} className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition">
            Contact Us
          </button>
          <button
            onClick={onChallenge}
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
  );
}

function WhatWeDo() {
  return (
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
  );
}

function TheProcess() {
  return (
    <section id="the-process" className="relative py-16 px-6 bg-[#18181b] text-white">
      <h2 className="text-3xl font-bold text-green-400 mb-10 text-center">The Process</h2>
      <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        <div className="rounded-2xl bg-zinc-800/70 border border-white/10 p-6">
          <h3 className="text-xl font-bold">The Booking Process</h3>
          <ol className="mt-6 space-y-5">
            {["Complete the quick booking form.", "We’ll reply with your price and the next clean date (right after your bin collection).", "Approve the quote to secure your spot in the schedule.", "You’ll receive an email to set up your payment method."].map((text, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-400/50 bg-green-500/10 text-sm font-semibold text-green-300">
                  {i + 1}
                </span>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-2xl bg-zinc-800/70 border border-white/10 p-6">
          <h3 className="text-xl font-bold">The Cleaning Process</h3>
          <ol className="mt-6 space-y-5">
            {["We remove any leftover waste the bin crew missed.", "Thorough wash and rinse — inside and out.", "We dry the interior to prevent residue.", "Sanitise and deodorise for a fresh finish.", "Your bin is returned clean and fresh to its usual spot."].map((text, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-400/50 bg-green-500/10 text-sm font-semibold text-green-300">
                  {i + 1}
                </span>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="mt-12 text-center">
        <a href="#book" className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition">
          Book a Clean
        </a>
      </div>
    </section>
  );
}

function BinsWeClean() {
  const items = [
    { src: "/bins/120L.png", alt: "120L Bin", size: "120L", h: "h-32" },
    { src: "/bins/240L.png", alt: "240L Bin", size: "240L", h: "h-36" },
    { src: "/bins/360L.png", alt: "360L Bin", size: "360L", h: "h-40" },
    { src: "/bins/660L.png", alt: "660L Bin", size: "660L", h: "h-44" },
    { src: "/bins/1100L.png", alt: "1100L Bin", size: "1100L", h: "h-48" },
  ];
  return (
    <section className="relative py-16 px-6 bg-[#18181b] text-white text-center">
      <h2 className="text-3xl font-bold text-green-400 mb-12">The Bins We Clean</h2>
      <div className="relative z-20 flex flex-wrap justify-center items-end gap-12 md:gap-20">
        {items.map((it) => (
          <div key={it.size} className="flex flex-col items-center">
            <img src={it.src} alt={it.alt} className={`${it.h} mb-2`} />
            <span className="text-sm">{it.size}</span>
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-b from-[#18181b] to-black pointer-events-none z-10" />
    </section>
  );
}

function WhyCleanYourBin() {
  const points = [
    { icon: "/odour.png", title: "Prevent Nasty Odours", text: "Bins can start to smell unpleasant fast. Regular cleaning eliminates those foul smells at the source." },
    { icon: "/bacteria.png", title: "Stop Bacteria Buildup", text: "Leftover waste can attract harmful bacteria. Professional bin cleaning keeps your environment safer and more hygienic." },
    { icon: "/pests.png", title: "Deter Insects & Vermin", text: "Flies, maggots, and rodents are drawn to dirty bins. Keep them away by keeping your bin spotless." },
    { icon: "/family.png", title: "Protect Your Family", text: "A clean bin reduces exposure to germs and pathogens, helping keep your household healthier." },
  ];
  return (
    <section className="py-16 px-6 bg-gradient-to-b from-black via-[#0a0a0a] to-zinc-900 text-white">
      <h2 className="text-3xl font-bold text-green-400 mb-12 text-center">Why Clean Your Bin?</h2>
      <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
        {points.map((p) => (
          <div key={p.title} className="flex items-start gap-4">
            <img src={p.icon} alt={`${p.title} icon`} className="w-12 h-12 mt-1" />
            <div>
              <h3 className="text-xl font-semibold mb-1">{p.title}</h3>
              <p className="text-gray-300">{p.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhyNiBinGuy() {
  const points = [
    { title: "Local & Trusted", text: "We’re based in Bangor and proud to serve County Down residents with care." },
    { title: "Flexible Plans", text: "Whether you want a one-off clean or recurring service, we’ve got options." },
    { title: "Affordable Pricing", text: "From just £5 per bin — clear pricing with no surprises." },
    { title: "Fully Insured", text: "We’re fully insured and compliant — so you can rest easy." },
  ];
  return (
    <section className="py-16 px-6 bg-gradient-to-b from-zinc-900 via-[#1a1a1a] to-black text-white">
      <h2 className="text-3xl font-bold text-green-400 mb-8 text-center">Why Ni Bin Guy?</h2>
      <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
        {points.map((p) => (
          <div key={p.title}>
            <h3 className="text-xl font-semibold mb-2">{p.title}</h3>
            <p>{p.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Page — default export
   ──────────────────────────────────────────────────────────────────────────── */
export default function NiBinGuyLandingPage() {
  const [showBooking, setShowBooking] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <Hero onBook={() => setShowBooking(true)} onContact={() => setShowContact(true)} onChallenge={() => setShowChallenge(true)} />

      <Modal open={showBooking} onClose={() => setShowBooking(false)} maxWidth="max-w-md" labelledBy="booking-title">
        <BookingForm onClose={() => setShowBooking(false)} />
      </Modal>

      <Modal open={showContact} onClose={() => setShowContact(false)} maxWidth="max-w-md" labelledBy="contact-title">
        <ContactForm onClose={() => setShowContact(false)} />
      </Modal>

      <ChallengeModal open={showChallenge} onClose={() => setShowChallenge(false)} />

      <WhatWeDo />
      <TheProcess />
      <BinsWeClean />
      <WhyCleanYourBin />
      <WhyNiBinGuy />
    </div>
  );
}
