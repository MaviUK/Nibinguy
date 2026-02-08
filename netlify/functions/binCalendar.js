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

    const html = await r.text();

    return new Response(JSON.stringify({ html }), {
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
