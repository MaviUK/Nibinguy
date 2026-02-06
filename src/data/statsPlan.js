// src/data/statsPlan.js

export const STATS_BASE = {
  totalBinsCleaned: 27452,       // your starting headline number
  monthlyCustomers: 1078,        // starting monthly customer count (or last known)
};

// 4-week repeating plan (weekIndex 0-3)
// Only Mon-Thu used. (Fri/Sat/Sun can be omitted or set null)
export const FOUR_WEEK_PLAN = [
  // Week 1
  {
    Mon: { area: "Comber & Ards",        bins: 110, customers: 79 },
    Tue: { area: "Bangor & Ards",    bins: 95,  customers: 61 },
    Wed: { area: "Comber & Ards",    bins: 120, customers: 73 },
    Thu: { area: "Bangor & Ards",   bins: 105, customers: 81 },
  },
  // Week 2
  {
    Mon: { area: "Holywood",      bins: 100, customers: 73 },
    Tue: { area: "Bangor",        bins: 90,  customers: 67 },
    Wed: { area: "Comber & Ards",        bins: 125, customers: 71 },
    Thu: { area: "Comber",    bins: 105, customers: 75 },
  },
  // Week 3
  {
    Mon: { area: "Portaferry",    bins: 135, customers: 81 },
    Tue: { area: "Ballywalter & Millisle",   bins: 101, customers: 72 },
    Wed: { area: "Donaghadee",        bins: 112,  customers: 71 },
    Thu: { area: "Donaghadee",        bins: 129, customers: 78 },
  },
  // Week 4
  {
    Mon: { area: "Groomsport & Bangor",    bins: 105, customers: 61 },
    Tue: { area: "Bangor",        bins: 115, customers: 75 },
    Wed: { area: "Ards",      bins: 95,  customers: 66 },
    Thu: { area: "Ards & Bangor",    bins: 121, customers: 69 },
  },
];
