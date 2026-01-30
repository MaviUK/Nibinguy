// netlify/functions/sendContactEmail.js
// Requires: npm i resend
// Env vars in Netlify:
//   RESEND_API_KEY
//   CONTACT_TO   (e.g. info@nibing.uy)
//   RESEND_FROM  (must be a VERIFIED sender/domain in Resend, e.g. "Ni Bin Guy <hello@nibinguy.co.uk>")

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ---- helpers ----
async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function jsonResponse(payload, status = 200) {
  // Basic CORS (handy if calling from browser)
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

// ---- handler ----
export default async function handler(req) {
  // Handle preflight (CORS)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Validate required env vars early
  if (!process.env.RESEND_API_KEY) {
    return jsonResponse({ error: "Missing RESEND_API_KEY env var" }, 500);
  }

  const toEnv = process.env.CONTACT_TO || "info@nibing.uy";
  const fromEnv = process.env.RESEND_FROM;

  if (!fromEnv) {
    // IMPORTANT: From must be verified in Resend
    return jsonResponse(
      { error: "Missing RESEND_FROM env var (must be a verified sender in Resend)" },
      500
    );
  }

  const body = await readJson(req);
  if (!body) {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { name = "", email = "", phone = "", message = "" } = body;

  // Basic validation
  if (!name.trim() || !email.trim() || !phone.trim() || !message.trim()) {
    return jsonResponse({ error: "All fields are required." }, 400);
  }

  const subject = `New Contact Message from ${name.trim()}`;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#111">
      <h2>New Contact Message</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
      <p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
      <hr>
      <p style="font-size:13px;color:#555">Sent from nibing.uy contact form</p>
    </div>
  `;

  const text = `New Contact Message

Name: ${name}
Email: ${email}
Phone: ${phone}

Message:
${message}
`;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEnv,
      to: [toEnv],          // <— array is safest
      subject,
      html,
      text,
      replyTo: email.trim() // <— IMPORTANT: Resend uses replyTo (NOT reply_to)
    });

    if (error) {
      console.error("Resend error:", error);
      return jsonResponse({ error: "Failed to send email", details: error }, 500);
    }

    return jsonResponse({ ok: true, id: data?.id || null }, 200);
  } catch (e) {
    console.error("Server error:", e);
    return jsonResponse({ error: "Server error" }, 500);
  }
}
