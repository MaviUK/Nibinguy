// netlify/functions/tensec-metrics.js
// npm i @netlify/blobs
const { getStore } = require("@netlify/blobs");

// ---- helpers ----
function partsInTZ(date = new Date(), timeZone = "Europe/London") {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const map = Object.fromEntries(fmt.map(p => [p.type, p.value]));
  const y = Number(map.year);
  const m = Number(map.month);
  const d = Number(map.day);
  return { y, m, d };
}

function pad2(n) { return String(n).padStart(2, "0"); }
function ymd({ y, m, d }) { return `${y}-${pad2(m)}-${pad2(d)}`; }
function ym({ y, m }) { return `${y}-${pad2(m)}`; }

// ISO week calc in specific timezone
function isoWeekInTZ(date = new Date(), timeZone = "Europe/London") {
  // get local Y-M-D in tz then treat as local midnight
  const { y, m, d } = partsInTZ(date, timeZone);
  const local = new Date(Date.UTC(y, m - 1, d)); // approximate local midnight to UTC
  // ISO week algorithm (uses UTC to avoid DST surprises now that we've normalized)
  const dayNum = (local.getUTCDay() + 6) % 7; // 0=Mon..6=Sun
  local.setUTCDate(local.getUTCDate() - dayNum + 3); // move to Thu of current week
  const firstThu = new Date(Date.UTC(local.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((local - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  const isoYear = local.getUTCFullYear();
  return { isoYear, week };
}

function key(kind, scope, token) {
  // scope: total | day | week | month
  // token: e.g. 2025-09-16 | 2025-W38 | 2025-09
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

function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function startOfMonthInTZ(date = new Date(), tz = "Europe/London") {
  const { y, m } = partsInTZ(date, tz);
  return new Date(Date.UTC(y, m - 1, 1));
}

// ---- handler ----
exports.handler = async (event) => {
  const store = getStore({ name: "tensec-metrics" });
  const tz = "Europe/London";

  if (event.httpMethod === "POST") {
    const { kind = "attempt" } = JSON.parse(event.body || "{}"); // "attempt" | "win"
    const now = new Date();
    const p = partsInTZ(now, tz);
    const dToken = ymd(p);                       // e.g. 2025-09-16
    const { isoYear, week } = isoWeekInTZ(now, tz);
    const wToken = `${isoYear}-W${pad2(week)}`;  // e.g. 2025-W38
    const mToken = ym(p);                        // e.g. 2025-09

    const bucket = kind === "win" ? "wins" : "attempts";

    const totalKey = key(bucket, "total", "all");
    const dayKey   = key(bucket, "day", dToken);
    const weekKey  = key(bucket, "week", wToken);
    const monthKey = key(bucket, "month", mToken);

    const total = await bump(store, totalKey);
    const day   = await bump(store, dayKey);
    const weekN = await bump(store, weekKey);
    const month = await bump(store, monthKey);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: true, kind, totals: { total, day, week: weekN, month } }),
    };
  }

  if (event.httpMethod === "GET") {
    // Build ranges: last 30 days, 12 ISO weeks, 12 months
    const now = new Date();

    // Days (last 30)
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(now, -i);
      const token = ymd(partsInTZ(d, tz));
      days.push({ token, date: token });
    }

    // Weeks (last 12 ISO weeks)
    const weeks = [];
    // Anchor to today’s ISO week (Mon start)
    for (let i = 11; i >= 0; i--) {
      const d = addDays(now, -7 * i);
      const { isoYear, week } = isoWeekInTZ(d, tz);
      weeks.push({ token: `${isoYear}-W${pad2(week)}` });
    }
    // Deduplicate in case of overlaps around year boundaries
    const seen = new Set(); const uniqWeeks = [];
    for (const w of weeks) { if (!seen.has(w.token)) { seen.add(w.token); uniqWeeks.push(w); } }

    // Months (last 12)
    const months = [];
    let cursor = startOfMonthInTZ(now, tz);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - i, 1));
      const token = ym(partsInTZ(d, tz));
      months.push({ token });
    }

    // Read counts
    const attemptsTotal = await readInt(store, key("attempts", "total", "all"));
    const winsTotal     = await readInt(store, key("wins", "total", "all"));

    async function fill(arr, scope) {
      for (const row of arr) {
        row.attempts = await readInt(store, key("attempts", scope, row.token));
        row.wins     = await readInt(store, key("wins",     scope, row.token));
      }
      return arr;
    }

    await fill(days,  "day");
    await fill(uniqWeeks, "week");
    await fill(months, "month");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({
        ok: true,
        totals: { attempts: attemptsTotal, wins: winsTotal },
        last30Days: days,
        last12Weeks: uniqWeeks,
        last12Months: months,
      }),
    };
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};
