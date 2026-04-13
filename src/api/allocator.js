/**
 * Spend Allocation Engine
 *
 * Gradient search optimizer over revenue models fitted from 764 days of
 * historical spend-and-revenue data. Optimizes LTV-adjusted contribution
 * margin subject to MER ceiling and per-channel minimum floors.
 *
 * Source: ssm_command_center_v6.jsx (lines 1–440)
 * Handoff: Spend_Allocation_Engine_Handoff.md
 */

// ============================================================
// 1. REVENUE MODELS
// ============================================================

// Amazon power law — fitted via log-log OLS on 764 days
// amzRev = 83.8453 × amzSpend^0.7224
const AMZ_FIT = {
  a: 83.8453,
  b: 0.7224,
  predict: (x) => 83.8453 * Math.pow(Math.max(x, 100), 0.7224),
  n: 764,
};

// Shopify power law — non-Amazon spend drives Shopify platform revenue
// shopRev = 730.9292 × nonAmzSpend^0.4804
const SHOP_FIT = {
  a: 730.9292,
  b: 0.4804,
  predict: (x) => 730.9292 * Math.pow(Math.max(x, 100), 0.4804),
  n: 764,
};

// Walmart logistic saturation
// walRev = 5000 × (1 - e^(-walSpend × 10.16 / 5000))
const WAL_ROAS = 10.16;
const WAL_CEILING = 5000;
function walRevenue(walSp) {
  return walSp > 0
    ? WAL_CEILING * (1 - Math.exp((-walSp * WAL_ROAS) / WAL_CEILING))
    : 0;
}

// Meta halo effect — awareness lift on Amazon branded search
// haloRev = 14000 × (1 - e^(-metaSpend / 1000))
const HALO_CEILING = 14000;
const HALO_HALF = 1000;
function metaHalo(metaSp) {
  return HALO_CEILING * (1 - Math.exp(-metaSp / HALO_HALF));
}

// Full projection: given 5-channel spend vector → platform revenues
export function projectRevenue(amzSp, gglSp, metaSp, msftSp, walSp) {
  const nonAmzSp = gglSp + metaSp + msftSp;
  const amzRev = AMZ_FIT.predict(amzSp) + metaHalo(metaSp);
  const shopRev = SHOP_FIT.predict(nonAmzSp);
  const walRev = walRevenue(walSp);
  const total = amzRev + shopRev + walRev;
  return {
    total,
    amz: amzRev,
    shop: shopRev,
    wal: walRev,
    nonAmzSp,
    halo: metaHalo(metaSp),
  };
}

// ============================================================
// 2. MARGIN MODEL — calibrated on 17,773 real orders
// ============================================================

export const MARGIN = {
  amz: { cogs: 0.443, fees: 0.113, ship: 0.125, net: 0.318, n: 12182 },
  shop: { cogs: 0.429, fees: 0.042, ship: 0.108, net: 0.422, n: 4140 },
  wal: { cogs: 0.406, fees: 0.108, ship: 0.112, net: 0.374, n: 255 },
  newCustPremium: 2.5,
  repeatShare: 0.35,
  // Amazon AOV tiers (informational — not yet consumed by optimizer)
  amzTiers: {
    sub300: { share: 0.43, margin: -0.03, n: 4901 },
    mid: { share: 0.21, margin: 0.144, n: 2380 },
    high: { share: 0.36, margin: 0.335, n: 4215 },
  },
};

// LTV-adjusted contribution projection
export function projectContribution(amzSp, gglSp, metaSp, msftSp, walSp) {
  const rev = projectRevenue(amzSp, gglSp, metaSp, msftSp, walSp);
  const totalSp = amzSp + gglSp + metaSp + msftSp + walSp;
  const amzContrib = rev.amz * MARGIN.amz.net - amzSp;
  const shopContrib = rev.shop * MARGIN.shop.net - (gglSp + metaSp + msftSp);
  const walContrib = rev.wal * MARGIN.wal.net - walSp;
  const gross = amzContrib + shopContrib + walContrib;
  const newShare = 1 - MARGIN.repeatShare;
  const ltvAdj =
    gross * (MARGIN.repeatShare + newShare * MARGIN.newCustPremium);
  return {
    ...rev,
    amzContrib,
    shopContrib,
    walContrib,
    grossContrib: gross,
    ltvContrib: ltvAdj,
    totalSp,
  };
}

// ============================================================
// 3. CHANNEL CONSTRAINTS
// ============================================================

// Operational floors — below these, organic rankings/feed visibility collapse
export const CH_MINS = {
  amz: 8000,
  ggl: 800,
  meta: 200,
  msft: 0,
  wal: 0,
};

// Default budget mix (starting point for gradient search)
const DEFAULT_MIX = {
  amz: 0.8,
  ggl: 0.12,
  meta: 0.04,
  msft: 0.025,
  wal: 0.015,
};

// Default daily budgets
export const DEFAULT_BUDGETS = {
  amz: 14000,
  ggl: 2400,
  meta: 600,
  msft: 434,
  wal: 0,
};

// ============================================================
// 4. SUB-CHANNEL BREAKDOWN
// ============================================================

export const SUB_CH = {
  amz: [
    { id: "sp_brand", name: "SP Branded", share: 0.2, roas: 8.5, note: "Defense — rank maintenance" },
    { id: "sp_cat", name: "SP Category", share: 0.4, roas: 3.2, note: "Growth — new customer acquisition" },
    { id: "sb", name: "Sponsored Brands", share: 0.2, roas: 4.1, note: "Awareness — top-of-search placement" },
    { id: "sd", name: "Sponsored Display", share: 0.2, roas: 2.8, note: "Retargeting — cart & view remarketing" },
  ],
  ggl: [
    { id: "shopping", name: "Shopping", share: 0.6, roas: 5.2, note: "Core — product feed campaigns" },
    { id: "search", name: "Search", share: 0.25, roas: 3.8, note: "Brand + category text ads" },
    { id: "pmax", name: "PMax", share: 0.15, roas: 2.5, note: "ML-optimized — test & learn" },
  ],
  meta: [
    { id: "prospect", name: "Prospecting", share: 0.65, roas: 1.8, note: "LAL + interest — top of funnel, drives halo" },
    { id: "retarget", name: "Retargeting", share: 0.35, roas: 6.2, note: "Site visitors + cart abandoners" },
  ],
  msft: [
    { id: "shopping", name: "Shopping", share: 0.7, roas: 4.5, note: "Bing Shopping feeds" },
    { id: "search", name: "Search", share: 0.3, roas: 3.0, note: "Bing text ads" },
  ],
};

// ============================================================
// 5. PROMO CALENDAR + SPEND MULTIPLIER
// ============================================================

export const PROMOS = [
  { name: "New Years Sale", start: "1/1", end: "1/8", code: "NY2026" },
  { name: "President's Day Sale", start: "2/10", end: "2/22", code: "PRES26" },
  { name: "Big Spring Sale", start: "3/15", end: "4/2", code: "SPRING26" },
  { name: "Easter Sale", start: "4/3", end: "4/6", code: "EASTER26" },
  { name: "Memorial Day Sale", start: "5/18", end: "5/28", code: "MEM26" },
  { name: "Fourth of July Sale", start: "6/28", end: "7/6", code: "JULY4" },
  { name: "Summer Prime", start: "7/7", end: "7/13", code: "PRIME26" },
  { name: "Back to School", start: "8/1", end: "8/15", code: "BTS26" },
  { name: "Labor Day Sale", start: "8/25", end: "9/3", code: "LABOR26" },
  { name: "Fall Prime", start: "10/6", end: "10/14", code: "FPRIME26" },
  { name: "Veterans Day Sale", start: "11/9", end: "11/12", code: "VET26" },
  { name: "BFCM", start: "11/19", end: "12/2", code: "BFCM26" },
  { name: "Holiday Sale", start: "12/15", end: "12/26", code: "HOLIDAY26" },
];

// Google Trends weekly time series (mattress-related queries, 0-100 normalized)
const TRENDS = {
  "1/1": 82, "1/8": 78, "1/15": 75, "1/22": 72, "1/29": 70,
  "2/5": 68, "2/12": 72, "2/19": 80, "2/26": 74,
  "3/5": 70, "3/12": 68, "3/19": 72, "3/26": 75,
  "4/2": 70, "4/9": 60, "4/16": 58, "4/23": 56, "4/30": 57,
  "5/7": 58, "5/14": 60, "5/21": 78, "5/28": 75,
  "6/4": 65, "6/11": 62, "6/18": 60, "6/25": 64,
  "7/2": 72, "7/9": 68, "7/16": 60, "7/23": 58, "7/30": 58,
  "8/6": 62, "8/13": 60, "8/20": 58, "8/27": 68,
  "9/3": 64, "9/10": 58, "9/17": 56, "9/24": 57,
  "10/1": 58, "10/8": 72, "10/15": 65, "10/22": 62, "10/29": 68,
  "11/5": 70, "11/12": 75, "11/19": 92, "11/23": 100, "11/26": 95,
  "12/3": 82, "12/10": 78, "12/17": 80, "12/24": 78, "12/28": 85,
};

function parseMD(s) {
  const parts = s.split("/");
  return [parseInt(parts[0]), parseInt(parts[1])];
}

function dayOfYear(m, d) {
  const days = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  return days[m - 1] + d;
}

export function getPromoContext(dateStr) {
  // Accept "M/D" or "YYYY-MM-DD" format
  let m, d;
  if (dateStr.includes("-")) {
    const parts = dateStr.split("-");
    m = parseInt(parts[1]);
    d = parseInt(parts[2]);
  } else {
    [m, d] = parseMD(dateStr);
  }
  const doy = dayOfYear(m, d);

  for (const p of PROMOS) {
    const [sm, sd] = parseMD(p.start);
    const [em, ed] = parseMD(p.end);
    const startDoy = dayOfYear(sm, sd);
    const endDoy = dayOfYear(em, ed);
    if (doy >= startDoy && doy <= endDoy) {
      const progress = (doy - startDoy) / Math.max(endDoy - startDoy, 1);
      let trend = 65;
      for (const k in TRENDS) {
        const [tm, td] = parseMD(k);
        if (dayOfYear(tm, td) <= doy) trend = TRENDS[k];
      }
      return {
        promo: p.name,
        phase: progress < 0.15 ? "lead-in" : progress > 0.85 ? "lead-out" : "peak",
        progress,
        trend,
        code: p.code,
      };
    }
  }
  return { promo: null, phase: "off", progress: 0, trend: 60, code: null };
}

export function getSpendMultiplier(dateStr, maxMult = 1.5) {
  const ctx = getPromoContext(dateStr);
  if (!ctx.promo) return { mult: 1, ctx };
  const trendFactor = ctx.trend / 70;
  let mult = 1;
  if (ctx.phase === "lead-in") {
    mult = 1 + (maxMult - 1) * Math.pow(ctx.progress / 0.15, 1.5) * trendFactor * 0.6;
  } else if (ctx.phase === "peak") {
    const peakShape = 1 - 0.2 * Math.pow(2 * ((ctx.progress - 0.15) / 0.7) - 1, 2);
    mult = 1 + (maxMult - 1) * peakShape * trendFactor;
  } else {
    // lead-out
    const decay = 1 - (ctx.progress - 0.85) / 0.15;
    mult = 1 + (maxMult * 0.3 - 0.3) * decay * trendFactor;
  }
  return { mult: Math.max(1, Math.min(mult, maxMult)), ctx };
}

// ============================================================
// 6. THE ALLOCATOR — GRADIENT SEARCH OPTIMIZER
// ============================================================

/**
 * Recommend a budget allocation that maximizes LTV-adjusted contribution
 * subject to a MER ceiling and per-channel minimum floors.
 *
 * @param {number} totalBudget - Total daily ad budget in dollars
 * @param {number} maxMER - Maximum allowed MER (spend/revenue × 100), e.g. 15.5
 * @param {number} spendMult - Promo ramp multiplier (1.0 = normal)
 * @returns {object} allocation, predictions, metadata
 */
export function recommendAllocation(totalBudget, maxMER = 16, spendMult = 1) {
  const adjusted = totalBudget * spendMult;
  const CHS = ["amz", "ggl", "meta", "msft", "wal"];

  // Initialize from default mix
  let best = {};
  for (const ch of CHS) {
    best[ch] = Math.round(adjusted * DEFAULT_MIX[ch]);
  }

  let bestScore = -Infinity;

  // Relax MER ceiling during promo ramps (30% of multiplier excess)
  const effectiveCeiling =
    spendMult > 1.05 ? maxMER * (1 + (spendMult - 1) * 0.3) : maxMER;

  let iterations = 0;
  for (let iter = 0; iter < 50; iter++) {
    let improved = false;
    for (let i = 0; i < CHS.length; i++) {
      for (let j = 0; j < CHS.length; j++) {
        if (i === j) continue;
        const test = { ...best };
        const shift = CHS[i] === "amz" ? 500 : 100;
        if (test[CHS[i]] - shift < CH_MINS[CHS[i]]) continue;
        test[CHS[i]] -= shift;
        test[CHS[j]] += shift;
        const c = projectContribution(
          test.amz, test.ggl, test.meta, test.msft, test.wal
        );
        const mer = c.totalSp > 0 ? (c.totalSp / c.total) * 100 : 100;
        if (c.ltvContrib > bestScore && mer <= effectiveCeiling) {
          bestScore = c.ltvContrib;
          best = test;
          improved = true;
        }
      }
    }
    iterations = iter + 1;
    if (!improved) break;
  }

  // Compute final projections
  const final = projectContribution(
    best.amz, best.ggl, best.meta, best.msft, best.wal
  );
  const mer = final.totalSp > 0 ? (final.totalSp / final.total) * 100 : 0;
  const roas = final.totalSp > 0 ? final.total / final.totalSp : 0;

  // Sub-channel breakdown
  const subChannels = {};
  for (const ch of Object.keys(SUB_CH)) {
    if (best[ch] > 0) {
      subChannels[ch] = SUB_CH[ch].map((sc) => ({
        ...sc,
        budget: Math.round(best[ch] * sc.share),
      }));
    }
  }

  return {
    allocation: best,
    predictions: {
      totalRevenue: Math.round(final.total),
      amzRevenue: Math.round(final.amz),
      shopRevenue: Math.round(final.shop),
      walRevenue: Math.round(final.wal),
      metaHalo: Math.round(final.halo),
      mer: parseFloat(mer.toFixed(2)),
      roas: parseFloat(roas.toFixed(2)),
      grossContrib: Math.round(final.grossContrib),
      ltvContrib: Math.round(final.ltvContrib),
      amzContrib: Math.round(final.amzContrib),
      shopContrib: Math.round(final.shopContrib),
      walContrib: Math.round(final.walContrib),
    },
    subChannels,
    metadata: {
      iterationsUsed: iterations,
      effectiveCeiling: parseFloat(effectiveCeiling.toFixed(2)),
      spendMult,
      totalBudget,
      adjustedBudget: Math.round(adjusted),
    },
  };
}

// ============================================================
// 7. MODEL HEALTH — REFIT AND DRIFT TRACKING
// ============================================================

export function fitPowerFull(pts) {
  const valid = pts.filter((p) => p[0] > 0 && p[1] > 0);
  const n = valid.length;
  if (n < 10) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const p of valid) {
    const lx = Math.log(p[0]),
      ly = Math.log(p[1]);
    sx += lx;
    sy += ly;
    sxx += lx * lx;
    sxy += lx * ly;
  }
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const a = Math.exp((sy - b * sx) / n);
  const meanY = sy / n;
  let ssTot = 0, ssRes = 0;
  for (const p of valid) {
    const ly = Math.log(p[1]);
    const pred = Math.log(a) + b * Math.log(p[0]);
    ssTot += (ly - meanY) ** 2;
    ssRes += (ly - pred) ** 2;
  }
  const r2 = 1 - ssRes / ssTot;
  return {
    a, b, r2, n,
    predict: (x) => a * Math.pow(Math.max(x, 100), b),
  };
}

// Channel labels for UI
export const CHANNEL_CONFIG = {
  amz: { label: "Amazon", color: "#FF9900", sliderStep: 500, sliderMin: 8000, sliderMax: 25000 },
  ggl: { label: "Google", color: "#4285F4", sliderStep: 100, sliderMin: 0, sliderMax: 6000 },
  meta: { label: "Meta", color: "#1877F2", sliderStep: 100, sliderMin: 0, sliderMax: 3000 },
  msft: { label: "Microsoft", color: "#00A4EF", sliderStep: 100, sliderMin: 0, sliderMax: 2000 },
  wal: { label: "Walmart", color: "#0071CE", sliderStep: 100, sliderMin: 0, sliderMax: 2000 },
};
