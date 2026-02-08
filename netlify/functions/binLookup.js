// netlify/functions/binLookup.js

function normalizeUkPostcode(raw) {
  const s = String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ""); // remove spaces/punctuation

  // UK postcodes always end with 3 chars (digit + 2 letters)
  if (s.length <= 3) return s;
  return s.slice(0, -3) + " " + s.slice(-3);
}

function decodeHtml(str) {
  return String(str || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const postcodeRaw = url.searchParams.get("postcode");

    if (!postcodeRaw) {
      return new Response(JSON.stringify({ error: "Missing postcode" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const postcode = normalizeUkPostcode(postcodeRaw);

    // This is the page you were on in your screenshot
    const councilUrl =
      "https://www.ardsandnorthdown.gov.uk/article/1141/Bins-and-recycling?postcode=" +
      encodeURIComponent(postcode);

    const res = await fetch(councilUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html",
      },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Council lookup failed" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const html = await res.text();

    // 1) Try the “My address:” block first
    let address = "";
    const myAddr = html.match(/My address:\s*<\/strong>\s*([^<]+)/i);
    if (myAddr?.[1]) address = decodeHtml(myAddr[1]);

    // 2) If there’s an address <select>, parse all options (multi-address postcodes)
    // This regex looks for <option value="SOMETHING">LABEL</option>
    const options = [];
    const optionRe = /<option[^>]*value="([^"]+)"[^>]*>([\s\S]*?)<\/option>/gi;
    let m;
    while ((m = optionRe.exec(html))) {
      const value = decodeHtml(m[1]);
      const label = decodeHtml(m[2].replace(/<[^>]+>/g, " "));
      // filter out placeholder options
      if (!label || /select/i.test(label)) continue;
      options.push({ uprn: value, label });
    }

    // If we found options, return them
    if (options.length) {
      return new Response(
        JSON.stringify({
          postcode,
          addresses: options,
          debug: { mode: "options", councilUrl },
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Otherwise return single address if found
    if (address) {
      return new Response(
        JSON.stringify({
          postcode,
          addresses: [{ uprn: postcode, label: address }],
          debug: { mode: "single", councilUrl },
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Nothing found
    return new Response(
      JSON.stringify({
        postcode,
        addresses: [],
        debug: { mode: "none", councilUrl },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
