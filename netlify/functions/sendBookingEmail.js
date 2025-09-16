// netlify/functions/sendBookingEmail.js
const { Resend } = require("resend");

// Initialize Resend with your environment variable
const resend = new Resend(process.env.RESEND_API_KEY);

// Small helper to prevent HTML injection
const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

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
      // optional geo/context
      placeId = "",
      lat = null,
      lng = null,
      source = "website",
      // Terms of Service flags (NEW)
      termsAccepted = false,
      termsVersion = "",
      termsAcceptanceText = "",
    } = payload;

    // Format bins
    const filteredBins = (Array.isArray(bins) ? bins : []).filter((b) => b && b.type);
    const formattedBinsText =
      filteredBins
        .map((b) => `${b.count || 1} x ${b.type} (${b.frequency || ""})`)
        .join("\n") || "(none provided)";

    const formattedBinsHtml =
      filteredBins
        .map(
          (b) =>
            `${escapeHtml(b.count || 1)} x ${escapeHtml(b.type)} (${escapeHtml(
              b.frequency || ""
            )})`
        )
        .join("<br>") || "(none provided)";

    // Build ToS block (NEW)
    const tosText = termsAccepted
      ? (termsAcceptanceText ||
         `Customer confirmed acceptance of Ni Bin Guy Terms of Service${termsVersion ? ` (v${termsVersion})` : ""}.`)
      : "Customer did NOT include a terms confirmation flag.";

    const tosHtml = escapeHtml(tosText);

    // Build geo/context lines
    const geoText =
      lat != null && lng != null ? `\nGeo: ${lat}, ${lng}` : "";
    const placeIdText = placeId ? `\nPlace ID: ${placeId}` : "";

    // Subject
    const subject = `🗑️ New Bin Cleaning Booking (${source})`;

    // Plain text body
    const text = `New Bin Cleaning Booking Received

Name: ${name}
Email: ${email}
Phone: ${phone}
Address: ${address}${geoText}${placeIdText}

Bins:
${formattedBinsText}

— TERMS —
${tosText}
`;

    // HTML body
    const html = `
      <h2>New Bin Cleaning Booking Received</h2>

      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Address:</strong> ${escapeHtml(address)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      ${
        lat != null && lng != null
          ? `<p><strong>Geo:</strong> ${escapeHtml(String(lat))}, ${escapeHtml(String(lng))}</p>`
          : ""
      }
      ${placeId ? `<p><strong>Place ID:</strong> ${escapeHtml(placeId)}</p>` : ""}

      <p><strong>Bins:</strong><br>${formattedBinsHtml}</p>

      <hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb" />
      <div style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb">
        <p style="margin:0 0 6px 0"><strong>TERMS</strong>${
          termsVersion ? ` <span style="color:#6b7280">(v${escapeHtml(termsVersion)})</span>` : ""
        }</p>
        <p style="margin:0;white-space:pre-line">${tosHtml}</p>
      </div>

      <p style="color:#6b7280;font-size:12px;margin-top:12px">Source: ${escapeHtml(source)}</p>
    `;

    // Send email (adjust "from" to a verified domain/sender in Resend)
    const response = await resend.emails.send({
      from: "Ni Bin Guy <noreply@nibing.uy>",
      to: "aabincleaning@gmail.com",
      subject,
      text,
      html,
      reply_to: email || undefined, // lets you click "Reply" to respond to the customer
    });

    // Uncomment to inspect in logs:
    // console.log("Resend response:", response);

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error("Booking email failed:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Email send failed" }) };
  }
};
