// netlify/functions/binCalendar.js

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const uprn = url.searchParams.get("uprn")?.trim();

    if (!uprn) {
      return new Response(JSON.stringify({ error: "Missing uprn" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const upstream = `https://ardsandnorthdownbincalendar.azurewebsites.net/api/calendarhtml/${encodeURIComponent(
      uprn
    )}`;

    const r = await fetch(upstream, {
      headers: { "User-Agent": "nibing-bin-checker/1.0" },
    });

    if (!r.ok) {
      return new Response(
        JSON.stringify({ error: "Upstream error", status: r.status }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Upstream returns JSON (string), not raw HTML
    const text = await r.text();

    let calendarHTML = "";
    try {
      const parsed = JSON.parse(text);
      calendarHTML = String(parsed?.calendarHTML || "");
    } catch {
      // Fallback: if they ever return raw HTML directly
      calendarHTML = String(text || "");
    }

    if (!calendarHTML) {
      return new Response(JSON.stringify({ error: "No calendar HTML returned" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Always return { html: "<div>...</div>" }
    return new Response(JSON.stringify({ html: calendarHTML }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
