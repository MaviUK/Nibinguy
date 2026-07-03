// bot/rota.js
import { FOUR_WEEK_PLAN } from "../src/data/statsPlan.js"; 
// ^ adjust this import path to wherever your FOUR_WEEK_PLAN lives

const WEEK1_MONDAY_ISO = process.env.ROTATION_WEEK1_MONDAY || "2026-01-05";

/**
 * Return 0..3 for week index based on a fixed Week-1 Monday anchor.
 * Any date maps into one of the 4 weeks, repeating forever.
 */
export function getWeekIndexForDate(dateObj) {
  const anchor = new Date(`${WEEK1_MONDAY_ISO}T00:00:00Z`);
  const d = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()));

  const diffMs = d.getTime() - anchor.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Weeks can be negative (dates before anchor), so wrap safely:
  const diffWeeks = Math.floor(diffDays / 7);
  const mod = ((diffWeeks % 4) + 4) % 4;
  return mod;
}

export function getRotaAreaForDate(dateObj) {
  const day = dateObj.getUTCDay(); // 0=Sun..6=Sat
  const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day];
  if (!["Mon", "Tue", "Wed", "Thu"].includes(dayName)) return null;

  const w = getWeekIndexForDate(dateObj);
  return FOUR_WEEK_PLAN[w]?.[dayName]?.area || null;
}

export function isRotaDay(dateObj) {
  const day = dateObj.getUTCDay();
  return day >= 1 && day <= 4; // Mon..Thu
}
