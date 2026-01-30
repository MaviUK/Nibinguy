// netlify/functions/sendTosReceipt.js
const { Resend } = require("resend");

// Optional blobs logging
let getStoreSafe = null;
try {
  const { getStore } = require("@netlify/blobs");
  getStoreSafe = function (name) {
    const siteID = process.env.NETLIFY_SITE_ID || process.env.BLOBS_SITE_ID;
    const token  = process.env.NETLIFY_BLOBS_TOKEN || process.env.BLOBS_TOKEN;
    return (siteID && token) ? getStore({ name, siteID, token }) : getStore({ name });
  };
} catch (_) {}

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_DEFAULT = process.env.RESEND_FROM || "Ni Bin Guy <noreply@nibing.uy>";
const TO_ADMIN     = process.env.BOOKINGS_TO || "info@nibing.uy";
const TERMS_VERSION_DEFAULT = "September 2025";

const escapeHtml = (s) => String(s ?? "")
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

const fmtGBP = (n) => {
  const x = Math.round((Number(n) || 0) * 100) / 100;
  return `£${x % 1 === 0 ? x.toFixed(0) : x.toFixed(2)}`;
};

function buildPricingBlocks(pricing, discountCode) {
  const code = (discountCode || "").trim();
  const hasPricing = pricing && Array.isArray(pricing.lines) && pricing.lines.length > 0;

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

  const htmlLines = lines.map((l) => {
    const type = escapeHtml(String(l.type || "").replace(" Bin", ""));
    const planLabel = escapeHtml(l.planLabel || "");
    const each = escapeHtml(fmtGBP(l.unitPrice));
    const totalLine = escapeHtml(fmtGBP(l.lineTotal));
    const badge = l.discounted ? ` <span style="color:#059669;font-weight:700">(discounted)</span>` : "";
    return `<div style="margin:0 0 6px">${escapeHtml(String(l.count || 1))}x <strong>${type}</strong> — ${planLabel} @ ${each}${badge} = <strong>${totalLine}</strong></div>`;
  }).join("");

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

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const {
      name="", email="", phone="", address="",
      bins=[], source="whatsapp",

      // NEW: discount + pricing from UI
      discountCode = null,
      pricing = null,

      termsAccepted = true,
      termsVersion = TERMS_VERSION_DEFAULT,
      termsAcceptanceText = `I confirm I’ve read and agree to the Ni Bin Guy Terms of Service (v${TERMS_VERSION_DEFAULT}).`,
      termsTimestamp = new Date().toISOString(),
    } = JSON.parse(event.body || "{}");

    const filteredBins = (Array.isArray(bins) ? bins : [])
      .filter(b => b && b.type);

    // Support both old `frequency` and new `planId`
    const binsText = filteredBins
      .map(b => {
        const planOrFreq = b.planId ? `plan: ${b.planId}` : (b.frequency || "");
        return `${b.count || 1} x ${b.type} (${planOrFreq})`;
      })
      .join("\n") || "(none provided)";

    const binsHtml = escapeHtml(binsText).replace(/\n/g,"<br>");

    const pricingBlocks = buildPricingBlocks(pricing, discountCode);

    // ADMIN email
    await resend.emails.send({
      from: FROM_DEFAULT,
      to: TO_ADMIN,
      subject: `🗑️ New booking via WhatsApp (ToS receipt)`,
      text:
`New booking via WhatsApp

Name: ${name}
Email: ${email}
Phone: ${phone}
Address: ${address}

Bins:
${binsText}

${pricingBlocks.text}

— TERMS —
Accepted: ${termsAccepted ? "yes" : "no"}
Version: ${termsVersion}
Confirmed: ${termsTimestamp}
Acceptance line: ${termsAcceptanceText}
Source: ${source}`,
      html: `
        <h2>New booking via WhatsApp</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
        <p><strong>Address:</strong> ${escapeHtml(address)}</p>
        <p><strong>Bins:</strong><br>${binsHtml}</p>

        ${pricingBlocks.html}

        <hr>
        <p><strong>TERMS</strong> <span style="color:#6b7280">(v${escapeHtml(termsVersion)})</span></p>
        <p><em>${escapeHtml(termsAcceptanceText)}</em></p>
        <p>Confirmed: ${escapeHtml(termsTimestamp)}</p>
        <p style="color:#6b7280">Source: ${escapeHtml(source)}</p>
      `
    });

    // CUSTOMER email (if we have an email)
    if (email) {
      await resend.emails.send({
        from: FROM_DEFAULT,
        to: email,
        subject: `Your Ni Bin Guy booking, pricing & Terms confirmation (v${termsVersion})`,
        text:
`Thanks ${name},

We’ve received your WhatsApp booking. Here is your summary (including pricing) and your Terms confirmation.

Address: ${address}

Bins:
${binsText}

${pricingBlocks.text}

Terms:
Accepted: ${termsAccepted ? "yes" : "no"}
Version: ${termsVersion}
Confirmed: ${termsTimestamp}

We’ll be in touch to confirm your schedule.`,
        html: `
