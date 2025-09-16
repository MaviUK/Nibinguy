// netlify/functions/tensec-metrics.js
// npm i @netlify/blobs
const { getStore } = require("@netlify/blobs");

/* ---------- Blobs store with Starter-friendly creds ---------- */
function getStoreSafe(name) {
  const siteID =
    process.env.NETLIFY_SITE_ID ||
    process.env.BLOBS_SITE_ID;
  const token =
    process.env.NETLIFY_BLOBS_TOKEN ||
    process.env.BLOBS_TOKEN;

  if (siteID && token) return getStore({ name, siteID, token });
  return getStore({ name }); // when Netlify auto-injects creds
}

/* ---------------------- Time helpers (UK) ---------------------- */
const TZ = "Europe/London";
const pad2 = (n) => String(n).padStart(2, "0");

function partsInTZ(date = new Date(), timeZone = TZ) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const m = Object.fromEntries(fmt.map(p => [p.type, p.value]));
  return { y: +m.year, m: +m.month, d: +m.day };
}
function ymd(p) { return `${p.y}-${pad2(p.m)}-${pad2(p.d)}`; }
function ym(p) { return `${p.y}-${pad2(p.m)}`; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

// ISO week in UK local time
function isoWeekInTZ(date = new Date(), timeZone = TZ) {
  const { y, m, d } = partsInTZ(date, timeZone);
  // treat local midnight as UTC date to avoid DST drift
  const localMid = new Date(Date.UTC(y, m - 1, d));
  const dayNum = (localMid.getUTCDay() + 6) % 7;  // 0=Mon..6=Sun
  localMid.setUTCDate(localMid.getUTCDate() - dayNum + 3); // Thu
  const firstThu = new Date(Date.UTC(localMid.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((localMid - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return { isoYear: localMid.getUTCFullYear(), week };
}

/* ------------------------- Store utils ------------------------ */
function key(kind, scope, token) {
  // kind: "attempts" | "wins"
  // scope: "total" | "day" | "week" | "month"
  return `${kind}_${scope}_${token}`;
}
async function bump(store, k) {
  const n = parseInt((await store.get(k)) || "0", 10) || 0;
  await store.set(k, String(n + 1));
  return n + 1;
}
async function readInt(store, k) {
  return parseInt((await store.get(k)) || "0", 10) || 0;
}

/* --------------------------- Handler -------------------------- */
exports.handler = async (event) => {
  const store = getStoreSafe("tensec-metrics");

  if (event.httpMethod === "POST") {
    // Body: { kind: "attempt" | "win" }
    const { kind = "attempt" } = JSON.parse(event.body || "{}");
    const bucket = kind === "win" ? "wins" : "attempts";

    const now = new Date();
    const p = partsInTZ(now);
    const dayToken = ymd(p);              // e.g. 2025-09-16
    const { isoYear, week } = isoWeekInTZ(now);
    const weekToken = `${isoYear}-W${pad2(week)}`; // e.g. 2025-W38
    const monthToken = ym(p);             // e.g. 2025-09

    const totalKey = key(bucket, "total", "all");
    const dayKey   = key(bucket, "day", dayToken);
    const weekKey  = key(bucket, "week", weekToken);
    const monthKey = key(bucket, "month", monthToken);

    const total = await bump(store, totalKey);
    const day   = await bump(store, dayKey);
    const weekN = await bump(store, weekKey);
    const month = await bump(store, monthKey);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: true, kind: bucket, totals: { total, day, week: weekN, month } }),
    };
  }

  if (event.httpMethod === "GET") {
    const now = new Date();

    // last 30 days
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(now, -i);
      const token = ymd(partsInTZ(d));
      days.push({ token, date: token });
    }

    // last 12 ISO weeks
    const weeks = [];
    const seen = new Set();
    for (let i = 11; i >= 0; i--) {
      const d = addDays(now, -7 * i);
      const { isoYear, week } = isoWeekInTZ(d);
      const token = `${isoYear}-W${pad2(week)}`;
      if (!seen.has(token)) { seen.add(token); weeks.push({ token }); }
    }

    // last 12 months
    const months = [];
    const { y, m } = partsInTZ(now);
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(Date.UTC(y, (m - 1) - i, 1));
      const token = ym(partsInTZ(dt));
      months.push({ token });
    }

    const attemptsTotal = await readInt(store, key("attempts", "total", "all"));
    const winsTotal     = await readInt(store, key("wins", "total", "all"));

    async function fill(arr, scope) {
      for (const r of arr) {
        r.attempts = await readInt(store, key("attempts", scope, r.token));
        r.wins     = await readInt(store, key("wins",     scope, r.token));
      }
      return arr;
    }

    await fill(days, "day");
    await fill(weeks, "week");
    await fill(months, "month");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({
        ok: true,
        totals: { attempts: attemptsTotal, wins: winsTotal },
        last30Days: days,
        last12Weeks: weeks,
        last12Months: months,
      }),
    };
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};
