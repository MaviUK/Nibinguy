// netlify/functions/sendContactEmail.js
// Requires: npm i resend
// Set env vars in Netlify: RESEND_API_KEY, CONTACT_TO (e.g. info@nibing.uy), RESEND_FROM (verified sender)

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Simple helper to read JSON safely
async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export default async function handler(req, context) {
  // Netlify Functions use: export default async function handler(req, context)
  // If you're on older Netlify runtime, switch to: exports.handler = async (event) => { ... }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await readJson(req);
  if (!body) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { name = "", email = "", phone = "", message = "" } = body;

  // Basic validation
  if (!name.trim() || !email.trim() || !phone.trim() || !message.trim()) {
    return new Response(JSON.stringify({ error: "All fields are required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Compose email
  const to = process.env.CONTACT_TO || "info@nibing.uy";
  const from =
    process.env.RESEND_FROM || "onboarding@resend.dev"; // must be verified in Resend
  const subject = `New Contact Message from ${name}`;
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
      from,
      to,
      subject,
      html,
      text,
      reply_to: email, // so you can reply straight to the customer
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: data?.id || null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// --- helpers ---
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
