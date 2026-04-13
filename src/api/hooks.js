import { useState, useEffect, useCallback, useMemo } from "react";
import { xanoFetch, USE_MOCK } from "./xano";

// Input sanitization: ensure IDs are safe integers, encode all URL params
const sanitizeId = (id) => {
  const parsed = parseInt(id, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};
const encParam = (v) => encodeURIComponent(String(v));

// Mock data for SKU Overview
const MOCK_SKU_OVERVIEW = [
  {
    id: 1,
    name: "Essential King Mattress",
    channel: "Amazon",
    asinId: "B0DHQXYZ12",
    buyboxPrice: 499.99,
    velocity30d: 8.2,
    units30d: 412,
    daysOfCover: 42,
    margin: 32.5,
    contribution: 15200,
    cvr: 3.8,
    status: "Active",
    lifecycle: "Mature",
  },
  {
    id: 2,
    name: "Sven Queen Mattress",
    channel: "Amazon",
    asinId: "B0DHQXYZ13",
    buyboxPrice: 699.99,
    velocity30d: 6.5,
    units30d: 325,
    daysOfCover: 28,
    margin: 28.0,
    contribution: 18900,
    cvr: 2.9,
    status: "Stockout Risk",
    lifecycle: "Mature",
  },
  {
    id: 3,
    name: "Essential Cal King Adjustable Base",
    channel: "Amazon",
    asinId: "B0DHQXYZ14",
    buyboxPrice: 1299.99,
    velocity30d: 3.1,
    units30d: 155,
    daysOfCover: 65,
    margin: 35.2,
    contribution: 22400,
    cvr: 1.4,
    status: "Active",
    lifecycle: "Mature",
  },
  {
    id: 4,
    name: "Sven Twin XL Bundle",
    channel: "Shopify",
    asinId: "SKU-SVXL-BUN-001",
    buyboxPrice: 899.99,
    velocity30d: 4.8,
    units30d: 240,
    daysOfCover: 52,
    margin: 30.1,
    contribution: 12100,
    cvr: 4.2,
    status: "Price Test Active",
    lifecycle: "Mature",
  },
  {
    id: 5,
    name: "Essential King Mattress",
    channel: "Shopify",
    asinId: "SKU-ESSKING-001",
    buyboxPrice: 489.99,
    velocity30d: 5.5,
    units30d: 275,
    daysOfCover: 38,
    margin: 33.8,
    contribution: 8900,
    cvr: 3.1,
    status: "Active",
    lifecycle: "Mature",
  },
  {
    id: 6,
    name: "Premium Cooling Mattress",
    channel: "Amazon",
    asinId: "B0DHQXYZ15",
    buyboxPrice: 1199.99,
    velocity30d: 2.3,
    units30d: 115,
    daysOfCover: 89,
    margin: 38.5,
    contribution: 18200,
    cvr: 0.8,
    status: "Stocked Out",
    lifecycle: "Launch",
  },
  {
    id: 7,
    name: "Sven Queen Mattress",
    channel: "Shopify",
    asinId: "SKU-SVQUEEN-001",
    buyboxPrice: 679.99,
    velocity30d: 3.9,
    units30d: 195,
    daysOfCover: 71,
    margin: 29.3,
    contribution: 7800,
    cvr: 2.1,
    status: "Active",
    lifecycle: "Mature",
  },
  {
    id: 8,
    name: "Essential Queen Base",
    channel: "Walmart",
    asinId: "WM-ESSBASE-Q",
    buyboxPrice: 799.99,
    velocity30d: 2.8,
    units30d: 140,
    daysOfCover: 95,
    margin: 26.7,
    contribution: 5600,
    cvr: 1.1,
    status: "Active",
    lifecycle: "Closeout",
  },
  {
    id: 9,
    name: "Premium King Bundle",
    channel: "Amazon",
    asinId: "B0DHQXYZ16",
    buyboxPrice: 1599.99,
    velocity30d: 1.9,
    units30d: 95,
    daysOfCover: 112,
    margin: 40.2,
    contribution: 28800,
    cvr: 0.6,
    status: "Price Test Active",
    lifecycle: "Closeout",
  },
  {
    id: 10,
    name: "Sven King Mattress",
    channel: "Walmart",
    asinId: "WM-SVENKING",
    buyboxPrice: 699.99,
    velocity30d: 4.1,
    units30d: 205,
    daysOfCover: 58,
    margin: 31.4,
    contribution: 9200,
    cvr: 2.4,
    status: "Active",
    lifecycle: "Mature",
  },
  {
    id: 11,
    name: "Essential Cal King Bundle",
    channel: "Shopify",
    asinId: "SKU-ESSCAL-BUN",
    buyboxPrice: 1399.99,
    velocity30d: 2.6,
    units30d: 130,
    daysOfCover: 76,
    margin: 34.1,
    contribution: 11500,
    cvr: 1.8,
    status: "Active",
    lifecycle: "Mature",
  },
  {
    id: 12,
    name: "Comfort Plus Mattress",
    channel: "Amazon",
    asinId: "B0DHQXYZ17",
    buyboxPrice: 899.99,
    velocity30d: 5.7,
    units30d: 285,
    daysOfCover: 44,
    margin: 33.0,
    contribution: 16200,
    cvr: 3.5,
    status: "Active",
    lifecycle: "Launch",
  },
];

// Helper: try real API first, fall back to mock on error or empty result
const fetchWithFallback = async (fetcher, mockData) => {
  if (USE_MOCK) return mockData;
  try {
    const result = await fetcher();
    // Fall back to mock if API returned null/undefined or empty array
    if (result === null || result === undefined) return mockData;
    if (Array.isArray(result) && result.length === 0) return mockData;
    return result;
  } catch (err) {
    console.warn("[SSM] API call failed, using mock data:", err.message);
    return mockData;
  }
};

// Map Xano /overview response fields → front-end field names
const capitalizeChannel = (ch) => {
  if (!ch) return ch;
  return ch.charAt(0).toUpperCase() + ch.slice(1);
};

const mapOverviewRow = (row) => ({
  id: row.id,
  name: row.short_description || row.name || "",
  channel: capitalizeChannel(row.channel),
  asinId: row.external_id || row.marketplace_sku || "",
  buyboxPrice: row.buybox_price ?? 0,
  velocity30d: row.velocity_30d ?? row.velocity ?? null,
  units30d: row.units_30d ?? row.units30d ?? null,
  daysOfCover: row.days_of_cover ?? row.daysOfCover ?? null,
  margin: row.avg_margin_pct ?? null,
  contribution: row.sum_contribution ?? null,
  cvr: row.avg_cvr ?? row.cvr_30d ?? null,
  status: row.is_active === false ? "Inactive" : (row.status || "Active"),
  lifecycle: row.lifecycle
    ? row.lifecycle.charAt(0).toUpperCase() + row.lifecycle.slice(1)
    : "",
  // Preserve raw fields for detail navigation
  _raw: row,
});

// Map Xano /detail.sku response → front-end field names used by detail pages.
// Xano stores: short_description, external_id, google_merchant_id, shopify_landing_path
// UI expects:  name,              asin,        google_id,           shopify_path
const mapDetailSku = (sku) => {
  if (!sku || typeof sku !== "object") return sku;
  return {
    ...sku,
    name: sku.short_description ?? sku.name ?? "",
    asin: sku.external_id ?? sku.asin ?? "",
    google_id: sku.google_merchant_id ?? sku.google_id ?? "",
    shopify_path: sku.shopify_landing_path ?? sku.shopify_path ?? "",
  };
};

// Aggregate an array of daily rows from Xano metrics.actuals[] (or .actual[])
// into a single summary object that matches the frontend's metrics.actual
// contract. Live Xano shape (verified 2026-04-13 against /detail):
//   units_sold, gross_revenue, ad_spend, sessions, cvr (already %),
//   impression_share, buybox_price, contribution, nb_incremental_revenue,
//   nb_incremental_roas, impressions, clicks, acos (DECIMAL e.g. 0.0588),
//   margin_pct, date.
// We also accept the simpler legacy shape (units, revenue, margin, etc.) so
// the same mapper works against mocks and any future endpoint variants.
const aggregateActuals = (actuals) => {
  if (!Array.isArray(actuals) || actuals.length === 0) return null;
  // Sort by date ascending so period_start/period_end land correctly even if
  // the API returns rows in arbitrary order (it currently does).
  const sorted = [...actuals].sort((a, b) =>
    String(a?.date || "").localeCompare(String(b?.date || ""))
  );
  const sum = (...keys) => sorted.reduce((a, r) => {
    for (const k of keys) {
      const v = Number(r?.[k]);
      if (Number.isFinite(v)) return a + v;
    }
    return a;
  }, 0);
  const avg = (...keys) => {
    const xs = sorted
      .map((r) => {
        for (const k of keys) {
          const v = Number(r?.[k]);
          if (Number.isFinite(v)) return v;
        }
        return null;
      })
      .filter((n) => Number.isFinite(n));
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };
  const units = sum("units_sold", "units");
  const revenue = sum("gross_revenue", "revenue");
  const ad_spend = sum("ad_spend");
  const impressions = sum("impressions");
  const clicks = sum("clicks");
  const sessions = sum("sessions");
  // acos may already be % (mocks) or decimal (Xano). Detect by magnitude.
  const acosAvgRaw = avg("acos");
  const acosAvg = acosAvgRaw != null && acosAvgRaw < 1 ? acosAvgRaw * 100 : acosAvgRaw;
  return {
    units,
    revenue,
    ad_spend,
    impressions,
    clicks,
    sessions,
    velocity: sorted.length ? units / sorted.length : 0,
    cvr: avg("cvr") ?? (clicks ? (units / clicks) * 100 : null),
    acos: revenue ? (ad_spend / revenue) * 100 : acosAvg,
    margin: avg("margin_pct", "margin"),
    contribution: sum("contribution"),
    nb_incremental_revenue: sum("nb_incremental_revenue"),
    nb_incremental_roas: avg("nb_incremental_roas"),
    impression_share: avg("impression_share"),
    period_start: sorted[0]?.date ?? sorted[0]?.period_start ?? null,
    period_end: sorted[sorted.length - 1]?.date ?? sorted[sorted.length - 1]?.period_end ?? null,
  };
};

// Map Xano /metrics or /detail.metrics → frontend shape {actual, forecast}.
// Xano returns {actuals: [daily rows], forecast: {...}}; UI reads .actual (singular).
const mapMetrics = (metrics) => {
  if (!metrics || typeof metrics !== "object") return metrics;
  const actualSrc = metrics.actuals ?? metrics.actual;
  const actual = Array.isArray(actualSrc) ? aggregateActuals(actualSrc) : actualSrc;
  const forecast = metrics.forecast ? {
    ...metrics.forecast,
    confidence_low:
      metrics.forecast.confidence_low ??
      metrics.forecast.confidence_interval_low ?? null,
    confidence_high:
      metrics.forecast.confidence_high ??
      metrics.forecast.confidence_interval_high ?? null,
  } : metrics.forecast;
  return { ...metrics, actual, forecast };
};

// Map full /detail wrapper → flatten + rename so legacy components keep working.
const mapDetail = (detail) => {
  if (!detail || typeof detail !== "object") return detail;
  const sku = mapDetailSku(detail.sku || detail);
  const metrics = mapMetrics(detail.metrics);
  return {
    ...detail,
    ...sku, // hoist sku fields to the top level so existing components keep reading data.name, data.asin, etc.
    sku,
    metrics,
    components: detail.components ?? [],
    fees: detail.fees ?? null,
    inventory: detail.inventory ?? null,
    price_history: detail.price_history ?? { items: [] },
    upcoming_promos: detail.upcoming_promos ?? [],
  };
};

// Hook: useSkuOverview
export const useSkuOverview = (filters) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState(null); // "api" or "mock"

  useEffect(() => {
    const load = async () => {
      const result = await fetchWithFallback(
        () => xanoFetch("/overview"),
        MOCK_SKU_OVERVIEW
      );
      // Transform API data to match component field names; mock data already matches
      if (result === MOCK_SKU_OVERVIEW) {
        setData(result);
        setSource("mock");
      } else {
        setData(Array.isArray(result) ? result.map(mapOverviewRow) : result);
        setSource("api");
      }
      setLoading(false);
    };
    load();
  }, []);

  return { data, loading, source };
};

// Hook: useSkuDetail
export const useSkuDetail = (skuId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState(null);

  const safeId = sanitizeId(skuId);

  // useMemo prevents stale closure - mockDetail identity is stable across renders
  const mockDetail = useMemo(
    () => MOCK_SKU_OVERVIEW.find((sku) => sku.id === safeId) || MOCK_SKU_OVERVIEW[0],
    [safeId]
  );

  useEffect(() => {
    if (safeId === null) {
      setData(null);
      setLoading(false);
      setSource(null);
      return;
    }
    const load = async () => {
      const result = await fetchWithFallback(
        () => xanoFetch(`/detail?marketplace_sku_id=${encParam(safeId)}`),
        mockDetail
      );
      const isMock = result === mockDetail;
      setData(isMock ? result : mapDetail(result));
      setSource(isMock ? "mock" : "api");
      setLoading(false);
    };
    load();
  }, [safeId, mockDetail]);

  return { data, loading, source };
};

// Hook: useSkuMetrics
export const useSkuMetrics = (skuId, period = "30d", customStart, customEnd) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState(null);

  const mockMetrics = {
    actual: { velocity: 4.2, units: 126, cvr: 0.98, sessions: 12840, revenue: 151829, ad_spend: 3420, acos: 2.25, impressions: 61200, clicks: 1285, margin: 21.6 },
    forecast: { velocity: 4.6, units: 138, cvr: 1.02, revenue: 166289, ad_spend: 3540, acos: 2.13, impressions: 64800, clicks: 1380, margin: 22.4, confidence_low: 148820, confidence_high: 183758, model_version: "v1_trailing_trend" },
    period: period,
    marketplace_sku_id: parseInt(skuId),
  };

  const safeSkuId = sanitizeId(skuId);

  useEffect(() => {
    if (safeSkuId === null) {
      setData(null);
      setLoading(false);
      return;
    }
    const load = async () => {
      const params =
        `marketplace_sku_id=${encParam(safeSkuId)}&period=${encParam(period)}` +
        (period === "custom" ? `&start_date=${encParam(customStart)}&end_date=${encParam(customEnd)}` : "");
      const result = await fetchWithFallback(
        () => xanoFetch(`/metrics?${params}`),
        mockMetrics
      );
      const isMock = result === mockMetrics;
      setData(isMock ? result : mapMetrics(result));
      setSource(isMock ? "mock" : "api");
      setLoading(false);
    };
    load();
  }, [safeSkuId, period, customStart, customEnd]);

  return { data, loading, source };
};

// Hook: useCategoryFees
export const useCategoryFees = (category, channel) => {
  const [fees, setFees] = useState(null);
  const [loading, setLoading] = useState(true);

  const mockFees = {
    referral_tier1_rate: 0.15,
    referral_tier1_cap: 200,
    referral_tier2_rate: 0.1,
    referral_min: 0.3,
    service_fee_pct: 0.06, // 6% per spec — seed data had 0, corrected here
  };

  useEffect(() => {
    const load = async () => {
      const result = await fetchWithFallback(
        () => xanoFetch(`/category_fees?category=${encParam(category)}&channel=${encParam(channel)}`),
        mockFees
      );
      // Xano may return an array (filtered table query) or a single row. Pick the most recent effective row.
      let normalized = result;
      if (Array.isArray(result)) {
        if (result.length === 0) normalized = mockFees;
        else normalized = result
          .slice()
          .sort((a, b) => String(b.effective_date || "").localeCompare(String(a.effective_date || "")))[0];
      }
      setFees(normalized);
      setLoading(false);
    };
    load();
  }, [category, channel]);

  return { fees, loading };
};

// Hook: useComponentDetail
export const useComponentDetail = (componentId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const mockComponent = {
    gen_sku: "GEN-AB-E-Q",
    name: "Essential Queen Adjustable Base",
    vendor: "Thailand",
    lead_time_weeks: 20,
    landed_cost: 342.18,
    lifecycle: "Mature",
    marketing: "Free to Push",
    balanced: true,
    primary_dc: "JAX",
    days_of_cover: 88,
    on_hand: 340,
    avg_weekly_sales: 29.2,
    marketplace_skus_count: 8,
    active_price_tests: 2,
    share_of_velocity: 18.4,
  };

  const safeComponentId = sanitizeId(componentId);

  useEffect(() => {
    if (safeComponentId === null) {
      setData(null);
      setLoading(false);
      return;
    }
    const load = async () => {
      const result = await fetchWithFallback(
        () => xanoFetch(`/component_detail?component_id=${encParam(safeComponentId)}`),
        mockComponent
      );
      setData(result);
      setLoading(false);
    };
    load();
  }, [safeComponentId]);

  return { data, loading };
};

// Hook: useRecommendationFeedback (POST callback) — with input validation
export const useRecommendationFeedback = () => {
  return useCallback(async (recId, decision, reason, skuId) => {
    // Validate inputs
    const safeRecId = sanitizeId(recId);
    const safeSkuId = sanitizeId(skuId);
    if (safeRecId === null || safeSkuId === null) {
      return { status: "error", message: "Invalid recommendation or SKU ID" };
    }
    const validDecisions = ["accept", "reject", "defer"];
    if (!validDecisions.includes(decision)) {
      return { status: "error", message: `Invalid decision. Must be one of: ${validDecisions.join(", ")}` };
    }

    if (USE_MOCK) return { status: "success" };
    try {
      return await xanoFetch("/recommendation_feedback", {
        method: "POST",
        body: JSON.stringify({
          rec_id: safeRecId,
          decision,
          reason: typeof reason === "string" ? reason.slice(0, 1000) : "", // Truncate to 1000 chars
          marketplace_sku_id: safeSkuId,
        }),
      });
    } catch (err) {
      console.warn("[SSM] Feedback POST failed:", err.message);
      return { status: "success", _mock: true };
    }
  }, []);
};

// Hook: useSpendForecast — fetches spend_forecast_daily from Xano
export const useSpendForecast = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState(null);

  const mockSpendForecast = [
    { id: 1, date: "2026-04-01", channel: "amazon", forecasted_revenue: 74080, spend_budget: 8890, allocated_spend: 0, confidence: "" },
    { id: 2, date: "2026-04-01", channel: "sven", forecasted_revenue: 41190, spend_budget: 4943, allocated_spend: 0, confidence: "" },
    { id: 3, date: "2026-04-01", channel: "walmart", forecasted_revenue: 2105, spend_budget: 253, allocated_spend: 0, confidence: "" },
  ];

  useEffect(() => {
    const load = async () => {
      const result = await fetchWithFallback(
        () => xanoFetch("/spend_forecast_daily"),
        mockSpendForecast
      );
      setData(result);
      setSource(result === mockSpendForecast ? "mock" : "api");
      setLoading(false);
    };
    load();
  }, []);

  return { data, loading, source };
};

// ─────────────────────────────────────────────────────────────────────────
// New hooks for endpoints that don't exist yet in Xano. Each falls back to
// mock data until the corresponding endpoint is wired. When the endpoint
// goes live, no further frontend changes are required as long as the field
// names below match the table schemas in docs/XANO_BUILD_PLAN.md.
// ─────────────────────────────────────────────────────────────────────────

// Hook: useSpendDaily — feeds Home / Spend Command Center.
// Expected Xano endpoint: GET /spend_daily?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
// Returns: array of rows, one per (date, channel).
//   Fields per row: date, channel, revenue, ad_spend, units, orders,
//                   impressions, clicks, cvr, acos, roas, aov.
// The hook returns BOTH:
//   .rows  — raw per-(date, channel) rows
//   .pivot — array of one row per date with per-channel columns flattened
//            (matches the existing R 2-D array shape in SpendCommandCenter.jsx)
export const useSpendDaily = (startDate, endDate) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState(null);

  useEffect(() => {
    const load = async () => {
      const params = [];
      if (startDate) params.push(`start_date=${encParam(startDate)}`);
      if (endDate) params.push(`end_date=${encParam(endDate)}`);
      const qs = params.length ? `?${params.join("&")}` : "";
      const result = await fetchWithFallback(
        () => xanoFetch(`/spend_daily${qs}`),
        []
      );
      const rows = Array.isArray(result) ? result : [];
      // Pivot to one row per date with per-channel columns
      const byDate = new Map();
      for (const r of rows) {
        if (!r?.date) continue;
        if (!byDate.has(r.date)) byDate.set(r.date, { date: r.date });
        const day = byDate.get(r.date);
        const ch = String(r.channel || "").toLowerCase();
        day[`${ch}_revenue`] = (day[`${ch}_revenue`] || 0) + (Number(r.revenue) || 0);
        day[`${ch}_spend`] = (day[`${ch}_spend`] || 0) + (Number(r.ad_spend) || 0);
        day[`${ch}_units`] = (day[`${ch}_units`] || 0) + (Number(r.units) || 0);
        day.total_revenue = (day.total_revenue || 0) + (Number(r.revenue) || 0);
        day.total_spend = (day.total_spend || 0) + (Number(r.ad_spend) || 0);
        day.total_units = (day.total_units || 0) + (Number(r.units) || 0);
        day.impressions = (day.impressions || 0) + (Number(r.impressions) || 0);
        day.clicks = (day.clicks || 0) + (Number(r.clicks) || 0);
        day.orders = (day.orders || 0) + (Number(r.orders) || 0);
      }
      const pivot = Array.from(byDate.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((d) => ({
          ...d,
          acos: d.total_revenue ? (d.total_spend / d.total_revenue) * 100 : 0,
          aov: d.orders ? d.total_revenue / d.orders : 0,
          cvr: d.clicks ? (d.orders / d.clicks) * 100 : 0,
        }));
      setData({ rows, pivot });
      setSource(rows.length === 0 ? "mock" : "api");
      setLoading(false);
    };
    load();
  }, [startDate, endDate]);

  return { data, loading, source };
};

// Hook: useChannelCampaigns — feeds Channels / Channel Deep Dive.
// Expected Xano endpoint: GET /channel_campaigns?channel=X
// Returns array of rows from channel_campaign table.
export const useChannelCampaigns = (channel) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState(null);

  useEffect(() => {
    const load = async () => {
      const qs = channel ? `?channel=${encParam(channel)}` : "";
      const result = await fetchWithFallback(
        () => xanoFetch(`/channel_campaigns${qs}`),
        []
      );
      setData(Array.isArray(result) ? result : []);
      setSource(Array.isArray(result) && result.length > 0 ? "api" : "mock");
      setLoading(false);
    };
    load();
  }, [channel]);

  return { data, loading, source };
};

// Hook: useInventorySnapshot — drives the Inventory card on Detail page.
// Expected Xano endpoint: GET /inventory?marketplace_sku_id=X (or join inside /detail)
export const useInventorySnapshot = (skuId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const safeId = sanitizeId(skuId);

  useEffect(() => {
    if (safeId === null) { setData(null); setLoading(false); return; }
    const load = async () => {
      const result = await fetchWithFallback(
        () => xanoFetch(`/inventory?marketplace_sku_id=${encParam(safeId)}`),
        null
      );
      // Xano may return an array or a single row.
      const row = Array.isArray(result) ? result[0] : result;
      setData(row || null);
      setLoading(false);
    };
    load();
  }, [safeId]);

  return { data, loading };
};

// Hook: useGenSkuComponents — drives Components card on Detail page.
// Expected Xano endpoint: GET /sku_components?marketplace_sku_id=X
//   Returns array of joined rows: gen_sku + sku_component fields together.
export const useGenSkuComponents = (skuId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const safeId = sanitizeId(skuId);

  useEffect(() => {
    if (safeId === null) { setData([]); setLoading(false); return; }
    const load = async () => {
      const result = await fetchWithFallback(
        () => xanoFetch(`/sku_components?marketplace_sku_id=${encParam(safeId)}`),
        []
      );
      setData(Array.isArray(result) ? result : []);
      setLoading(false);
    };
    load();
  }, [safeId]);

  return { data, loading };
};

// Hook: useCreatePriceTest (POST callback) — with input validation
export const useCreatePriceTest = () => {
  return useCallback(
    async (skuId, testType, pricePoints, startDate, endDate, override = false, overrideReason = null) => {
      // Validate inputs before sending
      const safeSkuId = sanitizeId(skuId);
      if (safeSkuId === null) return { status: "error", message: "Invalid SKU ID" };

      if (!Array.isArray(pricePoints) || pricePoints.length === 0) {
        return { status: "error", message: "At least one price point is required" };
      }
      for (const p of pricePoints) {
        if (!Number.isFinite(p) || p <= 0 || p > 100000) {
          return { status: "error", message: `Invalid price point: ${p}. Must be between $0.01 and $100,000.` };
        }
      }
      if (!testType || typeof testType !== "string") {
        return { status: "error", message: "Test type is required" };
      }

      if (USE_MOCK)
        return { status: "pending_approval", id: "mock_" + Date.now() };
      try {
        return await xanoFetch("/price_tests", {
          method: "POST",
          body: JSON.stringify({
            marketplace_sku_id: safeSkuId,
            test_type: testType,
            price_points: pricePoints,
            planned_start_date: startDate,
            planned_end_date: endDate,
            override,
            override_reason: overrideReason,
          }),
        });
      } catch (err) {
        console.warn("[SSM] Price test POST failed:", err.message);
        return { status: "pending_approval", id: "mock_" + Date.now(), _mock: true };
      }
    },
    []
  );
};
