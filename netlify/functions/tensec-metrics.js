const { getStore } = require("@netlify/blobs");

function getStoreSafe(name) {
  const siteID =
    process.env.NETLIFY_SITE_ID ||
    process.env.BLOBS_SITE_ID;
  const token =
    process.env.NETLIFY_BLOBS_TOKEN ||
    process.env.BLOBS_TOKEN;

  if (siteID && token) {
    return getStore({ name, siteID, token });
  }
  return getStore({ name }); // fallback if Netlify injects creds automatically
}

exports.handler = async (event) => {
  const store = getStoreSafe("tensec-metrics");

  if (event.httpMethod === "POST") {
    // increment counter
    const key = "attempts:" + new Date().toISOString().slice(0, 10); // per-day key
    const val = (parseInt(await store.get(key), 10) || 0) + 1;
    await store.set(key, String(val));
    return { statusCode: 200, body: JSON.stringify({ ok: true, key, val }) };
  }

  if (event.httpMethod === "GET") {
    // list stats
    const list = await store.list();
    return { statusCode: 200, body: JSON.stringify(list) };
  }

  return { statusCode: 405, body: "Method not allowed" };
};
