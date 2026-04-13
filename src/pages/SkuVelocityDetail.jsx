import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";

/* ─────────────── XANO API INTEGRATION ───────────────
 * All hooks are imported from src/api/hooks.js so the live API path,
 * mappers, and mock-fallback logic live in exactly one place. The
 * previous inline definitions in this file hardcoded USE_MOCK=true and
 * pointed at a non-existent /api:sku-velocity group, which kept the
 * Detail page on synthetic data even after the real workspace was wired.
 */
import {
  useSkuDetail,
  useSkuMetrics,
  useCategoryFees,
  useRecommendationFeedback,
  useCreatePriceTest,
} from "../api/hooks";

/* ─────────────── THEME + HELPERS ─────────────── */

const T = { bg: "#1a1d23", bg2: "#15171c", cd: "#13151a", bd: "#2a2d35",
  tx: "#e8eaed", t1: "#c4c8cf", t2: "#9ea4ad", t3: "#737a85", t4: "#555b64",
  ac: "#60a5fa", gn: "#34d399", rd: "#f87171", am: "#fbbf24", pu: "#a78bfa", cy: "#22d3ee",
  amz: "#FF9900", shop: "#96BF48" };

const fm = n => { if (n == null) return "—"; if (Math.abs(n) >= 1e6) return "$"+(n/1e6).toFixed(1)+"M"; if (Math.abs(n) >= 1e3) return "$"+(n/1e3).toFixed(1)+"K"; return "$"+n.toFixed(0); };
const fc = n => n != null ? "$"+n.toLocaleString(undefined,{maximumFractionDigits:2}) : "—";
const pt = n => n != null ? n.toFixed(1)+"%" : "—";

// Today = April 10, 2026 (aligning with Jeannetta's 4/5 week start)
const TODAY = new Date(2026, 3, 10);

// Vendor lead times — used to compute IMPACT week (earliest we could land a new order from today)
const BASE_LEAD_WEEKS = 20;  // Thailand adjustable base vendor
const MATT_LEAD_WEEKS = 16;  // Nisco mattress vendor

// Jeannetta-style weekly projection data
// Week starts are Sundays; week numbers per ISO standard
// "Impact week" = earliest week new vendor order can land
// Using realistic Mature SKU pattern similar to GEN-AB-P-Q: depletion then arrivals in week 32
const BASE_WEEKLY = [
  { week: 'Week 14', date: '4/5/2026',  inv: 340, impact: 0 },
  { week: 'Week 15', date: '4/12/2026', inv: 320, impact: 0 },
  { week: 'Week 16', date: '4/19/2026', inv: 298, impact: 0 },
  { week: 'Week 17', date: '4/26/2026', inv: 275, impact: 0 },
  { week: 'Week 18', date: '5/3/2026',  inv: 250, impact: 0 },
  { week: 'Week 19', date: '5/10/2026', inv: 224, impact: 0 },
  { week: 'Week 20', date: '5/17/2026', inv: 195, impact: 0 },
  { week: 'Week 21', date: '5/24/2026', inv: 165, impact: 0 },
  { week: 'Week 22', date: '5/31/2026', inv: 134, impact: 0 },
  { week: 'Week 23', date: '6/7/2026',  inv: 102, impact: 0 },
  { week: 'Week 24', date: '6/14/2026', inv: 68,  impact: 0 },
  { week: 'Week 25', date: '6/21/2026', inv: 32,  impact: 0 },
  { week: 'Week 26', date: '6/28/2026', inv: 0,   impact: 0 }, // stockout begins
  { week: 'Week 27', date: '7/5/2026',  inv: 0,   impact: 0 },
  { week: 'Week 28', date: '7/12/2026', inv: 0,   impact: 0 },
  { week: 'Week 29', date: '7/19/2026', inv: 0,   impact: 0 },
  { week: 'Week 30', date: '7/26/2026', inv: 0,   impact: 0 },
  { week: 'Week 31', date: '8/2/2026',  inv: 0,   impact: 0 },
  { week: 'Week 32', date: '8/9/2026',  inv: 300, impact: 300, dc: 'JAX' }, // IMPACT WEEK — reorder lands
  { week: 'Week 33', date: '8/16/2026', inv: 270, impact: 0 },
  { week: 'Week 34', date: '8/23/2026', inv: 236, impact: 0 },
  { week: 'Week 35', date: '8/30/2026', inv: 200, impact: 0 },
];

const MATT_WEEKLY = [
  { week: 'Week 14', date: '4/5/2026',  inv: 187, impact: 0 },
  { week: 'Week 15', date: '4/12/2026', inv: 159, impact: 0 },
  { week: 'Week 16', date: '4/19/2026', inv: 128, impact: 0 },
  { week: 'Week 17', date: '4/26/2026', inv: 96,  impact: 0 },
  { week: 'Week 18', date: '5/3/2026',  inv: 61,  impact: 0 },
  { week: 'Week 19', date: '5/10/2026', inv: 25,  impact: 0 },
  { week: 'Week 20', date: '5/17/2026', inv: 0,   impact: 0 }, // stockout begins
  { week: 'Week 21', date: '5/24/2026', inv: 0,   impact: 0 },
  { week: 'Week 22', date: '5/31/2026', inv: 0,   impact: 0 },
  { week: 'Week 23', date: '6/7/2026',  inv: 0,   impact: 0 },
  { week: 'Week 24', date: '6/14/2026', inv: 0,   impact: 0 },
  { week: 'Week 25', date: '6/21/2026', inv: 0,   impact: 0 },
  { week: 'Week 26', date: '6/28/2026', inv: 0,   impact: 0 },
  { week: 'Week 27', date: '7/5/2026',  inv: 0,   impact: 0 },
  { week: 'Week 28', date: '7/12/2026', inv: 240, impact: 240, dc: 'MCS' }, // IMPACT WEEK
  { week: 'Week 29', date: '7/19/2026', inv: 208, impact: 0 },
  { week: 'Week 30', date: '7/26/2026', inv: 176, impact: 0 },
  { week: 'Week 31', date: '8/2/2026',  inv: 144, impact: 0 },
  { week: 'Week 32', date: '8/9/2026',  inv: 112, impact: 0 },
  { week: 'Week 33', date: '8/16/2026', inv: 80,  impact: 0 },
  { week: 'Week 34', date: '8/23/2026', inv: 48,  impact: 0 },
  { week: 'Week 35', date: '8/30/2026', inv: 16,  impact: 0 },
];

// Historical daily velocity data (past 30 days)
const PAST_VELOCITY = Array.from({length: 30}, (_, i) => ({
  day: -30 + i,
  contrib: 380 + Math.sin(i/2)*80 + (Math.random()-0.5)*40,
}));

// Mock SKU baseline. The main detail component shadows this with API-overlaid
// data when useSkuDetail returns a row; helper components that reference SKU
// via closure still see this mock (legacy props pass the live overlay through).
const SKU_MOCK = {
  name: 'Essential 10" Queen',
  marketplace_sku: 'SS-Q-AB+MA+ESS+10"',
  asin: 'B0863CMF8F',
  google_id: 'shopify_us_4698792329294_40886609674318',
  shopify_path: '/products/essential-series-adjustable-bed-base-and-mattress?variant=10-queen',
  channel: 'amazon',
  category: 'bedroom_furniture',
  buybox_price: 1204.99,
  reference_price_30d: 1199.99,
  components: [
    { 
      gen_sku: 'GEN-AB-E-Q', 
      name: 'Essential Queen Base', 
      cost: 173, 
      qty: 1, 
      onHand: 340,
      avgWeekly: 23, // from Jeannetta Avg Wkly col
      thisSkuShare: 0.42,
      daysCover: 88, // 340/(23/7) ≈ 103 but with demand timing
      skuCount: 5,
      status: 'Mature',
      marketing: 'Buffer',
      balanced: true,
      weekly: BASE_WEEKLY,
    },
    { 
      gen_sku: 'SS10QN', 
      name: 'Sven 10" Queen', 
      cost: 195.84, 
      qty: 1, 
      onHand: 187,
      avgWeekly: 32,
      thisSkuShare: 0.56,
      daysCover: 41,
      skuCount: 3,
      status: 'Mature',
      marketing: 'Free to Push',
      balanced: false,
      weekly: MATT_WEEKLY,
    }
  ],
  velocity_30d: 4.2,
  sessions_30d: 12840,
  units_30d: 126,
  cvr_30d: 0.98,
  ad_spend_30d: 3420,
  nb_roas_7dc: 5.8,
  lifecycle: 'Mature',
};

// FEES: Mock data matching category_fees table (Table 33) schema.
// In production, these are fetched via useCategoryFees(category, channel) hook
// which queries GET /api/category_fees?category=X&channel=Y
// The table stores: referral_pct, referral_threshold, processing_pct, processing_flat,
//                   service_fee_pct, effective_date, expires_date
// Tiered referrals: referral_pct applies up to referral_threshold, then tier2 rate above it.
const FEES = {
  amazon: {
    bedroom_furniture: {
      // From category_fees row: category=bedroom_furniture, channel=amazon
      referral_tier1_rate: 0.15,
      referral_tier1_cap: 200,      // = referral_threshold
      referral_tier2_rate: 0.10,
      referral_min: 0.30,
      effective_date: "2026-01-01",
    },
    mattresses: {
      // From category_fees row: category=mattresses, channel=amazon
      referral_tier1_rate: 0.15,
      referral_tier1_cap: Infinity,  // no threshold = flat rate
      referral_tier2_rate: 0.15,
      referral_min: 0.30,
      effective_date: "2026-01-01",
    },
  },
  shopify: {
    bedroom_furniture: {
      // From category_fees row: category=bedroom_furniture, channel=shopify
      processing_pct: 0.029,
      processing_flat: 0.30,
      effective_date: "2026-01-01",
    },
  },
};

const calcReferral = (price, feeConfig) => {
  const tier1 = Math.min(price, feeConfig.referral_tier1_cap) * feeConfig.referral_tier1_rate;
  const tier2 = Math.max(0, price - feeConfig.referral_tier1_cap) * feeConfig.referral_tier2_rate;
  return Math.max(tier1 + tier2, feeConfig.referral_min);
};

const PROMOS = [
  { name: "New Years Sale", start: "1/1", end: "1/8", lead_in: 30 },
  { name: "President's Day Sale", start: "2/10", end: "2/22", lead_in: 30 },
  { name: "Big Spring Sale", start: "3/15", end: "4/2", lead_in: 30 },
  { name: "Easter Sale", start: "4/3", end: "4/6", lead_in: 30 },
  { name: "Memorial Day Sale", start: "5/18", end: "5/28", lead_in: 30 },
  { name: "Fourth of July Sale", start: "6/28", end: "7/6", lead_in: 30 },
  { name: "Summer Prime", start: "7/7", end: "7/13", lead_in: 30 },
  { name: "Back to School", start: "8/1", end: "8/15", lead_in: 30 },
  { name: "Labor Day Sale", start: "8/25", end: "9/3", lead_in: 30 },
  { name: "Fall Prime", start: "10/6", end: "10/14", lead_in: 30 },
  { name: "Veterans Day Sale", start: "11/9", end: "11/12", lead_in: 30 },
  { name: "BFCM", start: "11/19", end: "12/2", lead_in: 30 },
  { name: "Holiday Sale", start: "12/15", end: "12/26", lead_in: 30 },
];

const nextPromo = () => {
  for (const p of PROMOS) {
    const [sm, sd] = p.start.split('/').map(Number);
    const startDate = new Date(TODAY.getFullYear(), sm - 1, sd);
    if (startDate >= TODAY) {
      const leadInStart = new Date(startDate);
      leadInStart.setDate(leadInStart.getDate() - p.lead_in);
      const inLeadIn = TODAY >= leadInStart;
      return { ...p, startDate, leadInStart, inLeadIn, daysUntil: Math.round((startDate - TODAY) / 86400000) };
    }
  }
  return null;
};

const PRICE_TEST_RECS = [
  {
    id: 1,
    price_point: 1249.99,
    delta_pct: 3.73,
    direction: 'upward',
    confidence: 'high',
    reasoning: 'CVR stable in $1200-1230 range over last 60d. Upward test raises reference price ahead of Summer Prime (anchor improves to $1062.49). No promo conflict. Also slows velocity ~8%, buying days of cover against mattress stockout.',
    expected_impact: { cvr_delta: -0.08, units_delta: -4, contrib_delta: 1840, margin_delta: 1.2 },
    duration_days: 14, min_sample: 8400, status: 'pending',
  },
  {
    id: 2,
    price_point: 1169.99,
    delta_pct: -2.90,
    direction: 'downward',
    confidence: 'medium',
    reasoning: 'Competitor Purple dropped to $1189 on 3/22. Hypothesis: -2.9% price unlocks +12% velocity. BLOCKED — would drag reference price ahead of Summer Prime AND worsen mattress stockout risk.',
    expected_impact: { cvr_delta: 0.14, units_delta: 17, contrib_delta: -280, margin_delta: -2.4 },
    duration_days: 14, min_sample: 6200, status: 'blocked',
    block_reason: 'Reference price conflict + stockout risk',
  },
  {
    id: 3,
    price_point: 1189.99,
    delta_pct: -1.24,
    direction: 'downward',
    confidence: 'low',
    reasoning: 'Small downward test just above current reference price low. Schedule after 4/2 and before 6/7. Post-mattress-restock (week 32) only — before that, velocity increase worsens stockout.',
    expected_impact: { cvr_delta: 0.06, units_delta: 8, contrib_delta: 420, margin_delta: -0.8 },
    duration_days: 10, min_sample: 4800, status: 'pending',
    scheduled_start: '8/16',
  },
];

const PRICE_HISTORY = [
  { price: 1204.99, days: 42, cvr: 0.98, is: 34, sessions: 12840, velocity: 4.2, spend: 3420, contrib: 11842, start: '2/27' },
  { price: 1229.99, days: 14, cvr: 0.89, is: 32, sessions: 4200, velocity: 3.8, spend: 1180, contrib: 5124, start: '2/13' },
  { price: 1179.99, days: 21, cvr: 1.12, is: 38, sessions: 6300, velocity: 4.8, spend: 1820, contrib: 9340, start: '1/23' },
  { price: 1159.99, days: 7, cvr: 1.24, is: 41, sessions: 2100, velocity: 5.2, spend: 680, contrib: 3180, start: '1/16' },
  { price: 1199.99, days: 14, cvr: 1.01, is: 36, sessions: 4100, velocity: 4.4, spend: 1240, contrib: 5960, start: '1/2' },
];

function MarginCalc({ landed, shipping, serviceFee, adSpend, units30d, testPrice, setTestPrice, buybox, category, refPrice, nextP }) {
  const price = testPrice || buybox;
  const isTest = !!testPrice;
  // Live SKU rows can carry categories the static FEES table doesn't know
  // about (e.g. "Base"). Fall back to bedroom_furniture so the layout still
  // renders rather than crashing on undefined.
  const amzFeeConfig = FEES.amazon[category] || FEES.amazon.bedroom_furniture;
  const shopFeeConfig = FEES.shopify[category] || FEES.shopify.bedroom_furniture;
  const amzReferral = calcReferral(price, amzFeeConfig);
  const amzReferralPct = (amzReferral / price) * 100;
  const shopProcessing = price * shopFeeConfig.processing_pct + shopFeeConfig.processing_flat;
  const adsPerUnit = adSpend / units30d;
  const service = price * serviceFee;
  const amzNet = price - amzReferral - shipping - service - adsPerUnit - landed;
  const amzMargin = (amzNet / price) * 100;
  const onlineNet = price - shopProcessing - shipping - service - adsPerUnit - landed;
  const onlineMargin = (onlineNet / price) * 100;
  const wouldDragReference = isTest && price < refPrice;
  const dealAnchorCurrent = refPrice * 0.85;
  const dealAnchorAfterTest = wouldDragReference ? price * 0.85 : dealAnchorCurrent;
  const dealAnchorDelta = dealAnchorAfterTest - dealAnchorCurrent;
  const promoConflict = wouldDragReference && nextP && nextP.inLeadIn;

  const referralSub = price > amzFeeConfig.referral_tier1_cap
    ? `${(amzFeeConfig.referral_tier1_rate*100).toFixed(0)}%≤$${amzFeeConfig.referral_tier1_cap}+${(amzFeeConfig.referral_tier2_rate*100).toFixed(0)}%`
    : `${(amzFeeConfig.referral_tier1_rate*100).toFixed(0)}%`;
  const amzLines = [
    { label: "Sale Price", amt: price, pct: 100, neg: false, bold: true },
    { label: "Landed Cost", sub: "components", amt: landed, pct: (landed/price)*100, neg: true },
    { label: "Referral Fee", sub: referralSub, amt: amzReferral, pct: amzReferralPct, neg: true },
    { label: "Shipping", sub: "merchant fulfilled", amt: shipping, pct: (shipping/price)*100, neg: true },
    { label: "Service Fee", sub: `${(serviceFee*100).toFixed(0)}%`, amt: service, pct: (service/price)*100, neg: true },
    { label: "Ads (per unit)", sub: `${units30d}u/30d`, amt: adsPerUnit, pct: (adsPerUnit/price)*100, neg: true },
  ];
  const shopLines = [
    { label: "Sale Price", amt: price, pct: 100, neg: false, bold: true },
    { label: "Landed Cost", sub: "components", amt: landed, pct: (landed/price)*100, neg: true },
    { label: "Processing", sub: "2.9% + $0.30", amt: shopProcessing, pct: (shopProcessing/price)*100, neg: true },
    { label: "Shipping", sub: "delivered", amt: shipping, pct: (shipping/price)*100, neg: true },
    { label: "Service Fee", sub: `${(serviceFee*100).toFixed(0)}%`, amt: service, pct: (service/price)*100, neg: true },
    { label: "Ads (per unit)", sub: "allocated", amt: adsPerUnit, pct: (adsPerUnit/price)*100, neg: true },
  ];

  const renderPanel = (title, lines, net, margin, color, subtitle) => (
    <div style={{background:T.bg,borderRadius:6,padding:"10px 12px",border:"1px solid "+color+"30"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,paddingBottom:4,borderBottom:"1px solid "+T.bd}}>
        <span style={{fontSize:9,fontWeight:700,color:color,textTransform:"uppercase",letterSpacing:.5}}>{title}</span>
        <span style={{fontSize:8,color:T.t3}}>{subtitle}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 68px 46px",gap:4,paddingBottom:3,borderBottom:"1px solid "+T.bd+"60"}}>
        <div/>
        <div style={{fontSize:8,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:.4,textAlign:"right"}}>$</div>
        <div style={{fontSize:8,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:.4,textAlign:"right"}}>%</div>
      </div>
      {lines.map((l,i)=>(
        <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 68px 46px",gap:4,padding:"3px 0",borderBottom:l.bold?"1px solid "+T.bd:"none",fontFamily:"'JetBrains Mono', monospace",fontSize:10}}>
          <div style={{fontFamily:"'Outfit', sans-serif",color:T.t2}}>
            {l.label} {l.sub && <span style={{color:T.t4,fontSize:8}}>({l.sub})</span>}
          </div>
          <div style={{textAlign:"right",color:l.neg?T.rd:T.t1,fontWeight:l.bold?700:400}}>
            {l.neg?"−":""}{fc(l.amt)}
          </div>
          <div style={{textAlign:"right",color:T.t3,fontSize:9,fontWeight:l.bold?700:400}}>
            {l.pct.toFixed(1)}%
          </div>
        </div>
      ))}
      <div style={{display:"grid",gridTemplateColumns:"1fr 68px 46px",gap:4,padding:"6px 0 2px 0",borderTop:"1px solid "+T.bd,marginTop:4,fontFamily:"'JetBrains Mono', monospace",fontSize:12}}>
        <div style={{fontFamily:"'Outfit', sans-serif",color:T.tx,fontWeight:700,fontSize:10}}>Net Contribution</div>
        <div style={{textAlign:"right",color:net>0?T.gn:T.rd,fontWeight:800}}>{fc(net)}</div>
        <div style={{textAlign:"right",color:margin>20?T.gn:margin>10?T.am:T.rd,fontWeight:700,fontSize:11}}>{pt(margin)}</div>
      </div>
    </div>
  );

  return (
    <div style={{background:T.cd,borderRadius:10,border:"1px solid "+T.bd,overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.bd,display:"flex",justifyContent:"space-between",alignItems:"center",background:T.bg2}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.tx,textTransform:"uppercase",letterSpacing:.4}}>Margin Calculator</div>
          <div style={{fontSize:9,color:T.t3,marginTop:1}}>Live — dynamic at any price point</div>
        </div>
        {isTest && <span style={{fontSize:9,padding:"3px 8px",borderRadius:3,background:T.am+"20",color:T.am,fontWeight:700}}>TEST PRICE ACTIVE</span>}
      </div>
      <div style={{padding:"12px 14px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <div>
            <div style={{fontSize:8,color:T.t3,textTransform:"uppercase",letterSpacing:.4,marginBottom:3}}>Buybox Price</div>
            <div style={{fontSize:18,fontWeight:800,fontFamily:"'JetBrains Mono', monospace",color:T.t1}}>{fc(buybox)}</div>
          </div>
          <div>
            <div style={{fontSize:8,color:T.am,textTransform:"uppercase",letterSpacing:.4,marginBottom:3}}>Test Price (what-if)</div>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontSize:14,color:T.t3}}>$</span>
              <input type="number" value={testPrice||""} onChange={e=>setTestPrice(e.target.value?parseFloat(e.target.value):null)} placeholder="—" style={{background:T.bg,border:"1px solid "+(isTest?T.am:T.bd),borderRadius:4,color:isTest?T.am:T.tx,padding:"4px 6px",fontSize:16,fontWeight:800,fontFamily:"'JetBrains Mono', monospace",width:110,outline:"none"}}/>
              {isTest && <button onClick={()=>setTestPrice(null)} style={{fontSize:8,padding:"2px 6px",borderRadius:3,border:"1px solid "+T.bd,background:"transparent",color:T.t3,cursor:"pointer"}}>clear</button>}
            </div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          {renderPanel("Amazon", amzLines, amzNet, amzMargin, T.amz, "ASIN: "+SKU_MOCK.asin)}
          {renderPanel("Shopify (Online)", shopLines, onlineNet, onlineMargin, T.shop, "mirrored price")}
        </div>
        <div style={{background:T.bg,borderRadius:6,padding:"10px 12px",border:"1px solid "+T.bd,marginBottom:10}}>
          <div style={{fontSize:9,fontWeight:700,color:T.cy,textTransform:"uppercase",letterSpacing:.4,marginBottom:8}}>Reference Price Tracker</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,fontSize:10}}>
            <div>
              <div style={{fontSize:8,color:T.t3,marginBottom:2}}>Trailing 30d Low</div>
              <div style={{fontFamily:"'JetBrains Mono', monospace",fontWeight:700,color:T.t1,fontSize:13}}>{fc(refPrice)}</div>
            </div>
            <div>
              <div style={{fontSize:8,color:T.t3,marginBottom:2}}>Deal Anchor (−15%)</div>
              <div style={{fontFamily:"'JetBrains Mono', monospace",fontWeight:700,color:wouldDragReference?T.rd:T.t1,fontSize:13}}>{fc(dealAnchorAfterTest)}</div>
              {wouldDragReference && <div style={{fontSize:8,color:T.rd,marginTop:1}}>−{fc(Math.abs(dealAnchorDelta))} from current</div>}
            </div>
            <div>
              <div style={{fontSize:8,color:T.t3,marginBottom:2}}>Next Promo</div>
              <div style={{fontFamily:"'JetBrains Mono', monospace",fontWeight:700,color:T.t1,fontSize:12}}>{nextP ? nextP.name : "—"}</div>
              {nextP && <div style={{fontSize:8,color:nextP.inLeadIn?T.am:T.t3,marginTop:1}}>in {nextP.daysUntil}d {nextP.inLeadIn && "• LEAD-IN"}</div>}
            </div>
          </div>
        </div>
        {promoConflict && (
          <div style={{padding:"10px 12px",background:T.rd+"15",border:"1px solid "+T.rd+"40",borderRadius:6,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
              <span style={{fontSize:11}}>⚠</span>
              <span style={{fontSize:10,fontWeight:700,color:T.rd,textTransform:"uppercase",letterSpacing:.4}}>Reference Price Conflict</span>
            </div>
            <div style={{fontSize:10,color:T.t1,lineHeight:1.5}}>
              Test price {fc(price)} is below current 30d low ({fc(refPrice)}). Would drag {nextP.name} deal anchor from {fc(dealAnchorCurrent)} to {fc(dealAnchorAfterTest)}.
            </div>
          </div>
        )}
        {isTest && !promoConflict && price > buybox && (
          <div style={{padding:"8px 12px",background:T.gn+"15",border:"1px solid "+T.gn+"40",borderRadius:6,marginBottom:8}}>
            <div style={{fontSize:10,color:T.gn}}>
              ✓ Upward test — always allowed. Raises reference price to {fc(price)}, improving future promo deal anchors.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PriceHistoryAndTests({ recs, rejectingId, reasonText, setReasonText, onApprove, onStartReject, onSubmitReject, onCancelReject }) {
  const maxPrice = Math.max(...PRICE_HISTORY.map(h=>h.price));
  const minPrice = Math.min(...PRICE_HISTORY.map(h=>h.price));
  const maxVel = Math.max(...PRICE_HISTORY.map(h=>h.velocity));
  const badge = (c) => ({ high: T.gn, medium: T.am, low: T.t3 }[c] || T.t3);
  const btnBase = {padding:"4px 8px",borderRadius:4,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit', sans-serif"};
  
  return (
    <div style={{background:T.cd,borderRadius:10,border:"1px solid "+T.bd,overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.bd,background:T.bg2}}>
        <div style={{fontSize:11,fontWeight:700,color:T.tx,textTransform:"uppercase",letterSpacing:.4}}>Price History &amp; Performance</div>
        <div style={{fontSize:9,color:T.t3,marginTop:1}}>Last 90 days — every price point held for 7+ days, sorted newest first</div>
      </div>
      <div style={{padding:"8px 14px"}}>
        <div style={{display:"grid",gridTemplateColumns:"68px 40px 40px 52px 44px 52px 44px 56px 56px 40px",gap:6,padding:"4px 0",borderBottom:"1px solid "+T.bd,fontSize:8,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:.3}}>
          <div>Price</div>
          <div style={{textAlign:"right"}}>Days</div>
          <div style={{textAlign:"right"}}>Start</div>
          <div style={{textAlign:"right"}}>CVR</div>
          <div style={{textAlign:"right"}}>IS%</div>
          <div style={{textAlign:"right"}}>Sessions</div>
          <div style={{textAlign:"right"}}>Vel/d</div>
          <div style={{textAlign:"right"}}>Spend</div>
          <div style={{textAlign:"right"}}>Contrib</div>
          <div style={{textAlign:"right"}}>Chart</div>
        </div>
        {PRICE_HISTORY.map((h,i)=>{
          const priceNorm = (h.price - minPrice) / (maxPrice - minPrice || 1);
          const velNorm = h.velocity / maxVel;
          return (
            <div key={i} style={{display:"grid",gridTemplateColumns:"68px 40px 40px 52px 44px 52px 44px 56px 56px 40px",gap:6,padding:"5px 0",borderBottom:"1px solid "+T.bd+"40",fontSize:10,fontFamily:"'JetBrains Mono', monospace",alignItems:"center"}}>
              <div style={{color:h.price===SKU_MOCK.buybox_price?T.am:T.t1,fontWeight:h.price===SKU_MOCK.buybox_price?700:400}}>
                {fc(h.price)}{h.price===SKU_MOCK.buybox_price && <span style={{fontSize:7,color:T.am,marginLeft:2}}>●</span>}
              </div>
              <div style={{textAlign:"right",color:T.t2}}>{h.days}d</div>
              <div style={{textAlign:"right",color:T.t3,fontSize:9}}>{h.start}</div>
              <div style={{textAlign:"right",color:h.cvr>1?T.gn:h.cvr>0.9?T.am:T.rd,fontWeight:600}}>{pt(h.cvr)}</div>
              <div style={{textAlign:"right",color:h.is>35?T.gn:h.is>25?T.am:T.rd,fontWeight:600}}>{h.is}%</div>
              <div style={{textAlign:"right",color:T.t1}}>{h.sessions.toLocaleString()}</div>
              <div style={{textAlign:"right",color:T.cy,fontWeight:600}}>{h.velocity.toFixed(1)}</div>
              <div style={{textAlign:"right",color:T.amz}}>{fm(h.spend)}</div>
              <div style={{textAlign:"right",color:T.gn,fontWeight:600}}>{fm(h.contrib)}</div>
              <div style={{textAlign:"right"}}>
                <div style={{display:"flex",flexDirection:"column",gap:1,alignItems:"flex-end"}}>
                  <div style={{width:36,height:3,background:T.bd,borderRadius:1}}><div style={{width:(priceNorm*100)+"%",height:"100%",background:T.ac,borderRadius:1}}/></div>
                  <div style={{width:36,height:3,background:T.bd,borderRadius:1}}><div style={{width:(velNorm*100)+"%",height:"100%",background:T.cy,borderRadius:1}}/></div>
                </div>
              </div>
            </div>
          );
        })}
        <div style={{display:"flex",gap:10,marginTop:6,fontSize:8,color:T.t3}}>
          <div style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:8,height:3,background:T.ac,borderRadius:1}}/>Price (relative)</div>
          <div style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:8,height:3,background:T.cy,borderRadius:1}}/>Velocity (relative)</div>
          <div style={{display:"flex",alignItems:"center",gap:3}}><span style={{color:T.am}}>●</span> Current price</div>
        </div>
        
        {/* Test recommendations embedded at bottom */}
        <div style={{marginTop:14,paddingTop:12,borderTop:"2px solid "+T.bd}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{fontSize:10,fontWeight:700,color:T.pu,textTransform:"uppercase",letterSpacing:.4}}>Recommended Price Tests</div>
                <span style={{fontSize:8,padding:"2px 5px",borderRadius:2,background:T.pu+"20",color:T.pu,fontWeight:700,letterSpacing:.3}}>SELF-LEARNING</span>
              </div>
              <div style={{fontSize:9,color:T.t3,marginTop:1}}>Elasticity model + promo calendar + inventory constraints · Feedback trains the engine ⟳</div>
            </div>
            <span style={{fontSize:9,padding:"3px 8px",borderRadius:3,background:T.pu+"20",color:T.pu,fontWeight:700}}>{recs.filter(r=>r.status==='pending').length} PENDING</span>
          </div>
          {recs.map(r=>(
            <div key={r.id} style={{padding:"8px 10px",background:T.bg,borderRadius:5,border:"1px solid "+T.bd,marginBottom:6}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                    <span style={{fontSize:13,fontWeight:800,fontFamily:"'JetBrains Mono', monospace",color:r.direction==='upward'?T.gn:T.am}}>{fc(r.price_point)}</span>
                    <span style={{fontSize:9,color:r.direction==='upward'?T.gn:T.am,fontFamily:"'JetBrains Mono', monospace"}}>{r.delta_pct>=0?"+":""}{r.delta_pct.toFixed(2)}%</span>
                    <span style={{fontSize:8,padding:"1px 5px",borderRadius:2,background:badge(r.confidence)+"20",color:badge(r.confidence),fontWeight:700,textTransform:"uppercase"}}>{r.confidence}</span>
                    {r.status==='blocked' && <span style={{fontSize:8,padding:"1px 5px",borderRadius:2,background:T.rd+"20",color:T.rd,fontWeight:700}}>BLOCKED</span>}
                    {r.scheduled_start && <span style={{fontSize:8,padding:"1px 5px",borderRadius:2,background:T.cy+"20",color:T.cy,fontWeight:700}}>SCHED {r.scheduled_start}</span>}
                  </div>
                  <div style={{fontSize:9,color:T.t1,lineHeight:1.5,marginBottom:4}}>{r.reasoning}</div>
                  <div style={{display:"flex",gap:10,fontSize:8,fontFamily:"'JetBrains Mono', monospace",flexWrap:"wrap"}}>
                    <span style={{color:T.t3}}>ΔCVR <span style={{color:r.expected_impact.cvr_delta>0?T.gn:T.rd,fontWeight:600}}>{r.expected_impact.cvr_delta>0?"+":""}{r.expected_impact.cvr_delta.toFixed(2)}%</span></span>
                    <span style={{color:T.t3}}>ΔUnits <span style={{color:r.expected_impact.units_delta>0?T.gn:T.rd,fontWeight:600}}>{r.expected_impact.units_delta>0?"+":""}{r.expected_impact.units_delta}</span></span>
                    <span style={{color:T.t3}}>ΔContrib <span style={{color:r.expected_impact.contrib_delta>0?T.gn:T.rd,fontWeight:600}}>{r.expected_impact.contrib_delta>0?"+":""}{fc(r.expected_impact.contrib_delta)}</span></span>
                    <span style={{color:T.t3}}>ΔMargin <span style={{color:r.expected_impact.margin_delta>0?T.gn:T.rd,fontWeight:600}}>{r.expected_impact.margin_delta>0?"+":""}{r.expected_impact.margin_delta.toFixed(1)}%</span></span>
                    <span style={{color:T.t3}}>Dur <span style={{color:T.t1,fontWeight:600}}>{r.duration_days}d</span></span>
                    <span style={{color:T.t3}}>N <span style={{color:T.t1,fontWeight:600}}>{r.min_sample.toLocaleString()}</span></span>
                  </div>
                </div>
                {/* Action buttons — only show when pending+not-expanded and not blocked */}
                {(r.status==='pending' || r.status==='blocked') && rejectingId !== r.id && (
                  <div style={{display:"flex",gap:3,flexShrink:0}}>
                    <button disabled={r.status==='blocked'} onClick={()=>onApprove(r.id)} style={{width:26,height:26,borderRadius:4,border:"1px solid "+(r.status==='blocked'?T.bd:T.gn),background:r.status==='blocked'?T.bd+"30":T.gn+"20",color:r.status==='blocked'?T.t4:T.gn,fontSize:14,fontWeight:800,cursor:r.status==='blocked'?"not-allowed":"pointer"}}>✓</button>
                    <button onClick={()=>onStartReject(r.id)} style={{width:26,height:26,borderRadius:4,border:"1px solid "+T.rd,background:T.rd+"20",color:T.rd,fontSize:14,fontWeight:800,cursor:"pointer"}}>✕</button>
                  </div>
                )}
              </div>
              
              {/* Reject feedback expansion */}
              {rejectingId === r.id && (
                <div style={{marginTop:6,paddingTop:6,borderTop:"1px solid "+T.bd+"60"}}>
                  <textarea 
                    autoFocus
                    value={reasonText}
                    onChange={e=>setReasonText(e.target.value)}
                    placeholder="Why? (e.g. 'margin risk too high', 'competitor just moved', 'wrong SKU to test')"
                    rows={2}
                    style={{width:"100%",background:T.cd,border:"1px solid "+T.am+"60",borderRadius:4,color:T.tx,padding:"6px 8px",fontSize:9,fontFamily:"'Outfit', sans-serif",resize:"vertical",minHeight:40,outline:"none",lineHeight:1.4}}
                  />
                  <div style={{display:"flex",gap:4,marginTop:4}}>
                    <button onClick={onSubmitReject} disabled={!reasonText.trim()} style={{...btnBase,flex:1,border:"1px solid "+T.am,background:T.am+"20",color:T.am,opacity:reasonText.trim()?1:0.4}}>Submit feedback</button>
                    <button onClick={onCancelReject} style={{...btnBase,padding:"4px 10px",border:"1px solid "+T.bd,background:"transparent",color:T.t2}}>Cancel</button>
                  </div>
                </div>
              )}
              
              {/* Approved/rejected state */}
              {r.status === 'approved' && (
                <div style={{marginTop:6,padding:"5px 8px",background:T.gn+"15",border:"1px solid "+T.gn+"40",borderRadius:4,fontSize:9,color:T.gn,fontWeight:600}}>
                  ✓ Approved · test queued, feedback logged as positive signal
                </div>
              )}
              {r.status === 'rejected' && (
                <div style={{marginTop:6,padding:"5px 8px",background:T.rd+"12",border:"1px solid "+T.rd+"40",borderRadius:4}}>
                  <div style={{fontSize:9,color:T.rd,fontWeight:600}}>✕ Rejected · feedback logged</div>
                  <div style={{fontSize:9,color:T.t2,fontStyle:"italic",marginTop:2,lineHeight:1.4}}>"{r.reason}"</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComponentInventory({ comp }) {
  const statusColor = comp.daysCover < 30 ? T.rd : comp.daysCover < 56 ? T.am : T.gn;
  const statusLabel = comp.daysCover < 30 ? "Critical" : comp.daysCover < 56 ? "Stockout Risk" : "Healthy";
  const thisSkuVel = (comp.avgWeekly / 7) * comp.thisSkuShare;
  
  return (
    <div style={{background:T.bg,borderRadius:6,padding:"10px 12px",border:"1px solid "+T.bd}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.tx}}>{comp.name}</div>
          <div style={{fontSize:9,color:T.t3,fontFamily:"'JetBrains Mono', monospace",marginTop:1}}>{comp.gen_sku} • {comp.skuCount} mkt SKUs • {comp.marketing}{comp.balanced===false && <span style={{color:T.am}}> • UNBALANCED</span>}</div>
        </div>
        <span style={{fontSize:8,padding:"3px 6px",borderRadius:3,background:statusColor+"20",color:statusColor,fontWeight:700}}>{statusLabel.toUpperCase()}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:6,fontSize:9,fontFamily:"'JetBrains Mono', monospace",marginBottom:8}}>
        <div>
          <div style={{color:T.t3,fontSize:8}}>On-hand</div>
          <div style={{color:T.t1,fontWeight:700,fontSize:12}}>{comp.onHand}</div>
        </div>
        <div>
          <div style={{color:T.t3,fontSize:8}}>Avg Weekly</div>
          <div style={{color:T.t1,fontWeight:700,fontSize:12}}>{comp.avgWeekly}</div>
        </div>
        <div>
          <div style={{color:T.t3,fontSize:8}}>Days Cover</div>
          <div style={{color:statusColor,fontWeight:700,fontSize:12}}>{comp.daysCover}</div>
        </div>
        <div>
          <div style={{color:T.t3,fontSize:8}}>FOB Cost</div>
          <div style={{color:T.t1,fontWeight:700,fontSize:12}}>${comp.cost.toFixed(0)}</div>
        </div>
      </div>
      <div style={{background:T.cd,borderRadius:4,padding:"6px 8px",border:"1px solid "+T.bd}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:T.t3,marginBottom:3}}>
          <span>This SKU's share of component velocity</span>
          <span style={{color:T.cy,fontWeight:700}}>{(comp.thisSkuShare*100).toFixed(0)}% ({thisSkuVel.toFixed(1)}/d)</span>
        </div>
        <div style={{height:5,background:T.bd,borderRadius:2,overflow:"hidden",display:"flex"}}>
          <div style={{width:(comp.thisSkuShare*100)+"%",height:"100%",background:T.cy}}/>
          <div style={{width:((1-comp.thisSkuShare)*100)+"%",height:"100%",background:T.t4+"80"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:T.t4,marginTop:3}}>
          <span>This SKU: {(comp.thisSkuShare*100).toFixed(0)}%</span>
          <span>Other {comp.skuCount-1} SKUs: {((1-comp.thisSkuShare)*100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

function VelocityChart({ sku }) {
  // Chart spans: 30 days of history + weekly forward projection out to Week 35
  // SVG uses viewBox + width:100% so it scales to fill its 2/3 grid column
  // PAD_T is sized to reserve a pill zone above the plot area for top-anchored markers
  const W = 960, H = 460;
  const PAD_L = 54, PAD_R = 24, PAD_T = 74, PAD_B = 54;
  const PILL_ZONE_TOP = 4; // top pills start at this y (above plot, inside SVG)
  
  // Marker colors — distinct from stockout/inventory palette
  const ARRIVAL = "#facc15"; // yellow — already-scheduled shipments
  const IMPACT  = "#f97316"; // orange — theoretical (if we ordered today)
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  
  // Build timeline: past 30 days + 22 future weeks (to Week 35 = 8/30)
  // Convert week dates to day offsets from today
  const msPerDay = 86400000;
  const futureWeeks = BASE_WEEKLY.map((b, i) => {
    const [m, d, y] = b.date.split('/').map(Number);
    const dt = new Date(y, m-1, d);
    return Math.round((dt - TODAY) / msPerDay);
  });
  // First week shows as "today or soon" offset, last is ~142 days out
  const minDay = -30;
  const maxDay = Math.max(...futureWeeks) + 3;
  const totalDays = maxDay - minDay;
  
  const xScale = d => PAD_L + ((d - minDay) / totalDays) * innerW;
  
  // Y axis for inventory — must include past-extrapolated peaks to keep lines inside the plot
  const basePastPeak = sku.components[0].onHand + 30 * (sku.components[0].avgWeekly / 7) + 6;
  const mattPastPeak = sku.components[1].onHand + 30 * (sku.components[1].avgWeekly / 7) + 6;
  const allInv = [
    ...BASE_WEEKLY.map(b=>b.inv),
    ...MATT_WEEKLY.map(b=>b.inv),
    sku.components[0].onHand,
    sku.components[1].onHand,
    basePastPeak,
    mattPastPeak,
  ];
  const maxInv = Math.max(...allInv) * 1.1;
  const yInv = v => PAD_T + innerH - (v / maxInv) * innerH;
  
  // Y axis for contribution bars (in PAST only)
  const maxContrib = Math.max(...PAST_VELOCITY.map(d=>d.contrib)) * 1.4;
  const yContrib = v => PAD_T + innerH - (v / maxContrib) * innerH;
  
  // Build inventory paths — past (daily) and future (weekly) kept in separate arrays
  // so we never backtrack through day 0. Past ends at day 0 with current on-hand,
  // future starts at day 0 with current on-hand and only includes week points where day > 0.
  const buildPaths = (compData, onHand, avgWeekly) => {
    const dailyVel = avgWeekly / 7;
    const past = [];
    for (let i = -30; i <= 0; i++) {
      const daysAgo = -i;
      const inv = onHand + daysAgo * dailyVel + Math.sin(i/4) * 6;
      past.push({ day: i, inv });
    }
    const future = [{ day: 0, inv: onHand }];
    compData.forEach((w, idx) => {
      if (futureWeeks[idx] > 0) future.push({ day: futureWeeks[idx], inv: w.inv });
    });
    return { past, future };
  };
  
  const baseData = buildPaths(BASE_WEEKLY, sku.components[0].onHand, sku.components[0].avgWeekly);
  const mattData = buildPaths(MATT_WEEKLY, sku.components[1].onHand, sku.components[1].avgWeekly);
  
  const pathFromPoints = (pts) => pts.map((p, i) => `${i===0?'M':'L'}${xScale(p.day)},${yInv(p.inv)}`).join(' ');
  
  // Find first stockout day in the FUTURE path only
  const findStockout = (futurePts) => {
    for (let i = 0; i < futurePts.length; i++) {
      if (futurePts[i].day > 0 && futurePts[i].inv <= 0) return futurePts[i].day;
    }
    return null;
  };
  const baseStockout = findStockout(baseData.future);
  const mattStockout = findStockout(mattData.future);
  
  // Arrivals = already-scheduled shipments (from Jeannetta's data)
  const findArrival = (compData) => {
    for (let i = 0; i < compData.length; i++) {
      if (compData[i].impact > 0) return { 
        day: futureWeeks[i], 
        qty: compData[i].impact, 
        week: compData[i].week,
        dc: compData[i].dc || 'DC'
      };
    }
    return null;
  };
  const baseArrival = findArrival(BASE_WEEKLY);
  const mattArrival = findArrival(MATT_WEEKLY);
  
  // Impacts = lead-time markers (earliest we could land a new order IF we ordered today)
  const baseImpactDay = BASE_LEAD_WEEKS * 7;
  const mattImpactDay = MATT_LEAD_WEEKS * 7;
  
  // Target zone (35-42 days from today)
  const targetStart = 35;
  const targetEnd = 49;
  
  // Month markers
  const monthMarkers = [];
  for (let i = minDay; i <= maxDay; i++) {
    const d = new Date(TODAY);
    d.setDate(d.getDate() + i);
    if (d.getDate() === 1) {
      monthMarkers.push({ day: i, label: d.toLocaleDateString('en', { month: 'short' }) });
    }
  }
  
  // Week markers (Mondays, excluding month starts)
  const weekMarkers = [];
  for (let i = minDay; i <= maxDay; i++) {
    const d = new Date(TODAY);
    d.setDate(d.getDate() + i);
    if (d.getDay() === 1 && d.getDate() !== 1 && i !== 0) {
      weekMarkers.push({ day: i });
    }
  }
  
  // Collect all vertical markers (stockouts, arrivals, impacts) into one array
  // Top-anchored = stockouts + impacts (warning/constraint info, pills at top edge)
  // Bottom-anchored = arrivals (scheduled events, pills at bottom edge)
  // Greedy row assignment runs separately per anchor so the two groups stack independently
  const rawMarkers = [];
  if (mattStockout !== null) rawMarkers.push({
    day: mattStockout, color: T.pu, anchor: 'top',
    l1: "MATTRESS STOCKOUT", l2: "Week of 5/17 (+37d)",
  });
  if (baseStockout !== null) rawMarkers.push({
    day: baseStockout, color: T.ac, anchor: 'top',
    l1: "BASE STOCKOUT", l2: "Week of 6/28 (+79d)",
  });
  if (mattArrival) rawMarkers.push({
    day: mattArrival.day, color: ARRIVAL, anchor: 'top',
    l1: "MATTRESS ARRIVAL",
    l2: `+${mattArrival.qty} → ${mattArrival.dc} · ${mattArrival.week.replace('Week ','Wk ')}`,
  });
  if (baseArrival) rawMarkers.push({
    day: baseArrival.day, color: ARRIVAL, anchor: 'top',
    l1: "BASE ARRIVAL",
    l2: `+${baseArrival.qty} → ${baseArrival.dc} · ${baseArrival.week.replace('Week ','Wk ')}`,
  });
  rawMarkers.push({
    day: mattImpactDay, color: IMPACT, anchor: 'top',
    l1: "MATTRESS IMPACT", l2: `${MATT_LEAD_WEEKS}wk lead · if ordered today`,
  });
  rawMarkers.push({
    day: baseImpactDay, color: IMPACT, anchor: 'top',
    l1: "BASE IMPACT", l2: `${BASE_LEAD_WEEKS}wk lead · if ordered today`,
  });
  
  // Pill dimensions + compute each marker's pill x-range
  const PILL_W = 108, PILL_H = 26, PILL_ROW_GAP = 4;
  const PILL_ROW_H = PILL_H + PILL_ROW_GAP;
  rawMarkers.forEach(m => {
    m.x = xScale(m.day);
    m.pillX = m.x - PILL_W - 4;
    m.pillEnd = m.x - 4;
  });
  
  // Greedy row assignment — runs per anchor group so top and bottom stack independently
  const assignRows = (arr) => {
    const sorted = [...arr].sort((a, b) => a.x - b.x);
    const placed = [];
    sorted.forEach(m => {
      let row = 0;
      while (placed.some(p => p.row === row && !(m.pillEnd < p.pillX || m.pillX > p.pillEnd))) {
        row++;
      }
      placed.push({ ...m, row });
    });
    return placed;
  };
  const topMarkers = assignRows(rawMarkers.filter(m => m.anchor === 'top'));
  const bottomMarkers = assignRows(rawMarkers.filter(m => m.anchor === 'bottom'));
  
  return (
    <div style={{background:T.cd,borderRadius:10,border:"1px solid "+T.bd,padding:"14px 16px",display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{marginBottom:8}}>
        <div style={{fontSize:11,fontWeight:700,color:T.tx,textTransform:"uppercase",letterSpacing:.4}}>Component Inventory Projection</div>
        <div style={{fontSize:9,color:T.t3,marginTop:1}}>Past 30d daily + weekly forward to Week 35 • Arrivals from WIP, impacts from vendor lead times</div>
      </div>
      
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{display:"block",width:"100%",height:"auto"}}>
        {/* Target zone */}
        <rect x={xScale(targetStart)} y={PAD_T} width={xScale(targetEnd)-xScale(targetStart)} height={innerH} fill={T.gn+"0a"} stroke={T.gn+"30"} strokeWidth={1} strokeDasharray="2,2"/>
        <text x={xScale(targetStart)+4} y={PAD_T+11} fontSize={9} fill={T.gn} fontFamily="Outfit">Target 5-6 wk</text>
        
        {/* Week gridlines */}
        {weekMarkers.map((w,i)=>(
          <line key={"w"+i} x1={xScale(w.day)} y1={PAD_T} x2={xScale(w.day)} y2={PAD_T+innerH} stroke={T.bd+"50"} strokeWidth={0.5}/>
        ))}
        
        {/* Month markers — labels only, no vertical lines (too noisy) */}
        {monthMarkers.map((m,i)=>(
          <text key={"m"+i} x={xScale(m.day)+3} y={H-28} fontSize={10} fill={T.t2} fontFamily="Outfit" fontWeight={700}>{m.label}</text>
        ))}
        
        {/* Today line */}
        <line x1={xScale(0)} y1={PAD_T-6} x2={xScale(0)} y2={PAD_T+innerH} stroke={T.tx} strokeWidth={1.5} strokeDasharray="3,2"/>
        <text x={xScale(0)+4} y={PAD_T-2} fontSize={10} fill={T.tx} fontFamily="Outfit" fontWeight={700}>TODAY</text>
        
        {/* Contribution bars (past only) */}
        {PAST_VELOCITY.map((d, i) => (
          <rect key={"c"+i} x={xScale(d.day)-1.5} y={yContrib(d.contrib)} width={2.5} height={PAD_T+innerH-yContrib(d.contrib)} fill={T.gn+"30"}/>
        ))}
        
        {/* Inventory paths - past solid */}
        <path d={pathFromPoints(baseData.past)} fill="none" stroke={T.ac} strokeWidth={2}/>
        <path d={pathFromPoints(mattData.past)} fill="none" stroke={T.pu} strokeWidth={2}/>
        
        {/* Inventory paths - future dashed */}
        <path d={pathFromPoints(baseData.future)} fill="none" stroke={T.ac} strokeWidth={2} strokeDasharray="4,3"/>
        <path d={pathFromPoints(mattData.future)} fill="none" stroke={T.pu} strokeWidth={2} strokeDasharray="4,3"/>
        
        {/* Week data points */}
        {baseData.future.filter(p => p.day > 0).map((p, i) => (
          <circle key={"bwp"+i} cx={xScale(p.day)} cy={yInv(p.inv)} r={2.5} fill={T.ac}/>
        ))}
        {mattData.future.filter(p => p.day > 0).map((p, i) => (
          <circle key={"mwp"+i} cx={xScale(p.day)} cy={yInv(p.inv)} r={2.5} fill={T.pu}/>
        ))}
        
        {/* Top-anchored markers (stockouts + impacts) — pills sit ABOVE the plot, lines extend down through plot */}
        {topMarkers.map((m, i) => {
          const pillY = PILL_ZONE_TOP + m.row * PILL_ROW_H;
          return (
            <g key={"tmk"+i}>
              <line x1={m.x} y1={pillY + PILL_H} x2={m.x} y2={PAD_T+innerH} stroke={m.color} strokeWidth={1.5}/>
              <rect x={m.pillX} y={pillY} width={PILL_W} height={PILL_H} fill={m.color+"22"} stroke={m.color} strokeWidth={1} rx={3}/>
              <text x={m.pillX+6} y={pillY+11} fontSize={9} fill={m.color} fontFamily="Outfit" fontWeight={700}>{m.l1}</text>
              <text x={m.pillX+6} y={pillY+21} fontSize={8} fill={m.color} fontFamily="Outfit" fontWeight={600}>{m.l2}</text>
            </g>
          );
        })}
        
        {/* Bottom-anchored markers (arrivals) — pills stack upward from bottom */}
        {bottomMarkers.map((m, i) => {
          const pillY = PAD_T + innerH - PILL_H - 4 - m.row * PILL_ROW_H;
          return (
            <g key={"bmk"+i}>
              <line x1={m.x} y1={PAD_T} x2={m.x} y2={PAD_T+innerH} stroke={m.color} strokeWidth={1.5}/>
              <rect x={m.pillX} y={pillY} width={PILL_W} height={PILL_H} fill={m.color+"22"} stroke={m.color} strokeWidth={1} rx={3}/>
              <text x={m.pillX+6} y={pillY+11} fontSize={9} fill={m.color} fontFamily="Outfit" fontWeight={700}>{m.l1}</text>
              <text x={m.pillX+6} y={pillY+21} fontSize={8} fill={m.color} fontFamily="Outfit" fontWeight={600}>{m.l2}</text>
            </g>
          );
        })}
        
        {/* Y axis */}
        <text x={8} y={PAD_T+4} fontSize={9} fill={T.t3} fontFamily="Outfit">Units</text>
        <text x={8} y={PAD_T+innerH+4} fontSize={9} fill={T.t3} fontFamily="Outfit">0</text>
        <text x={8} y={yInv(maxInv/2)+3} fontSize={9} fill={T.t3} fontFamily="Outfit">{Math.round(maxInv/2)}</text>
        <text x={8} y={yInv(maxInv*0.85)+3} fontSize={9} fill={T.t3} fontFamily="Outfit">{Math.round(maxInv*0.85)}</text>
        
        {/* X axis relative markers */}
        <text x={xScale(-30)} y={H-10} fontSize={9} fill={T.t3} fontFamily="Outfit" textAnchor="middle">-30d</text>
        <text x={xScale(0)} y={H-10} fontSize={9} fill={T.tx} fontFamily="Outfit" textAnchor="middle" fontWeight={700}>Today</text>
        <text x={xScale(30)} y={H-10} fontSize={9} fill={T.t3} fontFamily="Outfit" textAnchor="middle">+30d</text>
        <text x={xScale(60)} y={H-10} fontSize={9} fill={T.t3} fontFamily="Outfit" textAnchor="middle">+60d</text>
        <text x={xScale(90)} y={H-10} fontSize={9} fill={T.t3} fontFamily="Outfit" textAnchor="middle">+90d</text>
        <text x={xScale(120)} y={H-10} fontSize={9} fill={T.t3} fontFamily="Outfit" textAnchor="middle">+120d</text>
      </svg>
      
      {/* Legend */}
      <div style={{display:"flex",flexWrap:"wrap",gap:"6px 16px",fontSize:9,marginTop:10,paddingTop:8,borderTop:"1px solid "+T.bd+"80",justifyContent:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:14,height:2,background:T.ac}}/>
          <span style={{color:T.t2}}>Base (GEN-AB-E-Q)</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:14,height:2,background:T.pu}}/>
          <span style={{color:T.t2}}>Mattress (SS10QN)</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:10,height:6,background:T.gn+"40"}}/>
          <span style={{color:T.t2}}>Contrib $/d (past)</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:14,height:2,background:ARRIVAL}}/>
          <span style={{color:T.t2}}>Arrival (scheduled)</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:14,height:2,background:IMPACT}}/>
          <span style={{color:T.t2}}>Impact (lead time)</span>
        </div>
      </div>
    </div>
  );
}

const INITIAL_ACTION_RECS = [
  { 
    id: 1, type: 'inventory', sev: 'critical', icon: '⚠',
    title: 'Mattress stockout gap',
    body: 'SS10QN depletes Week 20 (5/17). Next mattress impact Week 28 (7/12) → MCS. 8 week gap.',
    impact: '~$24K lost revenue',
    status: 'pending', reason: null,
  },
  {
    id: 2, type: 'pricing', sev: 'warning', icon: '→',
    title: 'Raise price to slow velocity',
    body: 'Test $1249.99 (+3.73%). Slows velocity ~8%, buys days of cover. Also raises reference price ahead of Summer Prime.',
    impact: '+$1,840 contribution (14d)',
    status: 'pending', reason: null,
  },
  {
    id: 3, type: 'spend', sev: 'opportunity', icon: '↑',
    title: 'Shift $420/d to Essential 12" Queen',
    body: 'SS12QN mattress has 8+ weeks cover. Similar CVR (1.02% vs 0.98%), higher contribution per unit ($428 vs $412).',
    impact: '+$672/d contribution',
    status: 'pending', reason: null,
  },
  {
    id: 4, type: 'balance', sev: 'warning', icon: '⚖',
    title: 'DC imbalance — SS10QN',
    body: 'Mattress 68% JAX, base 55% MCS. Pushing velocity without rebalancing means split-DC shipments on bundle orders.',
    impact: 'Prevents ~$3.2K/mo surcharges',
    status: 'pending', reason: null,
  },
];

function Recommendations() {
  const [recs, setRecs] = useState(INITIAL_ACTION_RECS);
  const [rejectingId, setRejectingId] = useState(null);
  const [reasonText, setReasonText] = useState("");
  
  const approve = (id) => {
    setRecs(recs.map(r => r.id === id ? {...r, status: 'approved'} : r));
    // In production: POST /api/recommendation_feedback { rec_id, decision: 'approve', context: {...} }
    // Engine reinforces this recommendation type + its trigger conditions
  };
  const startReject = (id) => { setRejectingId(id); setReasonText(""); };
  const submitReject = () => {
    const reason = reasonText.trim();
    setRecs(recs.map(r => r.id === rejectingId ? {...r, status: 'rejected', reason} : r));
    setRejectingId(null);
    setReasonText("");
    // In production: POST /api/recommendation_feedback { rec_id, decision: 'reject', reason, context: {...} }
    // Engine down-weights this rec type + stores reason for NLP-based pattern extraction
  };
  const cancelReject = () => { setRejectingId(null); setReasonText(""); };
  
  const colors = { critical: T.rd, warning: T.am, opportunity: T.cy };
  const labels = { inventory: 'INVENTORY', pricing: 'PRICING', spend: 'SPEND', balance: 'LOGISTICS' };
  const btnBase = {padding:"4px 8px",borderRadius:4,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit', sans-serif"};
  
  return (
    <div style={{background:T.cd,borderRadius:10,border:"1px solid "+T.bd,overflow:"hidden",borderLeft:"3px solid "+T.am,height:"100%"}}>
      <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.bd,background:T.bg2}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:11,fontWeight:700,color:T.tx,textTransform:"uppercase",letterSpacing:.4}}>Recommended Actions</div>
          <span style={{fontSize:8,padding:"2px 5px",borderRadius:2,background:T.pu+"20",color:T.pu,fontWeight:700,letterSpacing:.3}}>SELF-LEARNING</span>
        </div>
        <div style={{fontSize:9,color:T.t3,marginTop:1}}>Your feedback trains the engine ⟳</div>
      </div>
      <div style={{padding:"4px 12px"}}>
        {recs.map((r,i)=>(
          <div key={r.id} style={{padding:"10px 0",borderBottom:i<recs.length-1?"1px solid "+T.bd+"60":"none"}}>
            <div style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:6}}>
              <div style={{fontSize:14,color:colors[r.sev],marginTop:-2}}>{r.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3,flexWrap:"wrap"}}>
                  <span style={{fontSize:7,padding:"2px 4px",borderRadius:2,background:colors[r.sev]+"20",color:colors[r.sev],fontWeight:700,letterSpacing:.3}}>{labels[r.type]}</span>
                </div>
                <div style={{fontSize:10,fontWeight:700,color:T.tx,marginBottom:3,lineHeight:1.3}}>{r.title}</div>
                <div style={{fontSize:9,color:T.t2,lineHeight:1.45,marginBottom:4}}>{r.body}</div>
                <div style={{fontSize:9,color:T.gn,fontWeight:600,fontFamily:"'JetBrains Mono', monospace"}}>{r.impact}</div>
              </div>
            </div>
            
            {/* Feedback UI — state-dependent */}
            {r.status === 'pending' && rejectingId !== r.id && (
              <div style={{display:"flex",gap:4,marginLeft:22}}>
                <button onClick={()=>approve(r.id)} style={{...btnBase,flex:1,border:"1px solid "+T.gn,background:T.gn+"20",color:T.gn}}>✓ Approve</button>
                <button onClick={()=>startReject(r.id)} style={{...btnBase,flex:1,border:"1px solid "+T.rd,background:T.rd+"20",color:T.rd}}>✕ Reject</button>
              </div>
            )}
            {r.status === 'pending' && rejectingId === r.id && (
              <div style={{marginLeft:22}}>
                <textarea 
                  autoFocus
                  value={reasonText} 
                  onChange={e=>setReasonText(e.target.value)}
                  placeholder="Why? (e.g. 'already handled', 'wrong timing', 'bad assumption')"
                  rows={2}
                  style={{width:"100%",background:T.bg,border:"1px solid "+T.am+"60",borderRadius:4,color:T.tx,padding:"6px 8px",fontSize:9,fontFamily:"'Outfit', sans-serif",resize:"vertical",minHeight:36,outline:"none",lineHeight:1.4}}
                />
                <div style={{display:"flex",gap:4,marginTop:4}}>
                  <button onClick={submitReject} disabled={!reasonText.trim()} style={{...btnBase,flex:1,border:"1px solid "+T.am,background:T.am+"20",color:T.am,opacity:reasonText.trim()?1:0.4}}>Submit feedback</button>
                  <button onClick={cancelReject} style={{...btnBase,padding:"4px 10px",border:"1px solid "+T.bd,background:"transparent",color:T.t2}}>Cancel</button>
                </div>
              </div>
            )}
            {r.status === 'approved' && (
              <div style={{marginLeft:22,padding:"5px 8px",background:T.gn+"15",border:"1px solid "+T.gn+"40",borderRadius:4,fontSize:9,color:T.gn,fontWeight:600}}>
                ✓ Approved · logged as positive signal
              </div>
            )}
            {r.status === 'rejected' && (
              <div style={{marginLeft:22,padding:"5px 8px",background:T.rd+"12",border:"1px solid "+T.rd+"40",borderRadius:4}}>
                <div style={{fontSize:9,color:T.rd,fontWeight:600}}>✕ Rejected · feedback logged</div>
                <div style={{fontSize:9,color:T.t2,fontStyle:"italic",marginTop:2,lineHeight:1.4}}>"{r.reason}"</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── PRICING MANAGEMENT CARD ─────────────── */

const PRICING_DATA = {
  list_price: 1499.99,
  list_price_validated: true, // validated against Amazon catalog
  business_price: 1149.99,
  business_badge_earned: true, // Amazon blue "Business Price" badge
  business_tiers: [
    { min_qty: 2, discount_pct: 3 },
    { min_qty: 5, discount_pct: 5 },
    { min_qty: 10, discount_pct: 8 },
    { min_qty: 25, discount_pct: 12 },
  ],
  reference_price: 1179.99,
  best_deal: { price: 1019.99, margin_pct: 12.4, start: "7/7", end: "7/13", label: "Summer Prime", allocated_units: 150, units_claimed: 0 },
  lightning_deal: { price: 959.99, margin_pct: 8.1, last_run: "3/15", units_sold: 38, revenue: 36479.62, allocated_units: 50, units_claimed: 38 },
  limited_time_deals: [
    { label: "Memorial Day LTD", price: 1079.99, start: "5/18", end: "5/28", status: "scheduled", allocated_units: 80, units_claimed: 0 },
    { label: "BFCM LTD", price: 999.99, start: "11/19", end: "12/2", status: "planned", allocated_units: 200, units_claimed: 0 },
  ],
  history: [
    { date: "4/10", list: 1499.99, business: 1149.99, buybox: 1204.99, reference: 1179.99 },
    { date: "4/3", list: 1499.99, business: 1149.99, buybox: 1204.99, reference: 1179.99 },
    { date: "3/27", list: 1499.99, business: 1149.99, buybox: 1204.99, reference: 1189.99 },
    { date: "3/20", list: 1499.99, business: 1179.99, buybox: 1229.99, reference: 1199.99 },
    { date: "3/13", list: 1499.99, business: 1179.99, buybox: 1179.99, reference: 1159.99 },
    { date: "3/6", list: 1499.99, business: 1179.99, buybox: 1159.99, reference: 1159.99 },
    { date: "2/27", list: 1499.99, business: 1179.99, buybox: 1204.99, reference: 1159.99 },
  ],
};

function PricingManagement({ sku }) {
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const d = PRICING_DATA;
  const sectionHead = (label) => (
    <div style={{fontSize:9,fontWeight:700,color:T.cy,textTransform:"uppercase",letterSpacing:.5,marginBottom:8,marginTop:14,paddingBottom:4,borderBottom:"1px solid "+T.bd}}>
      {label}
    </div>
  );
  const priceRow = (label, value, sub, editable, color, badge) => (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid "+T.bd+"40"}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:10,color:T.t1}}>{label}</span>
        {sub && <span style={{fontSize:8,color:T.t4}}>({sub})</span>}
        {badge}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono', monospace",color:color||T.t1}}>{fc(value)}</span>
        {editable && (
          <button onClick={()=>{setEditField(label);setEditValue(String(value));}} style={{fontSize:7,padding:"2px 5px",borderRadius:3,border:"1px solid "+T.bd,background:"transparent",color:T.t3,cursor:"pointer",fontFamily:"'Outfit', sans-serif"}}>edit</button>
        )}
      </div>
    </div>
  );

  const validatedBadge = (isValidated) => (
    <span style={{fontSize:7,padding:"2px 6px",borderRadius:3,background:isValidated?T.gn+"20":T.rd+"20",color:isValidated?T.gn:T.rd,fontWeight:700,textTransform:"uppercase",letterSpacing:.3}}>
      {isValidated ? "VALIDATED" : "NOT VALIDATED"}
    </span>
  );
  const blueBadge = (earned) => (
    <span style={{fontSize:7,padding:"2px 6px",borderRadius:3,background:earned?"#2563eb20":"#ef444420",color:earned?"#60a5fa":"#f87171",fontWeight:700,textTransform:"uppercase",letterSpacing:.3}}>
      {earned ? "BLUE BADGE EARNED" : "BLUE BADGE NOT EARNED"}
    </span>
  );

  return (
    <div style={{background:T.cd,borderRadius:10,border:"1px solid "+T.bd,overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.bd,display:"flex",justifyContent:"space-between",alignItems:"center",background:T.bg2}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.tx,textTransform:"uppercase",letterSpacing:.4}}>Pricing Management</div>
          <div style={{fontSize:9,color:T.t3,marginTop:1}}>Track, edit & analyze all price types — daily historicals, 1 yr retention</div>
        </div>
        <span style={{fontSize:9,padding:"3px 8px",borderRadius:3,background:T.cy+"20",color:T.cy,fontWeight:700}}>ASIN: {sku.asin}</span>
      </div>
      <div style={{padding:"12px 14px"}}>

        {/* Edit overlay */}
        {editField && (
          <div style={{background:T.bg,border:"1px solid "+T.am+"60",borderRadius:6,padding:"10px 12px",marginBottom:10}}>
            <div style={{fontSize:9,color:T.am,fontWeight:700,marginBottom:4}}>Editing: {editField}</div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <span style={{fontSize:12,color:T.t3}}>$</span>
              <input type="number" value={editValue} onChange={e=>setEditValue(e.target.value)} style={{background:T.cd,border:"1px solid "+T.am,borderRadius:4,color:T.am,padding:"4px 8px",fontSize:13,fontWeight:700,fontFamily:"'JetBrains Mono', monospace",width:130,outline:"none"}}/>
              <button onClick={()=>setEditField(null)} style={{fontSize:9,padding:"4px 10px",borderRadius:4,border:"1px solid "+T.gn,background:T.gn+"20",color:T.gn,cursor:"pointer",fontWeight:700,fontFamily:"'Outfit', sans-serif"}}>Save</button>
              <button onClick={()=>setEditField(null)} style={{fontSize:9,padding:"4px 10px",borderRadius:4,border:"1px solid "+T.bd,background:"transparent",color:T.t3,cursor:"pointer",fontFamily:"'Outfit', sans-serif"}}>Cancel</button>
            </div>
            <div style={{fontSize:8,color:T.t4,marginTop:4}}>Changes logged with timestamp. Previous value preserved in history.</div>
          </div>
        )}

        {/* Core Prices */}
        {sectionHead("Core Prices")}
        {priceRow("List Price", d.list_price, "MSRP / strikethrough", true, null, validatedBadge(d.list_price_validated))}
        {priceRow("Buybox Price", sku.buybox_price, "current", false, T.gn)}
        {priceRow("Reference Price", d.reference_price, "30d trailing low", false, T.cy)}
        {priceRow("Business Price", d.business_price, "B2B", true, T.pu, blueBadge(d.business_badge_earned))}

        {/* Business Tier Discounts */}
        {sectionHead("Business Price — Quantity Tiers")}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
          {d.business_tiers.map((t,i) => (
            <div key={i} style={{background:T.bg,borderRadius:6,padding:"8px 10px",border:"1px solid "+T.bd,textAlign:"center"}}>
              <div style={{fontSize:8,color:T.t3,textTransform:"uppercase",marginBottom:3}}>{t.min_qty}+ units</div>
              <div style={{fontSize:14,fontWeight:800,fontFamily:"'JetBrains Mono', monospace",color:T.pu}}>{t.discount_pct}%</div>
              <div style={{fontSize:9,color:T.t2,marginTop:2}}>{fc(d.business_price * (1 - t.discount_pct/100))}</div>
            </div>
          ))}
        </div>

        {/* Deal Prices */}
        {sectionHead("Deal Prices & Promo Calendar")}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <div style={{background:T.bg,borderRadius:6,padding:"10px 12px",border:"1px solid "+T.amz+"30"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:9,fontWeight:700,color:T.amz}}>Best Deal</span>
              <span style={{fontSize:8,color:T.t4}}>{d.best_deal.start} — {d.best_deal.end}</span>
            </div>
            <div style={{fontSize:16,fontWeight:800,fontFamily:"'JetBrains Mono', monospace",color:T.amz}}>{fc(d.best_deal.price)}</div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
              <span style={{fontSize:8,color:T.t3}}>Expected Margin</span>
              <span style={{fontSize:10,fontWeight:700,fontFamily:"'JetBrains Mono', monospace",color:d.best_deal.margin_pct>10?T.gn:T.am}}>{pt(d.best_deal.margin_pct)}</span>
            </div>
            <div style={{fontSize:8,color:T.pu,marginTop:3}}>{d.best_deal.label}</div>
            <div style={{marginTop:6,paddingTop:5,borderTop:"1px solid "+T.bd+"40"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:8,color:T.t3}}>Allocated Units</span>
                <span style={{fontSize:10,fontWeight:700,fontFamily:"'JetBrains Mono', monospace",color:T.t1}}>{d.best_deal.allocated_units}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:2}}>
                <span style={{fontSize:8,color:T.t3}}>Claimed</span>
                <span style={{fontSize:10,fontWeight:700,fontFamily:"'JetBrains Mono', monospace",color:d.best_deal.units_claimed>0?T.am:T.t4}}>{d.best_deal.units_claimed} / {d.best_deal.allocated_units}</span>
              </div>
              <div style={{height:4,background:T.bd,borderRadius:2,marginTop:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${(d.best_deal.units_claimed/d.best_deal.allocated_units)*100}%`,background:T.amz,borderRadius:2}}/>
              </div>
            </div>
          </div>
          <div style={{background:T.bg,borderRadius:6,padding:"10px 12px",border:"1px solid "+T.am+"30"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:9,fontWeight:700,color:T.am}}>Lightning Deal</span>
              <span style={{fontSize:8,color:T.t4}}>Last: {d.lightning_deal.last_run}</span>
            </div>
            <div style={{fontSize:16,fontWeight:800,fontFamily:"'JetBrains Mono', monospace",color:T.am}}>{fc(d.lightning_deal.price)}</div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
              <span style={{fontSize:8,color:T.t3}}>Expected Margin</span>
              <span style={{fontSize:10,fontWeight:700,fontFamily:"'JetBrains Mono', monospace",color:d.lightning_deal.margin_pct>10?T.gn:T.am}}>{pt(d.lightning_deal.margin_pct)}</span>
            </div>
            <div style={{fontSize:8,color:T.t3,marginTop:3}}>{d.lightning_deal.units_sold}u sold · {fc(d.lightning_deal.revenue)} rev</div>
            <div style={{marginTop:6,paddingTop:5,borderTop:"1px solid "+T.bd+"40"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:8,color:T.t3}}>Allocated Units</span>
                <span style={{fontSize:10,fontWeight:700,fontFamily:"'JetBrains Mono', monospace",color:T.t1}}>{d.lightning_deal.allocated_units}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:2}}>
                <span style={{fontSize:8,color:T.t3}}>Claimed</span>
                <span style={{fontSize:10,fontWeight:700,fontFamily:"'JetBrains Mono', monospace",color:d.lightning_deal.units_claimed>0?T.am:T.t4}}>{d.lightning_deal.units_claimed} / {d.lightning_deal.allocated_units}</span>
              </div>
              <div style={{height:4,background:T.bd,borderRadius:2,marginTop:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${(d.lightning_deal.units_claimed/d.lightning_deal.allocated_units)*100}%`,background:T.am,borderRadius:2}}/>
              </div>
            </div>
          </div>
        </div>

        {/* Limited Time Deals */}
        {d.limited_time_deals.map((ltd,i) => (
          <div key={i} style={{padding:"6px 10px",background:T.bg,borderRadius:5,border:"1px solid "+T.bd,marginBottom:4}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <span style={{fontSize:10,color:T.t1,fontWeight:600}}>{ltd.label}</span>
                <span style={{fontSize:8,color:T.t4,marginLeft:8}}>{ltd.start} — {ltd.end}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono', monospace",color:T.t1}}>{fc(ltd.price)}</span>
                <span style={{fontSize:8,padding:"2px 6px",borderRadius:3,background:ltd.status==='scheduled'?T.gn+"20":T.am+"20",color:ltd.status==='scheduled'?T.gn:T.am,fontWeight:700,textTransform:"uppercase"}}>{ltd.status}</span>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginTop:4,paddingTop:4,borderTop:"1px solid "+T.bd+"30"}}>
              <span style={{fontSize:8,color:T.t4}}>Allocated: <span style={{fontFamily:"'JetBrains Mono', monospace",color:T.t2,fontWeight:600}}>{ltd.allocated_units}u</span></span>
              <span style={{fontSize:8,color:T.t4}}>Claimed: <span style={{fontFamily:"'JetBrains Mono', monospace",color:ltd.units_claimed>0?T.am:T.t4,fontWeight:600}}>{ltd.units_claimed}u</span></span>
              <div style={{flex:1,height:3,background:T.bd,borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${ltd.allocated_units>0?(ltd.units_claimed/ltd.allocated_units)*100:0}%`,background:T.gn,borderRadius:2}}/>
              </div>
            </div>
          </div>
        ))}

        {/* Price History Mini-Table */}
        {sectionHead("Daily Price History (Last 7 Days)")}
        <div style={{overflowX:"auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"60px repeat(4,1fr)",gap:0,fontSize:9,fontFamily:"'JetBrains Mono', monospace"}}>
            <div style={{padding:"4px 6px",fontWeight:700,color:T.t3,fontSize:8,borderBottom:"1px solid "+T.bd}}>Date</div>
            <div style={{padding:"4px 6px",fontWeight:700,color:T.t3,fontSize:8,textAlign:"right",borderBottom:"1px solid "+T.bd}}>List</div>
            <div style={{padding:"4px 6px",fontWeight:700,color:T.t3,fontSize:8,textAlign:"right",borderBottom:"1px solid "+T.bd}}>Business</div>
            <div style={{padding:"4px 6px",fontWeight:700,color:T.t3,fontSize:8,textAlign:"right",borderBottom:"1px solid "+T.bd}}>Buybox</div>
            <div style={{padding:"4px 6px",fontWeight:700,color:T.t3,fontSize:8,textAlign:"right",borderBottom:"1px solid "+T.bd}}>Reference</div>
            {d.history.map((h,i) => (
              <React.Fragment key={i}>
                <div style={{padding:"3px 6px",color:T.t2,borderBottom:"1px solid "+T.bd+"40"}}>{h.date}</div>
                <div style={{padding:"3px 6px",color:T.t1,textAlign:"right",borderBottom:"1px solid "+T.bd+"40"}}>{fc(h.list)}</div>
                <div style={{padding:"3px 6px",color:T.pu,textAlign:"right",borderBottom:"1px solid "+T.bd+"40"}}>{fc(h.business)}</div>
                <div style={{padding:"3px 6px",color:T.gn,textAlign:"right",borderBottom:"1px solid "+T.bd+"40"}}>{fc(h.buybox)}</div>
                <div style={{padding:"3px 6px",color:T.cy,textAlign:"right",borderBottom:"1px solid "+T.bd+"40"}}>{fc(h.reference)}</div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div style={{fontSize:8,color:T.t4,marginTop:6,textAlign:"right"}}>Daily granularity · 1 year retention · <span style={{color:T.ac,cursor:"pointer"}}>View full history →</span></div>
      </div>
    </div>
  );
}

/* ─────────────── COMPETITIVE LANDSCAPE CARD ─────────────── */

const COMPETITORS = [
  {
    asin: "B0863CMF8F",
    title: "Essential 10\" Queen",
    brand: "SSM",
    is_hero: true,
    bsr: 142,
    bsr_trend: "up",
    rating: 4.6,
    reviews: 3847,
    price: 1204.99,
    impression_share: 34.2,
    click_share: 28.7,
    cart_share: 31.5,
    conversion_share: 33.1,
  },
  {
    asin: "B09HJLY5R4",
    title: "Purple RestorePlus Hybrid",
    brand: "Purple",
    is_hero: false,
    bsr: 98,
    bsr_trend: "down",
    rating: 4.4,
    reviews: 5214,
    price: 1189.00,
    impression_share: 22.1,
    click_share: 19.4,
    cart_share: 17.8,
    conversion_share: 16.2,
  },
  {
    asin: "B0CXDY3WNX",
    title: "Nectar Premier Hybrid Queen",
    brand: "Nectar",
    is_hero: false,
    bsr: 67,
    bsr_trend: "up",
    rating: 4.5,
    reviews: 8912,
    price: 1049.00,
    impression_share: 18.6,
    click_share: 21.3,
    cart_share: 20.1,
    conversion_share: 19.8,
  },
  {
    asin: "B0B9GSWYR5",
    title: "Casper Wave Hybrid Snow",
    brand: "Casper",
    is_hero: false,
    bsr: 215,
    bsr_trend: "flat",
    rating: 4.3,
    reviews: 2156,
    price: 1495.00,
    impression_share: 12.4,
    click_share: 14.2,
    cart_share: 12.9,
    conversion_share: 11.4,
  },
];

function CompetitiveLandscape({ sku }) {
  const [addingAsin, setAddingAsin] = useState(false);
  const [asinInput, setAsinInput] = useState("");
  const [suggestions] = useState(["B07Q1SFG9X","B0CHN25RJY","B0DHJP56KJ"]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const hero = COMPETITORS.find(c => c.is_hero);
  const competitors = COMPETITORS.filter(c => !c.is_hero);
  const bsrIcon = (trend) => trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  const bsrColor = (trend) => trend === 'up' ? T.gn : trend === 'down' ? T.rd : T.t3;
  const shareBar = (val, max, color) => (
    <div style={{position:"relative",height:14,background:T.bg,borderRadius:3,overflow:"hidden",minWidth:60}}>
      <div style={{position:"absolute",top:0,left:0,height:"100%",width:`${(val/max)*100}%`,background:color+"30",borderRadius:3}}/>
      <div style={{position:"relative",fontSize:9,fontWeight:700,fontFamily:"'JetBrains Mono', monospace",color:color,padding:"0 4px",lineHeight:"14px"}}>{val.toFixed(1)}%</div>
    </div>
  );
  const maxShare = Math.max(...COMPETITORS.map(c => Math.max(c.impression_share, c.click_share, c.cart_share, c.conversion_share)));

  return (
    <div style={{background:T.cd,borderRadius:10,border:"1px solid "+T.bd,overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.bd,display:"flex",justifyContent:"space-between",alignItems:"center",background:T.bg2}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.tx,textTransform:"uppercase",letterSpacing:.4}}>Competitive Landscape</div>
          <div style={{fontSize:9,color:T.t3,marginTop:1}}>Brand Analytics metrics — hero product vs. competitor ASINs</div>
        </div>
        <button onClick={()=>setAddingAsin(!addingAsin)} style={{fontSize:9,padding:"4px 10px",borderRadius:4,border:"1px solid "+T.ac,background:T.ac+"15",color:T.ac,cursor:"pointer",fontWeight:700,fontFamily:"'Outfit', sans-serif"}}>
          + Add Competitor
        </button>
      </div>
      <div style={{padding:"12px 14px"}}>

        {/* Add ASIN input */}
        {addingAsin && (
          <div style={{background:T.bg,border:"1px solid "+T.ac+"40",borderRadius:6,padding:"10px 12px",marginBottom:10}}>
            <div style={{fontSize:9,color:T.ac,fontWeight:700,marginBottom:4}}>Add Competitor ASIN</div>
            <div style={{display:"flex",gap:6,alignItems:"center",position:"relative"}}>
              <input
                type="text" value={asinInput}
                onChange={e=>{setAsinInput(e.target.value);setShowSuggestions(e.target.value.length>=2);}}
                placeholder="Enter ASIN (e.g. B09HJLY5R4) or search..."
                style={{flex:1,background:T.cd,border:"1px solid "+T.ac+"60",borderRadius:4,color:T.tx,padding:"6px 8px",fontSize:10,fontFamily:"'JetBrains Mono', monospace",outline:"none"}}
              />
              <button style={{fontSize:9,padding:"5px 12px",borderRadius:4,border:"1px solid "+T.gn,background:T.gn+"20",color:T.gn,cursor:"pointer",fontWeight:700,fontFamily:"'Outfit', sans-serif"}}>Add</button>
              <button onClick={()=>{setAddingAsin(false);setAsinInput("");}} style={{fontSize:9,padding:"5px 8px",borderRadius:4,border:"1px solid "+T.bd,background:"transparent",color:T.t3,cursor:"pointer",fontFamily:"'Outfit', sans-serif"}}>Cancel</button>
            </div>
            {showSuggestions && (
              <div style={{marginTop:4,background:T.cd,border:"1px solid "+T.bd,borderRadius:4,padding:4}}>
                <div style={{fontSize:8,color:T.t4,padding:"2px 4px",marginBottom:2}}>Brand Analytics Suggestions</div>
                {suggestions.map((s,i)=>(
                  <div key={i} onClick={()=>{setAsinInput(s);setShowSuggestions(false);}} style={{padding:"4px 8px",fontSize:9,fontFamily:"'JetBrains Mono', monospace",color:T.ac,cursor:"pointer",borderRadius:3,":hover":{background:T.bg}}}>
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hero Product */}
        <div style={{background:T.amz+"08",border:"1px solid "+T.amz+"30",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:8,padding:"2px 6px",borderRadius:3,background:T.amz+"25",color:T.amz,fontWeight:800,textTransform:"uppercase",letterSpacing:.5}}>Hero</span>
              <span style={{fontSize:11,fontWeight:700,color:T.tx}}>{hero.title}</span>
              <span style={{fontSize:9,fontFamily:"'JetBrains Mono', monospace",color:T.t3}}>{hero.asin}</span>
            </div>
            <span style={{fontSize:14,fontWeight:800,fontFamily:"'JetBrains Mono', monospace",color:T.gn}}>{fc(hero.price)}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr) repeat(4,1fr)",gap:8}}>
            {[
              {l:"BSR",v:`#${hero.bsr}`,c:bsrColor(hero.bsr_trend),icon:bsrIcon(hero.bsr_trend)},
              {l:"Rating",v:hero.rating.toFixed(1),c:T.am},
              {l:"Reviews",v:hero.reviews.toLocaleString(),c:T.t1},
              {l:"Price",v:fc(hero.price),c:T.gn},
            ].map((m,i)=>(
              <div key={i} style={{textAlign:"center"}}>
                <div style={{fontSize:7,color:T.t4,textTransform:"uppercase",letterSpacing:.4}}>{m.l}</div>
                <div style={{fontSize:12,fontWeight:800,fontFamily:"'JetBrains Mono', monospace",color:m.c}}>{m.v} {m.icon&&<span style={{fontSize:9}}>{m.icon}</span>}</div>
              </div>
            ))}
            {[
              {l:"Imp Share",v:hero.impression_share,c:T.ac},
              {l:"Click Share",v:hero.click_share,c:T.pu},
              {l:"Cart Share",v:hero.cart_share,c:T.am},
              {l:"Conv Share",v:hero.conversion_share,c:T.gn},
            ].map((m,i)=>(
              <div key={i+4} style={{textAlign:"center"}}>
                <div style={{fontSize:7,color:T.t4,textTransform:"uppercase",letterSpacing:.4}}>{m.l}</div>
                {shareBar(m.v, maxShare, m.c)}
              </div>
            ))}
          </div>
        </div>

        {/* Competitor Rows */}
        <div style={{fontSize:9,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:.4,marginBottom:6}}>Competitors</div>
        {competitors.map((c,i) => (
          <div key={i} style={{background:T.bg,borderRadius:6,padding:"8px 12px",border:"1px solid "+T.bd,marginBottom:6}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:10,fontWeight:700,color:T.t1}}>{c.brand}</span>
                <span style={{fontSize:9,color:T.t2}}>{c.title}</span>
                <span style={{fontSize:8,fontFamily:"'JetBrains Mono', monospace",color:T.t4}}>{c.asin}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono', monospace",color:c.price<hero.price?T.rd:T.gn}}>{fc(c.price)}</span>
                <button style={{fontSize:7,padding:"2px 5px",borderRadius:3,border:"1px solid "+T.rd+"60",background:"transparent",color:T.rd,cursor:"pointer"}}>✕</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr) repeat(4,1fr)",gap:6}}>
              {[
                {l:"BSR",v:`#${c.bsr}`,c:bsrColor(c.bsr_trend),icon:bsrIcon(c.bsr_trend)},
                {l:"Rating",v:c.rating.toFixed(1),c:T.am},
                {l:"Reviews",v:c.reviews.toLocaleString(),c:T.t1},
                {l:"Price",v:fc(c.price),c:c.price<hero.price?T.rd:T.gn},
              ].map((m,j)=>(
                <div key={j} style={{textAlign:"center"}}>
                  <div style={{fontSize:7,color:T.t4,textTransform:"uppercase",letterSpacing:.4}}>{m.l}</div>
                  <div style={{fontSize:10,fontWeight:700,fontFamily:"'JetBrains Mono', monospace",color:m.c}}>{m.v} {m.icon&&<span style={{fontSize:8}}>{m.icon}</span>}</div>
                </div>
              ))}
              {[
                {l:"Imp",v:c.impression_share,c:T.ac},
                {l:"Click",v:c.click_share,c:T.pu},
                {l:"Cart",v:c.cart_share,c:T.am},
                {l:"Conv",v:c.conversion_share,c:T.gn},
              ].map((m,j)=>(
                <div key={j+4} style={{textAlign:"center"}}>
                  <div style={{fontSize:7,color:T.t4,textTransform:"uppercase",letterSpacing:.4}}>{m.l}</div>
                  {shareBar(m.v, maxShare, m.c)}
                </div>
              ))}
            </div>
            {/* Delta vs Hero row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr) repeat(4,1fr)",gap:6,marginTop:4,paddingTop:4,borderTop:"1px solid "+T.bd+"40"}}>
              <div style={{textAlign:"center",fontSize:8,color:T.t4}}>Δ {c.bsr-hero.bsr>0?"+":""}{c.bsr-hero.bsr}</div>
              <div style={{textAlign:"center",fontSize:8,color:T.t4}}>Δ {(c.rating-hero.rating)>0?"+":""}{(c.rating-hero.rating).toFixed(1)}</div>
              <div style={{textAlign:"center",fontSize:8,color:T.t4}}>Δ {(c.reviews-hero.reviews)>0?"+":(c.reviews-hero.reviews<0?"":"")}{(c.reviews-hero.reviews).toLocaleString()}</div>
              <div style={{textAlign:"center",fontSize:8,color:c.price<hero.price?T.rd:T.gn}}>Δ {fc(c.price-hero.price)}</div>
              {[
                c.impression_share-hero.impression_share,
                c.click_share-hero.click_share,
                c.cart_share-hero.cart_share,
                c.conversion_share-hero.conversion_share,
              ].map((delta,j)=>(
                <div key={j} style={{textAlign:"center",fontSize:8,fontFamily:"'JetBrains Mono', monospace",color:delta>0?T.rd:T.gn}}>
                  {delta>0?"+":""}{delta.toFixed(1)}%
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── PRODUCT REVIEWS & VOC ─────────────── */

const REVIEWS_DATA = {
  channels: [
    {
      channel: "Amazon", color: T.amz,
      total: 3847, avg_rating: 4.6, ratings_breakdown: { 5: 2462, 4: 654, 3: 346, 2: 192, 1: 193 },
      recent: [
        { date: "4/8", rating: 5, title: "Best sleep I've had in years", snippet: "Firm but comfortable. Wife loves it too. Delivered on time...", verified: true },
        { date: "4/5", rating: 4, title: "Good mattress, slow delivery", snippet: "Product is great but took 3 weeks to arrive. Wish it was faster...", verified: true },
        { date: "4/2", rating: 2, title: "Started sagging after 2 months", snippet: "Initially comfortable but developed a noticeable sag on one side...", verified: true },
        { date: "3/29", rating: 5, title: "Worth every penny", snippet: "Upgraded from a spring mattress. Night and day difference...", verified: true },
      ],
    },
    {
      channel: "Shopify", color: T.shop,
      total: 412, avg_rating: 4.7, ratings_breakdown: { 5: 280, 4: 78, 3: 29, 2: 15, 1: 10 },
      recent: [
        { date: "4/7", rating: 5, title: "Perfect for our guest room", snippet: "Ordered direct for the warranty benefits. Great experience...", verified: true },
        { date: "3/30", rating: 5, title: "Exceeded expectations", snippet: "Was skeptical of online mattress buying but this is excellent...", verified: true },
      ],
    },
    {
      channel: "Walmart", color: "#0071CE",
      total: 189, avg_rating: 4.4, ratings_breakdown: { 5: 102, 4: 41, 3: 22, 2: 14, 1: 10 },
      recent: [
        { date: "4/6", rating: 4, title: "Solid mattress for the price", snippet: "Comparable to more expensive brands. Happy with purchase...", verified: true },
        { date: "3/25", rating: 3, title: "Takes time to break in", snippet: "First week was very firm. After 2 weeks it softened up nicely...", verified: false },
      ],
    },
  ],
  voc: {
    top_positives: [
      { theme: "Comfort / Firmness", mentions: 842, sentiment: 0.92, trend: "stable" },
      { theme: "Sleep Quality", mentions: 614, sentiment: 0.89, trend: "up" },
      { theme: "Value for Money", mentions: 438, sentiment: 0.85, trend: "up" },
      { theme: "Easy Setup / Unboxing", mentions: 312, sentiment: 0.88, trend: "stable" },
    ],
    top_negatives: [
      { theme: "Delivery Speed", mentions: 186, sentiment: 0.28, trend: "down" },
      { theme: "Edge Support", mentions: 124, sentiment: 0.31, trend: "stable" },
      { theme: "Off-gassing / Smell", mentions: 98, sentiment: 0.22, trend: "up" },
      { theme: "Durability / Sagging", mentions: 67, sentiment: 0.18, trend: "down" },
    ],
  },
  feedback_queue: {
    service: [
      { id: 1, source: "Amazon", review_snippet: "Took 3 weeks to arrive...", action: "Investigate fulfillment delay", priority: "high", status: "open" },
      { id: 2, source: "Walmart", review_snippet: "Customer service didn't respond for 5 days...", action: "Review CS SLA compliance", priority: "medium", status: "open" },
    ],
    sales: [
      { id: 3, source: "VOC", theme: "Value for Money trending up", action: "Consider price test at higher point", priority: "medium", status: "pending" },
    ],
    marketing: [
      { id: 4, source: "Amazon", review_snippet: "Best sleep I've had in years", action: "Feature in ad creative / A+ content", priority: "high", status: "open" },
      { id: 5, source: "VOC", theme: "Comfort/Firmness top positive", action: "Emphasize in listing bullet points", priority: "medium", status: "done" },
    ],
    logistics: [
      { id: 6, source: "Amazon", review_snippet: "Delivery took 3 weeks", action: "Audit carrier performance to East Coast", priority: "high", status: "open" },
      { id: 7, source: "Shopify", review_snippet: "Box was damaged on arrival", action: "Review packaging specs with 3PL", priority: "medium", status: "open" },
    ],
    manufacturing: [
      { id: 8, source: "Amazon", review_snippet: "Started sagging after 2 months", action: "QC check on foam density batch #2026-Q1", priority: "high", status: "investigating" },
      { id: 9, source: "VOC", theme: "Off-gassing mentions trending up", action: "Review material cure time in production", priority: "medium", status: "pending" },
    ],
  },
};

function ReviewsAndVOC({ sku }) {
  const [activeChannel, setActiveChannel] = useState("all");
  const [activeFeedbackTab, setActiveFeedbackTab] = useState("service");
  const d = REVIEWS_DATA;
  const allReviews = d.channels.reduce((sum,ch) => sum + ch.total, 0);
  const weightedRating = d.channels.reduce((sum,ch) => sum + ch.avg_rating * ch.total, 0) / allReviews;

  const ratingBar = (count, total, stars) => {
    const pct = (count / total) * 100;
    return (
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
        <span style={{fontSize:8,color:T.t3,width:14,textAlign:"right"}}>{stars}</span>
        <div style={{flex:1,height:6,background:T.bd,borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:stars>=4?T.gn:stars===3?T.am:T.rd,borderRadius:3}}/>
        </div>
        <span style={{fontSize:8,color:T.t4,width:30,textAlign:"right",fontFamily:"'JetBrains Mono', monospace"}}>{count}</span>
      </div>
    );
  };

  const sentimentColor = (s) => s >= 0.7 ? T.gn : s >= 0.4 ? T.am : T.rd;
  const trendIcon = (t) => t === 'up' ? '↑' : t === 'down' ? '↓' : '→';
  const trendColor = (t, isNeg) => {
    if (isNeg) return t === 'up' ? T.rd : t === 'down' ? T.gn : T.t3;
    return t === 'up' ? T.gn : t === 'down' ? T.rd : T.t3;
  };
  const priorityColor = (p) => p === 'high' ? T.rd : p === 'medium' ? T.am : T.t3;
  const statusStyle = (s) => ({
    open: { bg: T.ac+"20", color: T.ac },
    pending: { bg: T.am+"20", color: T.am },
    investigating: { bg: T.pu+"20", color: T.pu },
    done: { bg: T.gn+"20", color: T.gn },
  }[s] || { bg: T.bd, color: T.t3 });

  const feedbackTabs = [
    { key: "service", label: "Service", count: d.feedback_queue.service.length },
    { key: "sales", label: "Sales", count: d.feedback_queue.sales.length },
    { key: "marketing", label: "Marketing", count: d.feedback_queue.marketing.length },
    { key: "logistics", label: "Logistics", count: d.feedback_queue.logistics.length },
    { key: "manufacturing", label: "Mfg", count: d.feedback_queue.manufacturing.length },
  ];
  const currentFeedback = d.feedback_queue[activeFeedbackTab] || [];

  return (
    <div style={{background:T.cd,borderRadius:10,border:"1px solid "+T.bd,overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.bd,display:"flex",justifyContent:"space-between",alignItems:"center",background:T.bg2}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.tx,textTransform:"uppercase",letterSpacing:.4}}>Product Reviews & Voice of Customer</div>
          <div style={{fontSize:9,color:T.t3,marginTop:1}}>Cross-channel reviews, VOC themes & department feedback routing</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:14,fontWeight:800,fontFamily:"'JetBrains Mono', monospace",color:T.am}}>{weightedRating.toFixed(1)}</span>
          <span style={{fontSize:8,color:T.t3}}>avg across {allReviews.toLocaleString()} reviews</span>
        </div>
      </div>
      <div style={{padding:"12px 14px"}}>

        {/* Channel tabs */}
        <div style={{display:"flex",gap:4,marginBottom:10}}>
          <button onClick={()=>setActiveChannel("all")} style={{padding:"3px 10px",borderRadius:4,fontSize:9,fontWeight:activeChannel==="all"?700:500,border:"1px solid "+(activeChannel==="all"?T.ac:T.bd),background:activeChannel==="all"?T.ac+"20":"transparent",color:activeChannel==="all"?T.ac:T.t3,cursor:"pointer",fontFamily:"'Outfit', sans-serif"}}>
            All ({allReviews.toLocaleString()})
          </button>
          {d.channels.map(ch => (
            <button key={ch.channel} onClick={()=>setActiveChannel(ch.channel)} style={{padding:"3px 10px",borderRadius:4,fontSize:9,fontWeight:activeChannel===ch.channel?700:500,border:"1px solid "+(activeChannel===ch.channel?ch.color:T.bd),background:activeChannel===ch.channel?ch.color+"20":"transparent",color:activeChannel===ch.channel?ch.color:T.t3,cursor:"pointer",fontFamily:"'Outfit', sans-serif"}}>
              {ch.channel} ({ch.total.toLocaleString()})
            </button>
          ))}
        </div>

        {/* Ratings breakdown per channel */}
        <div style={{display:"grid",gridTemplateColumns:`repeat(${d.channels.length}, 1fr)`,gap:8,marginBottom:14}}>
          {d.channels.filter(ch => activeChannel === "all" || activeChannel === ch.channel).map((ch,i) => (
            <div key={i} style={{background:T.bg,borderRadius:6,padding:"10px 12px",border:"1px solid "+ch.color+"30"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:9,fontWeight:700,color:ch.color}}>{ch.channel}</span>
                <span style={{fontSize:13,fontWeight:800,fontFamily:"'JetBrains Mono', monospace",color:T.am}}>{ch.avg_rating.toFixed(1)}</span>
              </div>
              {[5,4,3,2,1].map(s => ratingBar(ch.ratings_breakdown[s], ch.total, s))}
              <div style={{fontSize:8,color:T.t4,marginTop:4,textAlign:"center"}}>{ch.total.toLocaleString()} total reviews</div>
            </div>
          ))}
        </div>

        {/* Recent reviews */}
        <div style={{fontSize:9,fontWeight:700,color:T.cy,textTransform:"uppercase",letterSpacing:.5,marginBottom:6,paddingBottom:4,borderBottom:"1px solid "+T.bd}}>Recent Reviews</div>
        <div style={{display:"grid",gap:4,marginBottom:14}}>
          {d.channels.filter(ch => activeChannel === "all" || activeChannel === ch.channel).flatMap(ch =>
            ch.recent.map((r,i) => ({...r, channel: ch.channel, channelColor: ch.color}))
          ).sort((a,b) => new Date("2026/"+b.date) - new Date("2026/"+a.date)).slice(0,6).map((r,i) => (
            <div key={i} style={{display:"flex",gap:8,padding:"6px 10px",background:T.bg,borderRadius:5,border:"1px solid "+T.bd}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:36,gap:2}}>
                <span style={{fontSize:12,fontWeight:800,fontFamily:"'JetBrains Mono', monospace",color:r.rating>=4?T.gn:r.rating===3?T.am:T.rd}}>{r.rating}</span>
                <span style={{fontSize:7,color:r.channelColor,fontWeight:700}}>{r.channel}</span>
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                  <span style={{fontSize:9,fontWeight:700,color:T.t1}}>{r.title}</span>
                  {r.verified && <span style={{fontSize:7,color:T.gn,fontWeight:600}}>VERIFIED</span>}
                  <span style={{fontSize:8,color:T.t4,marginLeft:"auto"}}>{r.date}</span>
                </div>
                <div style={{fontSize:9,color:T.t2,lineHeight:1.4}}>{r.snippet}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Voice of Customer */}
        <div style={{fontSize:9,fontWeight:700,color:T.cy,textTransform:"uppercase",letterSpacing:.5,marginBottom:8,paddingBottom:4,borderBottom:"1px solid "+T.bd}}>Voice of Customer — Theme Analysis</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
          <div>
            <div style={{fontSize:8,fontWeight:700,color:T.gn,textTransform:"uppercase",marginBottom:6}}>Top Positive Themes</div>
            {d.voc.top_positives.map((th,i) => (
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:T.bg,borderRadius:4,border:"1px solid "+T.bd,marginBottom:3}}>
                <span style={{fontSize:9,color:T.t1,flex:1,fontWeight:600}}>{th.theme}</span>
                <span style={{fontSize:8,fontFamily:"'JetBrains Mono', monospace",color:T.t3}}>{th.mentions}</span>
                <div style={{width:40,height:6,background:T.bd,borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${th.sentiment*100}%`,background:sentimentColor(th.sentiment),borderRadius:3}}/>
                </div>
                <span style={{fontSize:9,color:trendColor(th.trend, false)}}>{trendIcon(th.trend)}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{fontSize:8,fontWeight:700,color:T.rd,textTransform:"uppercase",marginBottom:6}}>Top Negative Themes</div>
            {d.voc.top_negatives.map((th,i) => (
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:T.bg,borderRadius:4,border:"1px solid "+T.rd+"20",marginBottom:3}}>
                <span style={{fontSize:9,color:T.t1,flex:1,fontWeight:600}}>{th.theme}</span>
                <span style={{fontSize:8,fontFamily:"'JetBrains Mono', monospace",color:T.t3}}>{th.mentions}</span>
                <div style={{width:40,height:6,background:T.bd,borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${th.sentiment*100}%`,background:sentimentColor(th.sentiment),borderRadius:3}}/>
                </div>
                <span style={{fontSize:9,color:trendColor(th.trend, true)}}>{trendIcon(th.trend)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback routing */}
        <div style={{fontSize:9,fontWeight:700,color:T.cy,textTransform:"uppercase",letterSpacing:.5,marginBottom:8,paddingBottom:4,borderBottom:"1px solid "+T.bd}}>Feedback Routing — Department Action Items</div>
        <div style={{display:"flex",gap:3,marginBottom:8}}>
          {feedbackTabs.map(tab => (
            <button key={tab.key} onClick={()=>setActiveFeedbackTab(tab.key)} style={{
              padding:"4px 10px",borderRadius:4,fontSize:9,fontWeight:activeFeedbackTab===tab.key?700:500,
              border:"1px solid "+(activeFeedbackTab===tab.key?T.ac:T.bd),
              background:activeFeedbackTab===tab.key?T.ac+"20":"transparent",
              color:activeFeedbackTab===tab.key?T.ac:T.t3,cursor:"pointer",fontFamily:"'Outfit', sans-serif"
            }}>
              {tab.label} <span style={{fontSize:8,opacity:.7}}>({tab.count})</span>
            </button>
          ))}
        </div>
        <div style={{display:"grid",gap:4}}>
          {currentFeedback.map((item,i) => {
            const ss = statusStyle(item.status);
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:T.bg,borderRadius:5,border:"1px solid "+T.bd}}>
                <span style={{fontSize:7,padding:"2px 5px",borderRadius:3,background:priorityColor(item.priority)+"20",color:priorityColor(item.priority),fontWeight:700,textTransform:"uppercase"}}>{item.priority}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:9,color:T.t1,fontWeight:600}}>{item.action}</div>
                  <div style={{fontSize:8,color:T.t4,marginTop:1}}>
                    {item.source} · {item.review_snippet || item.theme}
                  </div>
                </div>
                <span style={{fontSize:7,padding:"2px 6px",borderRadius:3,background:ss.bg,color:ss.color,fontWeight:700,textTransform:"uppercase"}}>{item.status}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const DATE_PERIODS = [
  { key: "custom", label: "Custom" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7d" },
  { key: "14d", label: "14d" },
  { key: "30d", label: "30d" },
  { key: "60d", label: "60d" },
  { key: "90d", label: "90d" },
  { key: "mtd", label: "MTD" },
  { key: "qtd", label: "QTD" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "ALL" },
];

// Mock period-adjusted metrics (in production, fetched from GET /api/sku_velocity/metrics?sku_id=X&period=Y)
// Each period has actual + forecast variants of 9 metrics:
//   units, velocity, adSpend, revenue, acos (adSpend/revenue), impressions, clicks, cvr, margin
const PERIOD_METRICS_MOCK = {
  today:     { units: 5,    velocity: 5.0, adSpend: 114,   revenue: 6025,    acos: 1.89,  impressions: 2140,    clicks: 48,    cvr: 1.04, margin: 22.1 },
  yesterday: { units: 4,    velocity: 4.0, adSpend: 108,   revenue: 4820,    acos: 2.24,  impressions: 1980,    clicks: 42,    cvr: 0.92, margin: 21.4 },
  "7d":      { units: 30,   velocity: 4.3, adSpend: 798,   revenue: 36150,   acos: 2.21,  impressions: 14280,   clicks: 312,   cvr: 0.96, margin: 21.8 },
  "14d":     { units: 62,   velocity: 4.4, adSpend: 1596,  revenue: 74709,   acos: 2.14,  impressions: 28900,   clicks: 638,   cvr: 0.99, margin: 22.0 },
  "30d":     { units: 126,  velocity: 4.2, adSpend: 3420,  revenue: 151829,  acos: 2.25,  impressions: 61200,   clicks: 1285,  cvr: 0.98, margin: 21.6 },
  "60d":     { units: 248,  velocity: 4.1, adSpend: 6840,  revenue: 299038,  acos: 2.29,  impressions: 121400,  clicks: 2540,  cvr: 0.95, margin: 21.2 },
  "90d":     { units: 362,  velocity: 4.0, adSpend: 10260, revenue: 436406,  acos: 2.35,  impressions: 180600,  clicks: 3720,  cvr: 0.97, margin: 21.0 },
  mtd:       { units: 42,   velocity: 4.2, adSpend: 1140,  revenue: 50610,   acos: 2.25,  impressions: 20400,   clicks: 428,   cvr: 1.01, margin: 21.9 },
  qtd:       { units: 42,   velocity: 4.2, adSpend: 1140,  revenue: 50610,   acos: 2.25,  impressions: 20400,   clicks: 428,   cvr: 1.01, margin: 21.9 },
  ytd:       { units: 430,  velocity: 4.2, adSpend: 12600, revenue: 518146,  acos: 2.43,  impressions: 210800,  clicks: 4380,  cvr: 0.96, margin: 20.8 },
  all:       { units: 1840, velocity: 4.0, adSpend: 52200, revenue: 2217198, acos: 2.35,  impressions: 892000,  clicks: 18640, cvr: 0.94, margin: 20.4 },
  custom:    { units: 126,  velocity: 4.2, adSpend: 3420,  revenue: 151829,  acos: 2.25,  impressions: 61200,   clicks: 1285,  cvr: 0.98, margin: 21.6 },
};

// Forecasted metrics (in production, from GET /api/sku_velocity/forecast?sku_id=X&period=Y)
// Forecast is generated by compute_velocity_metrics cron using trailing trends + seasonality + promo calendar
const FORECAST_METRICS_MOCK = {
  today:     { units: 5,    velocity: 4.8, adSpend: 118,   revenue: 5784,    acos: 2.04,  impressions: 2080,    clicks: 46,    cvr: 0.98, margin: 21.4 },
  yesterday: { units: 4,    velocity: 4.2, adSpend: 112,   revenue: 5064,    acos: 2.21,  impressions: 2020,    clicks: 44,    cvr: 0.95, margin: 21.2 },
  "7d":      { units: 32,   velocity: 4.6, adSpend: 826,   revenue: 38566,   acos: 2.14,  impressions: 14800,   clicks: 328,   cvr: 1.00, margin: 22.2 },
  "14d":     { units: 66,   velocity: 4.7, adSpend: 1652,  revenue: 79530,   acos: 2.08,  impressions: 30200,   clicks: 672,   cvr: 1.02, margin: 22.5 },
  "30d":     { units: 138,  velocity: 4.6, adSpend: 3540,  revenue: 166289,  acos: 2.13,  impressions: 64800,   clicks: 1380,  cvr: 1.02, margin: 22.4 },
  "60d":     { units: 280,  velocity: 4.7, adSpend: 7200,  revenue: 337396,  acos: 2.13,  impressions: 132000,  clicks: 2860,  cvr: 1.04, margin: 22.8 },
  "90d":     { units: 414,  velocity: 4.6, adSpend: 10800, revenue: 498942,  acos: 2.16,  impressions: 196200,  clicks: 4200,  cvr: 1.01, margin: 22.2 },
  mtd:       { units: 46,   velocity: 4.6, adSpend: 1180,  revenue: 55430,   acos: 2.13,  impressions: 21600,   clicks: 460,   cvr: 1.02, margin: 22.3 },
  qtd:       { units: 46,   velocity: 4.6, adSpend: 1180,  revenue: 55430,   acos: 2.13,  impressions: 21600,   clicks: 460,   cvr: 1.02, margin: 22.3 },
  ytd:       { units: 480,  velocity: 4.5, adSpend: 13200, revenue: 578400,  acos: 2.28,  impressions: 224000,  clicks: 4800,  cvr: 0.99, margin: 21.5 },
  all:       { units: 2040, velocity: 4.3, adSpend: 56400, revenue: 2458200, acos: 2.29,  impressions: 948000,  clicks: 20400, cvr: 0.97, margin: 21.0 },
  custom:    { units: 138,  velocity: 4.6, adSpend: 3540,  revenue: 166289,  acos: 2.13,  impressions: 64800,   clicks: 1380,  cvr: 1.02, margin: 22.4 },
};

export default function SkuVelocityDetail() {
  const { skuId } = useParams();
  const [testPrice, setTestPrice] = useState(null);
  const [recs, setRecs] = useState(PRICE_TEST_RECS);
  const [rejectingTestId, setRejectingTestId] = useState(null);
  const [testReasonText, setTestReasonText] = useState("");
  const [datePeriod, setDatePeriod] = useState("30d");
  const [showCustomCal, setShowCustomCal] = useState(false);
  const [customStart, setCustomStart] = useState("2026-03-11");
  const [customEnd, setCustomEnd] = useState("2026-04-10");

  // Pull live data from Xano (with mock fallback baked into the shared hooks).
  const { data: skuApi } = useSkuDetail(skuId);
  const { data: metricsApi } = useSkuMetrics(skuId, datePeriod, customStart, customEnd);

  // SKU overlay: prefer API fields, fall back to mock for anything not yet
  // returned by the live endpoint (e.g. the rich `components` array).
  const SKU = useMemo(() => {
    if (!skuApi) return SKU_MOCK;
    return {
      ...SKU_MOCK,
      ...skuApi,
      // Component list is a richer object than what /detail returns today —
      // keep the mock unless the API actually delivered an array.
      components: Array.isArray(skuApi.components) && skuApi.components.length
        ? skuApi.components
        : SKU_MOCK.components,
    };
  }, [skuApi]);

  // useCategoryFees called *after* SKU is materialized so we pass live category/channel.
  const { fees: feesApi } = useCategoryFees(SKU.category || "default", SKU.channel || "amazon");

  // Map API metrics (snake_case) into the camelCase shape the existing layout expects.
  const mapApiMetrics = (m) => m && {
    units: m.units ?? 0,
    velocity: m.velocity ?? 0,
    adSpend: m.ad_spend ?? m.adSpend ?? 0,
    revenue: m.revenue ?? 0,
    acos: m.acos ?? 0,
    impressions: m.impressions ?? 0,
    clicks: m.clicks ?? 0,
    cvr: m.cvr ?? 0,
    margin: m.margin ?? m.margin_pct ?? 0,
  };
  const apiActual = mapApiMetrics(metricsApi?.actual);
  const apiForecast = mapApiMetrics(metricsApi?.forecast);
  const pm = apiActual || PERIOD_METRICS_MOCK[datePeriod];
  const pfm = apiForecast || FORECAST_METRICS_MOCK[datePeriod];

  const landedTotal = SKU.components.reduce((s, c) => s + c.cost * c.qty, 0);
  const shipping = 168.26;
  const serviceFee = feesApi?.service_fee_pct ?? 0.06;
  const nextP = nextPromo();
  const periodLabel = datePeriod === "custom" ? `${customStart} — ${customEnd}` : DATE_PERIODS.find(p=>p.key===datePeriod)?.label || datePeriod;
  
  const handleApprove = (id) => {
    setRecs(recs.map(r => r.id === id ? {...r, status:'approved'} : r));
    // In production: POST /api/price_test_feedback { rec_id, decision: 'approve', context }
  };
  const handleStartReject = (id) => {
    setRejectingTestId(id);
    setTestReasonText("");
  };
  const handleSubmitReject = () => {
    const reason = testReasonText.trim();
    setRecs(recs.map(r => r.id === rejectingTestId ? {...r, status:'rejected', reason} : r));
    setRejectingTestId(null);
    setTestReasonText("");
    // In production: POST /api/price_test_feedback { rec_id, decision: 'reject', reason, context }
  };
  const handleCancelReject = () => {
    setRejectingTestId(null);
    setTestReasonText("");
  };
  
  return (
    <div style={{background:T.bg,minHeight:"100vh",fontFamily:"'Outfit', 'Inter', system-ui, sans-serif",color:T.tx,padding:"20px 24px"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; } button:disabled { opacity: 0.5; }`}</style>
      
      <div style={{display:"flex",alignItems:"center",gap:6,fontSize:10,color:T.t3,marginBottom:8,fontFamily:"'Outfit', sans-serif"}}>
        <span style={{cursor:"pointer"}}>SKU Velocity</span>
        <span>›</span>
        <span style={{cursor:"pointer"}}>Marketplace SKU</span>
        <span>›</span>
        <span style={{color:T.tx}}>{SKU.name}</span>
      </div>
      
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <h1 style={{fontSize:22,fontWeight:800,letterSpacing:-.4,color:T.tx}}>{SKU.name}</h1>
            <span style={{fontSize:9,padding:"3px 8px",borderRadius:3,background:T.amz+"20",color:T.amz,fontWeight:700}}>AMAZON</span>
            <span style={{fontSize:9,padding:"3px 8px",borderRadius:3,background:T.pu+"20",color:T.pu,fontWeight:700}}>BUNDLE</span>
            <span style={{fontSize:9,padding:"3px 8px",borderRadius:3,background:T.bd,color:T.t2,fontWeight:700}}>{SKU.lifecycle.toUpperCase()}</span>
          </div>
          <div style={{display:"flex",gap:12,fontSize:10,color:T.t3,fontFamily:"'JetBrains Mono', monospace"}}>
            <span>SKU: {SKU.marketplace_sku}</span>
            <span>ASIN: {SKU.asin}</span>
            <span>{SKU.components.length} components</span>
          </div>
        </div>
      </div>

      {/* Date range selector */}
      <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:12,flexWrap:"wrap"}}>
        {DATE_PERIODS.map(p => (
          <button key={p.key} onClick={()=>{setDatePeriod(p.key);if(p.key==='custom')setShowCustomCal(true);else setShowCustomCal(false);}}
            style={{
              padding:"4px 10px",borderRadius:4,fontSize:9,fontWeight:datePeriod===p.key?700:500,
              fontFamily:"'Outfit', sans-serif",cursor:"pointer",border:"1px solid "+(datePeriod===p.key?T.ac:T.bd),
              background:datePeriod===p.key?T.ac+"20":"transparent",color:datePeriod===p.key?T.ac:T.t3,
              transition:"all 0.15s ease"
            }}>
            {p.label}
          </button>
        ))}
        {datePeriod !== "custom" && <span style={{fontSize:8,color:T.t4,marginLeft:8,fontFamily:"'JetBrains Mono', monospace"}}>Showing: {periodLabel}</span>}
      </div>
      {showCustomCal && (
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,padding:"8px 12px",background:T.cd,borderRadius:6,border:"1px solid "+T.ac+"40"}}>
          <span style={{fontSize:9,color:T.ac,fontWeight:600}}>From:</span>
          <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)} style={{background:T.bg,border:"1px solid "+T.bd,borderRadius:4,color:T.tx,padding:"3px 6px",fontSize:9,fontFamily:"'JetBrains Mono', monospace",outline:"none"}}/>
          <span style={{fontSize:9,color:T.ac,fontWeight:600}}>To:</span>
          <input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} style={{background:T.bg,border:"1px solid "+T.bd,borderRadius:4,color:T.tx,padding:"3px 6px",fontSize:9,fontFamily:"'JetBrains Mono', monospace",outline:"none"}}/>
          <button onClick={()=>setShowCustomCal(false)} style={{fontSize:9,padding:"3px 10px",borderRadius:4,border:"1px solid "+T.gn,background:T.gn+"20",color:T.gn,cursor:"pointer",fontWeight:700,fontFamily:"'Outfit', sans-serif"}}>Apply</button>
          <span style={{fontSize:8,color:T.t4,fontFamily:"'JetBrains Mono', monospace"}}>{customStart} — {customEnd}</span>
        </div>
      )}

      {/* Metrics — Actual vs Forecast consolidated */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(9, 1fr)",gap:6,marginBottom:14}}>
        {[
          {l:"Units",       av:pm.units.toLocaleString(), fv:pfm.units.toLocaleString(), c:T.t1, delta:((pm.units-pfm.units)/pfm.units*100)},
          {l:"Velocity/day",av:pm.velocity.toFixed(1),    fv:pfm.velocity.toFixed(1),    c:T.cy, delta:((pm.velocity-pfm.velocity)/pfm.velocity*100)},
          {l:"Ad Spend",    av:fm(pm.adSpend),            fv:fm(pfm.adSpend),            c:T.amz,delta:((pm.adSpend-pfm.adSpend)/pfm.adSpend*100), invertDelta:true},
          {l:"Revenue",     av:fm(pm.revenue),            fv:fm(pfm.revenue),            c:T.gn, delta:((pm.revenue-pfm.revenue)/pfm.revenue*100)},
          {l:"ACOS",        av:pt(pm.acos),               fv:pt(pfm.acos),               c:pm.acos<2.5?T.gn:T.am, delta:((pm.acos-pfm.acos)/pfm.acos*100), invertDelta:true},
          {l:"Impressions", av:pm.impressions>=1000?(pm.impressions/1000).toFixed(1)+"K":pm.impressions, fv:pfm.impressions>=1000?(pfm.impressions/1000).toFixed(1)+"K":pfm.impressions, c:T.t1, delta:((pm.impressions-pfm.impressions)/pfm.impressions*100)},
          {l:"Clicks",      av:pm.clicks>=1000?(pm.clicks/1000).toFixed(1)+"K":pm.clicks.toLocaleString(), fv:pfm.clicks>=1000?(pfm.clicks/1000).toFixed(1)+"K":pfm.clicks.toLocaleString(), c:T.ac, delta:((pm.clicks-pfm.clicks)/pfm.clicks*100)},
          {l:"CVR",         av:pt(pm.cvr),                fv:pt(pfm.cvr),                c:pm.cvr>1?T.gn:T.am, delta:((pm.cvr-pfm.cvr)/pfm.cvr*100)},
          {l:"Margin",      av:pt(pm.margin),             fv:pt(pfm.margin),             c:pm.margin>20?T.gn:pm.margin>10?T.am:T.rd, delta:((pm.margin-pfm.margin)/pfm.margin*100)},
        ].map((m,i)=>{
          // Positive delta = actual beating forecast (green for most metrics)
          // invertDelta: for ACOS/Ad Spend, actual > forecast is BAD (red)
          const deltaColor = m.invertDelta
            ? (m.delta>0?T.rd:m.delta<0?T.gn:T.t4)
            : (m.delta>0?T.gn:m.delta<0?T.rd:T.t4);
          const caret = m.delta > 0 ? "\u25B2" : m.delta < 0 ? "\u25BC" : "";
          const absDelta = Math.abs(m.delta).toFixed(1);
          return (
            <div key={i} style={{background:T.cd,borderRadius:8,padding:"8px 9px",border:"1px solid "+T.bd}}>
              <div style={{fontSize:7,color:T.t3,textTransform:"uppercase",letterSpacing:.4,marginBottom:4}}>{m.l}</div>
              <div style={{display:"flex",alignItems:"baseline",gap:5}}>
                <span style={{fontSize:16,fontWeight:800,fontFamily:"'JetBrains Mono', monospace",color:m.c,lineHeight:1}}>{m.av}</span>
                {m.delta !== 0 && (
                  <span style={{fontSize:11,fontWeight:800,fontFamily:"'JetBrains Mono', monospace",color:deltaColor,whiteSpace:"nowrap"}}>
                    {caret} {absDelta}%
                  </span>
                )}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:4,marginTop:5,paddingTop:5,borderTop:"1px solid "+T.bd+"60"}}>
                <span style={{fontSize:7,color:T.pu,fontWeight:600,textTransform:"uppercase",letterSpacing:.3}}>Fcst</span>
                <span style={{fontSize:10,fontWeight:700,fontFamily:"'JetBrains Mono', monospace",color:T.t2}}>{m.fv}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* 2/3 chart + 1/3 recommendations */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
        <VelocityChart sku={SKU}/>
        <Recommendations/>
      </div>
      
      {/* Components */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:700,color:T.t2,textTransform:"uppercase",letterSpacing:.4,marginBottom:8}}>Components — showing this SKU's share of each component's velocity</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {SKU.components.map((c,i)=><ComponentInventory key={i} comp={c}/>)}
        </div>
      </div>
      
      {/* Margin calc + Price history (with embedded test recs) */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <MarginCalc 
          landed={landedTotal} shipping={shipping} serviceFee={serviceFee} 
          adSpend={SKU.ad_spend_30d} units30d={SKU.units_30d}
          testPrice={testPrice} setTestPrice={setTestPrice}
          buybox={SKU.buybox_price} category={SKU.category}
          refPrice={SKU.reference_price_30d} nextP={nextP}
        />
        <PriceHistoryAndTests
          recs={recs}
          rejectingId={rejectingTestId}
          reasonText={testReasonText}
          setReasonText={setTestReasonText}
          onApprove={handleApprove}
          onStartReject={handleStartReject}
          onSubmitReject={handleSubmitReject}
          onCancelReject={handleCancelReject}
        />
      </div>

      {/* Pricing Management */}
      <div style={{marginTop:14}}>
        <PricingManagement sku={SKU}/>
      </div>

      {/* Competitive Landscape */}
      <div style={{marginTop:14}}>
        <CompetitiveLandscape sku={SKU}/>
      </div>

      {/* Product Reviews & VOC */}
      <div style={{marginTop:14}}>
        <ReviewsAndVOC sku={SKU}/>
      </div>
    </div>
  );
}
