// netlify/functions/sendBookingEmail.js
const { Resend } = require("resend");

// Initialize Resend with your environment variable
const resend = new Resend(process.env.RESEND_API_KEY);

// Small helper to prevent HTML injection
const escapeHtml = (s) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

exports.handler = async (event) => {
  // Optional: leave this while testing, then remove
  // console.log("Resend API Key present:", !!process.env.RESEND_API_KEY);

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const {
      name = "",
      address = "",
      phone = "",
      email = "",
      bins = [],
    } = payload;

    const formattedBinsText = bins
      .filter((b) => b && b.type)
      .map((b) => `${b.count || 1} x ${b.type} (${b.frequency || ""})`)
      .join("\n");

    const formattedBinsHtml = bins
      .filter((b) => b && b.type)
      .map(
        (b) =>
          `${escapeHtml(b.count || 1)} x ${escapeHtml(b.type)} (${escapeHtml(
            b.frequency || ""
          )})`
      )
      .join("<br>");

    const subject = "🗑️ New Bin Cleaning Booking";

    const text = `New Bin Cleaning Booking Received

Name: ${name}
Email: ${email}
Phone: ${phone}
Address: ${address}

Bins:
${formattedBinsText}
`;

    const html = `
      <h2>New Bin Cleaning Booking Received</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Address:</strong> ${escapeHtml(address)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Bins:</strong><br>${formattedBinsHtml}</p>
    `;

    const response = await resend.emails.send({
      from: "Ni Bin Guy <noreply@nibing.uy>",
      to: "aabincleaning@gmail.com",
      subject,
      text,
      html,
      // lets you click "Reply" to reply to the customer
      reply_to: email || undefined,
    });

    // console.log("Resend API Response:", response);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("Booking email failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Email send failed" }),
    };
  }
};
