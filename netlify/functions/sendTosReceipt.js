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
const TO_ADMIN     = process.env.BOOKINGS_TO || "aabincleaning@gmail.com";
const TERMS_VERSION_DEFAULT = "September 2025";

const escapeHtml = (s) => String(s ?? "")
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const {
      name="", email="", phone="", address="",
      bins=[], source="whatsapp",
      termsAccepted = true,
      termsVersion = TERMS_VERSION_DEFAULT,
      termsAcceptanceText = `I confirm I’ve read and agree to the Ni Bin Guy Terms of Service (v${TERMS_VERSION_DEFAULT}).`,
      termsTimestamp = new Date().toISOString(),
    } = JSON.parse(event.body || "{}");

    const binsText = (Array.isArray(bins) ? bins : [])
      .filter(b => b && b.type)
      .map(b => `${b.count || 1} x ${b.type} (${b.frequency || ""})`)
      .join("\n") || "(none provided)";

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
        <p><strong>Bins:</strong><br>${escapeHtml(binsText).replace(/\n/g,"<br>")}</p>
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
        subject: `Your Ni Bin Guy booking & Terms confirmation (v${termsVersion})`,
        text:
`Thanks ${name},

We’ve received your WhatsApp booking. Here is your summary and your Terms confirmation.

Address: ${address}
Bins:
${binsText}

Terms:
Accepted: ${termsAccepted ? "yes" : "no"}
Version: ${termsVersion}
Confirmed: ${termsTimestamp}

We’ll be in touch to confirm your schedule.`,
        html: `
          <h2>Thanks, ${escapeHtml(name)} — we’ve received your WhatsApp booking</h2>
          <p><strong>Address:</strong> ${escapeHtml(address)}</p>
          <p><strong>Bins:</strong><br>${escapeHtml(binsText).replace(/\n/g,"<br>")}</p>
          <h3>Terms confirmation</h3>
          <p>Version: <strong>${escapeHtml(termsVersion)}</strong><br>
             Confirmed: <strong>${escapeHtml(termsTimestamp)}</strong></p>
          <p><em>${escapeHtml(termsAcceptanceText)}</em></p>
        `
      });
    }

    // Optional: log to Blobs
    if (getStoreSafe) {
      try {
        const store = getStoreSafe("tos-confirmations");
        const key = `${termsTimestamp}__${(email || phone || "unknown").replace(/[^a-z0-9@.+_-]/gi,"_")}.json`;
        await store.setJSON(key, {
          channel: "whatsapp",
          name, email, phone, address, bins,
          termsAccepted, termsVersion, termsAcceptanceText, termsTimestamp,
          createdAt: new Date().toISOString(),
        });
      } catch (e) { console.warn("Blobs log skipped:", e.message); }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error("sendTosReceipt error:", e);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed" }) };
  }
};
