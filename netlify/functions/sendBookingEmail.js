// netlify/functions/sendBookingEmail.js
const { Resend } = require("resend");

// Optional (for audit logging). If @netlify/blobs isn't installed, logging will be skipped.
let getStoreSafe = null;
try {
  const { getStore } = require("@netlify/blobs");
  getStoreSafe = function (name) {
    const siteID = process.env.NETLIFY_SITE_ID || process.env.BLOBS_SITE_ID;
    const token  = process.env.NETLIFY_BLOBS_TOKEN || process.env.BLOBS_TOKEN;
    return (siteID && token) ? getStore({ name, siteID, token }) : getStore({ name });
  };
} catch (_) {
  // blobs not available — that's fine, we'll skip logging
}

const resend = new Resend(process.env.RESEND_API_KEY);

// ---------- config ----------
const FROM_DEFAULT = process.env.RESEND_FROM || "Ni Bin Guy <noreply@nibing.uy>";
const TO_ADMIN     = process.env.BOOKINGS_TO || "aabincleaning@gmail.com";
const TERMS_VERSION_DEFAULT = "September 2025";

// Shown in both emails. Replace with your full ToS text if you prefer.
const TERMS_BODY = `
Ni Bin Guy – Terms of Service (summary)

• Regular plans: minimum 12 months (unless agreed otherwise).
• Put bins out / make accessible by 8 AM on the scheduled day.
  If not available and we weren't told before 8 AM that day, the clean is still charged.
• Inside & outside cleaned (where safe) with pressurised water & detergent.
  Some stains may take multiple visits / may not fully fully remove. Loosened waste may be bagged and left in your bin.
  Stay at least 5 m away during cleaning.
• Payment due within 7 days. Accepted: Direct Debit, Bank Transfer, Card (no cash).
  Cancelling a Direct Debit doesn't cancel service — give 48 hours’ notice.
  Overdue accounts may incur fees / be referred to collections.
• Keep contact & payment details up to date. Zero tolerance for abuse.
• We may place a small service tag on your bin. Discounts discretionary.
  After the minimum term, plans continue on a rolling 30-day basis (30 days’ notice to cancel).
• You consent to us storing your details and contacting you about your service.
• Text reminders are a courtesy — you’re responsible for knowing your schedule.
`;

// ---------- helpers ----------
const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function tosHtmlBlock(version, timestampIso) {
  const when = timestampIso
    ? new Date(timestampIso).toLocaleString("en-GB", { timeZone: "Europe/London" })
    : "—";
  return `
    <h3 style="margin:16px 0 6px">Terms of Service confirmation</h3>
    <p style="margin:0 0 10px">
      Version: <strong>${escapeHtml(version || TERMS_VERSION_DEFAULT)}</strong><br>
      Confirmed at: <strong>${escapeHtml(when)}</strong>
    </p>
    <pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px;border:1px solid #eee;margin:0">${escapeHtml(TERMS_BODY)}</pre>
  `;
}

const fmtGBP = (n) => {
  const x = Math.round((Number(n) || 0) * 100) / 100;
  return `£${x % 1 === 0 ? x.toFixed(0) : x.toFixed(2)}`;
};

// Builds pricing block from the client "pricing" object (sent by your React modal)
function buildPricingBlocks(pricing, discountCode) {
  const code = (discountCode || "").trim();
  const hasPricing = pricing && Array.isArray(pricing.lines) && pricing.lines.length > 0;

  // If the UI didn't send pricing yet, we still show something sensible
  if (!hasPricing) {
    const text =
`Pricing:
(No pricing breakdown provided)

Discount Code: ${code || "None"}`;
    const html = `
      <h3 style="margin:16px 0 6px">Pricing</h3>
      <p style="margin:0 0 8px;color:#6b7280">(No pricing breakdown provided)</p>
      <p style="margin:0"><strong>Discount Code:</strong> ${escapeHtml(code || "None")}</p>
    `;
    return { text, html, applied: false };
  }

  const lines = pricing.lines;
  const anyDiscounted = lines.some((l) => !!l.discounted);
  const applied = !!code && anyDiscounted;

  const textLines = lines.map((l) => {
    const type = String(l.type || "").replace(" Bin", "");
    const planLabel = l.planLabel || "";
    const each = fmtGBP(l.unitPrice);
    const total = fmtGBP(l.lineTotal);
    const badge = l.discounted ? " (discounted)" : "";
    return `${l.count}x ${type} — ${planLabel} @ ${each}${badge} = ${total}`;
  });

  const subtotal = fmtGBP(pricing.subtotal);
  const total = fmtGBP(pricing.total);

  const text =
`Pricing:
${textLines.join("\n")}

Subtotal: ${subtotal}
Total: ${total}

Discount Code: ${code || "None"}${code ? (applied ? " (applied)" : " (not applied)") : ""}`;

  const htmlLines = lines
    .map((l) => {
      const type = escapeHtml(String(l.type || "").replace(" Bin", ""));
      const planLabel = escapeHtml(l.planLabel || "");
      const each = escapeHtml(fmtGBP(l.unitPrice));
      const totalLine = escapeHtml(fmtGBP(l.lineTotal));
      const badge = l.discounted ? ` <span style="color:#059669;font-weight:700">(discounted)</span>` : "";
      return `<div style="margin:0 0 6px">${escapeHtml(String(l.count || 1))}x <strong>${type}</strong> — ${planLabel} @ ${each}${badge} = <strong>${totalLine}</strong></div>`;
    })
    .join("");

  const html = `
    <h3 style="margin:16px 0 6px">Pricing</h3>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px">
      ${htmlLines}
      <div style="margin-top:10px;border-top:1px solid #e5e7eb;padding-top:10px;display:flex;justify-content:space-between">
        <div style="color:#374151">Subtotal</div>
        <div style="font-weight:700">${escapeHtml(subtotal)}</div>
      </div>
      <div style="margin-top:6px;display:flex;justify-content:space-between">
        <div style="color:#111827;font-weight:700">Total</div>
        <div style="font-weight:800">${escapeHtml(total)}</div>
      </div>
    </div>
    <p style="margin:10px 0 0"><strong>Discount Code:</strong> ${escapeHtml(code || "None")}${code ? (applied ? " <span style='color:#059669;font-weight:700'>(applied)</span>" : " <span style='color:#dc2626;font-weight:700'>(not applied)</span>") : ""}</p>
  `;

  return { text, html, applied };
}

// ---------- function ----------
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const {
      name = "",
      address = "",
      phone = "",
      email = "",
      bins = [],
      placeId = "",
      lat = null,
      lng = null,
      source = "website",

      // NEW: discount + pricing (sent from UI)
      discountCode = null,
      pricing = null,

      // ToS fields coming from the UI
      termsAccepted = false,
      termsVersion = TERMS_VERSION_DEFAULT,
      termsAcceptanceText = `I confirm I’ve read and agree to the Ni Bin Guy Terms of Service (v${TERMS_VERSION_DEFAULT}).`,
      termsTimestamp = new Date().toISOString(),
    } = payload;

    // Bins formatting
    const filteredBins = (Array.isArray(bins) ? bins : []).filter((b) => b && b.type);

    // Support both old `frequency` and new `planId` (nice for backward compatibility)
    const binsText =
      filteredBins
        .map((b) => {
          const planOrFreq = b.planId ? `plan: ${b.planId}` : (b.frequency || "");
          return `${b.count || 1} x ${b.type} (${planOrFreq})`;
        })
        .join("\n") || "(none provided)";

    const binsHtml =
      filteredBins
        .map((b) => {
          const planOrFreq = b.planId ? `plan: ${escapeHtml(b.planId)}` : escapeHtml(b.frequency || "");
          return `${escapeHtml(b.count || 1)} x ${escapeHtml(b.type)} (${planOrFreq})`;
        })
        .join("<br>") || "(none provided)";

    // ToS text for plain text email
    const tosText = termsAccepted
      ? (termsAcceptanceText || `Customer accepted Ni Bin Guy Terms of Service (v${termsVersion}).`)
      : "Customer did NOT include a terms confirmation flag.";

    // Pricing blocks
    const pricingBlocks = buildPricingBlocks(pricing, discountCode);

    // ---------- ADMIN EMAIL ----------
    const subjectAdmin = `🗑️ New Bin Cleaning Booking (${source})`;
    const textAdmin =
`New Bin Cleaning Booking

Name: ${name}
Email: ${email}
Phone: ${phone}
Address: ${address}
${lat != null && lng != null ? `Geo: ${lat}, ${lng}\n` : ""}${placeId ? `Place ID: ${placeId}\n` : ""}

Bins:
${binsText}

${pricingBlocks.text}

— TERMS —
Accepted: ${termsAccepted ? "yes" : "no"}
Version: ${termsVersion}
Confirmed: ${termsTimestamp}
Acceptance line: ${termsAcceptanceText}
`;

    const htmlAdmin = `
      <h2>New Bin Cleaning Booking</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Address:</strong> ${escapeHtml(address)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      ${lat != null && lng != null ? `<p><strong>Geo:</strong> ${escapeHtml(String(lat))}, ${escapeHtml(String(lng))}</p>` : ""}
      ${placeId ? `<p><strong>Place ID:</strong> ${escapeHtml(placeId)}</p>` : ""}
      <p><strong>Bins:</strong><br>${binsHtml}</p>

      ${pricingBlocks.html}

      <hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb" />
      <div style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb">
        <p style="margin:0 0 6px 0"><strong>TERMS</strong> <span style="color:#6b7280">(v${escapeHtml(termsVersion)})</span></p>
        <p style="margin:0 0 6px 0"><em>${escapeHtml(termsAcceptanceText)}</em></p>
        ${tosHtmlBlock(termsVersion, termsTimestamp)}
      </div>

      <p style="color:#6b7280;font-size:12px;margin-top:12px">Source: ${escapeHtml(source)}</p>
    `;

    await resend.emails.send({
      from: FROM_DEFAULT,
      to: TO_ADMIN,
      subject: subjectAdmin,
      text: textAdmin,
      html: htmlAdmin,
      reply_to: email || undefined,
    });

    // ---------- CUSTOMER EMAIL (receipt + ToS) ----------
    if (email) {
      const subjectCustomer = `Your Ni Bin Guy booking & Terms confirmation (v${termsVersion})`;

      const textCustomer =
`Thanks ${name},

We've received your booking. Here is your booking summary (including pricing) and your Terms confirmation.

Name: ${name}
Phone: ${phone}
Address: ${address}

Bins:
${binsText}

${pricingBlocks.text}

Terms:
Accepted: ${termsAccepted ? "yes" : "no"}
Version: ${termsVersion}
Confirmed: ${termsTimestamp}

We’ll be in touch to confirm your schedule.`;

      const htmlCustomer = `
        <h2>Thanks, ${escapeHtml(name)} — your booking is in!</h2>
        <p>We’ve received your details and your Terms confirmation. We’ll be in touch to confirm your schedule.</p>

        <h3 style="margin:16px 0 6px">Booking summary</h3>
        <p><strong>Name:</strong> ${escapeHtml(name)}<br>
           <strong>Phone:</strong> ${escapeHtml(phone)}<br>
           <strong>Address:</strong> ${escapeHtml(address)}</p>

        <p><strong>Bins:</strong><br>${binsHtml}</p>

        ${pricingBlocks.html}

        ${tosHtmlBlock(termsVersion, termsTimestamp)}
      `;

      await resend.emails.send({
        from: FROM_DEFAULT,
        to: email,
        subject: subjectCustomer,
        text: textCustomer,
        html: htmlCustomer,
        reply_to: TO_ADMIN,
      });
    }

    // ---------- OPTIONAL AUDIT LOG (Blobs) ----------
    if (getStoreSafe) {
      try {
        const store = getStoreSafe("tos-confirmations");
        const key = `${new Date().toISOString()}__${(email || phone || "unknown").replace(/[^a-z0-9@.+_-]/gi, "_")}.json`;
        await store.setJSON(key, {
          channel: "email",
          name, email, phone, address, bins,
          placeId, lat, lng, source,
          discountCode: discountCode || null,
          pricing: pricing || null,
          termsAccepted, termsVersion, termsAcceptanceText,
          termsTimestamp,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("Blobs log skipped:", e.message);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error("sendBookingEmail failed:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Email send failed" }) };
  }
};
