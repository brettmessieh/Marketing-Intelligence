/**
 * Spend Allocation Engine (stub)
 * Full implementation pending - see ssm-command-center.zip
 */

export const MARGIN = {
  amz: { cogs: 0.443, fees: 0.113, ship: 0.125, net: 0.318, n: 12182 },
  shop: { cogs: 0.429, fees: 0.042, ship: 0.108, net: 0.422, n: 4140 },
  wal: { cogs: 0.406, fees: 0.108, ship: 0.112, net: 0.374, n: 255 },
  newCustPremium: 2.5,
  repeatShare: 0.35,
};

export const CH_MINS = { amz: 8000, ggl: 800, meta: 200, msft: 0, wal: 0 };

export const DEFAULT_BUDGETS = { amz: 14000, ggl: 2400, meta: 600, msft: 434, wal: 0 };

export const SUB_CH = {
  amz: [
    { id: "sp_brand", name: "SP Branded", share: 0.2, roas: 8.5, note: "Defense" },
    { id: "sp_cat", name: "SP Category", share: 0.4, roas: 3.2, note: "Growth" },
    { id: "sb", name: "Sponsored Brands", share: 0.2, roas: 4.1, note: "Awareness" },
    { id: "sd", name: "Sponsored Display", share: 0.2, roas: 2.8, note: "Retargeting" },
  ],
  ggl: [
    { id: "shopping", name: "Shopping", share: 0.6, roas: 5.2, note: "Core" },
    { id: "search", name: "Search", share: 0.25, roas: 3.8, note: "Brand + category" },
    { id: "pmax", name: "PMax", share: 0.15, roas: 2.5, note: "ML-optimized" },
  ],
  meta: [
    { id: "prospect", name: "Prospecting", share: 0.65, roas: 1.8, note: "Top of funnel" },
    { id: "retarget", name: "Retargeting", share: 0.35, roas: 6.2, note: "Remarketing" },
  ],
  msft: [
    { id: "shopping", name: "Shopping", share: 0.7, roas: 4.5, note: "Bing Shopping" },
    { id: "search", name: "Search", share: 0.3, roas: 3.0, note: "Bing text ads" },
  ],
};

export const PROMOS = [];

export const CHANNEL_CONFIG = {
  amz: { label: "Amazon", color: "#FF9900", sliderStep: 500, sliderMin: 8000, sliderMax: 25000 },
  ggl: { label: "Google", color: "#4285F4", sliderStep: 100, sliderMin: 0, sliderMax: 6000 },
  meta: { label: "Meta", color: "#1877F2", sliderStep: 100, sliderMin: 0, sliderMax: 3000 },
  msft: { label: "Microsoft", color: "#00A4EF", sliderStep: 100, sliderMin: 0, sliderMax: 2000 },
  wal: { label: "Walmart", color: "#0071CE", sliderStep: 100, sliderMin: 0, sliderMax: 2000 },
};

export function projectRevenue(amzSp, gglSp, metaSp, msftSp, walSp) {
  const total = (amzSp * 3.5) + ((gglSp + metaSp + msftSp) * 2.8) + (walSp * 10);
  return { total, amz: amzSp * 3.5, shop: (gglSp + metaSp + msftSp) * 2.8, wal: walSp * 10, nonAmzSp: gglSp + metaSp + msftSp, halo: 0 };
}

export function projectContribution(amzSp, gglSp, metaSp, msftSp, walSp) {
  const rev = projectRevenue(amzSp, gglSp, metaSp, msftSp, walSp);
  const totalSp = amzSp + gglSp + metaSp + msftSp + walSp;
  return { ...rev, grossContrib: rev.total * 0.35 - totalSp, ltvContrib: (rev.total * 0.35 - totalSp) * 2.0, totalSp };
}

export function recommendAllocation(totalBudget, maxMER = 16, spendMult = 1) {
  const adj = totalBudget * spendMult;
  const allocation = { amz: Math.round(adj * 0.8), ggl: Math.round(adj * 0.12), meta: Math.round(adj * 0.04), msft: Math.round(adj * 0.025), wal: Math.round(adj * 0.015) };
  const pred = projectContribution(allocation.amz, allocation.ggl, allocation.meta, allocation.msft, allocation.wal);
  return {
    allocation,
    predictions: { totalRevenue: Math.round(pred.total), mer: parseFloat((pred.totalSp / pred.total * 100).toFixed(2)), roas: parseFloat((pred.total / pred.totalSp).toFixed(2)), grossContrib: Math.round(pred.grossContrib), ltvContrib: Math.round(pred.ltvContrib) },
    subChannels: {},
    metadata: { iterationsUsed: 1, effectiveCeiling: maxMER, spendMult, totalBudget, adjustedBudget: Math.round(adj) },
  };
}

export function getPromoContext() { return { promo: null, phase: "off", progress: 0, trend: 60, code: null }; }
export function getSpendMultiplier() { return { mult: 1, ctx: getPromoContext() }; }
export function fitPowerFull() { return null; }
