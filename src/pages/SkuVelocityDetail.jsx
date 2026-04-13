import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSkuDetail, useCreatePriceTest, useCategoryFees } from "../api/hooks";
import { T, fm, fc, pt } from "../components/shared/Theme";

// Simplified detail page with essential sections
export default function SkuVelocityDetail() {
  const { skuId } = useParams();
  const navigate = useNavigate();
  const { data: sku, loading } = useSkuDetail(skuId);
  const createPriceTest = useCreatePriceTest();
  const { fees } = useCategoryFees(
    "Furniture", // TODO: derive from sku.category when available
    "Amazon"
  );
  const [testPrice, setTestPrice] = useState(null);
  const [testStatus, setTestStatus] = useState(null); // null | "submitting" | "success" | "error"
  const [testError, setTestError] = useState(null);
  const [datePeriod, setDatePeriod] = useState("30d");

  // Compute net margin multiplier from real fee data instead of hardcoded 0.7
  const getReferralRate = (price) => {
    if (!fees) return 0.15; // safe default
    if (price <= (fees.referral_tier1_cap || 200)) return fees.referral_tier1_rate || 0.15;
    return fees.referral_tier2_rate || 0.10;
  };
  const getNetMultiplier = (price) => {
    const referralRate = getReferralRate(price);
    const serviceFee = fees?.service_fee_pct || 0.06;
    return 1 - referralRate - serviceFee; // e.g., 1 - 0.15 - 0.06 = 0.79
  };

  // Price test validation + confirmation
  const handleSubmitPriceTest = async () => {
    if (!testPrice || !Number.isFinite(testPrice) || testPrice <= 0 || testPrice > 100000) {
      setTestError("Enter a valid price between $0.01 and $100,000");
      return;
    }
    const delta = sku.buyboxPrice > 0
      ? ((testPrice - sku.buyboxPrice) / sku.buyboxPrice * 100).toFixed(2)
      : "0.00";
    const confirmed = window.confirm(
      `Create price test?\n\nSKU: ${sku.name}\nCurrent: ${fc(sku.buyboxPrice)}\nTest: ${fc(testPrice)} (${delta > 0 ? "+" : ""}${delta}%)\n\nThis will create a test record for review.`
    );
    if (!confirmed) return;

    setTestStatus("submitting");
    setTestError(null);
    const result = await createPriceTest(
      skuId, "manual", [testPrice], "", "", false, null
    );
    if (result.status === "error") {
      setTestStatus("error");
      setTestError(result.message);
    } else {
      setTestStatus("success");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", color: T.tx, fontFamily: "'Outfit', sans-serif" }}>
        Loading SKU details...
      </div>
    );
  }

  if (!sku) {
    return (
      <div style={{ padding: "20px", color: T.tx, fontFamily: "'Outfit', sans-serif" }}>
        SKU not found
      </div>
    );
  }

  // Mock metrics
  const pm = {
    units: 126,
    velocity: 4.2,
    adSpend: 3420,
    revenue: 151800,
    acos: 2.26,
    impressions: 12840,
    clicks: 320,
    cvr: 0.98,
    margin: 32.5,
  };

  const pfm = {
    units: 128,
    velocity: 4.1,
    adSpend: 3200,
    revenue: 152000,
    acos: 2.1,
    impressions: 13000,
    clicks: 325,
    cvr: 0.97,
    margin: 32.0,
  };

  return (
    <div
      style={{
        background: T.bg,
        minHeight: "100vh",
        fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
        color: T.tx,
      }}
    >
      {/* Breadcrumb */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 10,
          color: T.t3,
          marginBottom: 16,
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        <span style={{ cursor: "pointer" }} onClick={() => navigate("/sku-velocity")}>
          SKU Velocity
        </span>
        <span>›</span>
        <span style={{ color: T.tx }}>{sku.name}</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: -0.4,
              color: T.tx,
              margin: 0,
            }}
          >
            {sku.name}
          </h1>
          <span
            style={{
              fontSize: 9,
              padding: "3px 8px",
              borderRadius: 3,
              background: T.amz + "20",
              color: T.amz,
              fontWeight: 700,
            }}
          >
            {sku.channel.toUpperCase()}
          </span>
          <span
            style={{
              fontSize: 9,
              padding: "3px 8px",
              borderRadius: 3,
              background: T.gn + "20",
              color: T.gn,
              fontWeight: 700,
            }}
          >
            {sku.lifecycle.toUpperCase()}
          </span>
          <span
            style={{
              fontSize: 9,
              padding: "3px 8px",
              borderRadius: 3,
              background:
                sku.status === "Active"
                  ? T.gn + "20"
                  : sku.status === "Stockout Risk"
                    ? T.am + "20"
                    : T.rd + "20",
              color:
                sku.status === "Active"
                  ? T.gn
                  : sku.status === "Stockout Risk"
                    ? T.am
                    : T.rd,
              fontWeight: 700,
            }}
          >
            {sku.status.toUpperCase()}
          </span>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 10, color: T.t3, fontFamily: "'JetBrains Mono', monospace" }}>
          <span>ASIN: {sku.asinId}</span>
          <span>Price: {fc(sku.buyboxPrice)}</span>
          <span>Velocity: {sku.velocity30d.toFixed(1)}x</span>
        </div>
      </div>

      {/* Date Period Selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        {["7d", "30d", "90d"].map((period) => (
          <button
            key={period}
            onClick={() => setDatePeriod(period)}
            style={{
              padding: "4px 10px",
              borderRadius: 4,
              fontSize: 9,
              fontWeight: datePeriod === period ? 700 : 500,
              fontFamily: "'Outfit', sans-serif",
              cursor: "pointer",
              border: `1px solid ${datePeriod === period ? T.ac : T.bd}`,
              background: datePeriod === period ? T.ac + "20" : "transparent",
              color: datePeriod === period ? T.ac : T.t3,
              transition: "all 0.15s ease",
            }}
          >
            {period.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Metrics Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 8,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Units", actual: pm.units.toLocaleString(), forecast: pfm.units.toLocaleString(), color: T.t1 },
          { label: "Velocity/day", actual: pm.velocity.toFixed(1), forecast: pfm.velocity.toFixed(1), color: T.cy },
          { label: "Ad Spend", actual: fm(pm.adSpend), forecast: fm(pfm.adSpend), color: T.amz },
          { label: "Revenue", actual: fm(pm.revenue), forecast: fm(pfm.revenue), color: T.gn },
          { label: "ACOS", actual: pt(pm.acos), forecast: pt(pfm.acos), color: T.am },
          { label: "CVR", actual: pt(pm.cvr), forecast: pt(pfm.cvr), color: T.ac },
          { label: "Margin %", actual: pt(pm.margin), forecast: pt(pfm.margin), color: T.gn },
          { label: "Impressions", actual: (pm.impressions / 1000).toFixed(1) + "K", forecast: (pfm.impressions / 1000).toFixed(1) + "K", color: T.t1 },
        ].map((m, i) => (
          <div
            key={i}
            style={{
              background: T.cd,
              borderRadius: 8,
              padding: "10px 12px",
              border: `1px solid ${T.bd}`,
            }}
          >
            <div style={{ fontSize: 7, color: T.t3, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
              {m.label}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                fontFamily: "'JetBrains Mono', monospace",
                color: m.color,
              }}
            >
              {m.actual}
            </div>
            <div style={{ fontSize: 8, color: T.t3, marginTop: 4, paddingTop: 6, borderTop: `1px solid ${T.bd}60` }}>
              Fcst: <span style={{ color: T.t2, fontWeight: 700 }}>{m.forecast}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Key Performance Section */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        {/* Left: Inventory & Components */}
        <div style={{ background: T.cd, borderRadius: 10, border: `1px solid ${T.bd}`, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.tx, marginBottom: 12 }}>
            Performance Summary
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.bd}`, paddingBottom: 8 }}>
              <span style={{ fontSize: 10, color: T.t3 }}>30d Units:</span>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: T.t1 }}>
                {sku.units30d}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.bd}`, paddingBottom: 8 }}>
              <span style={{ fontSize: 10, color: T.t3 }}>Days of Cover:</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: sku.daysOfCover < 30 ? T.rd : T.gn,
                }}
              >
                {sku.daysOfCover}d
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.bd}`, paddingBottom: 8 }}>
              <span style={{ fontSize: 10, color: T.t3 }}>Margin:</span>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: T.gn }}>
                {sku.margin.toFixed(1)}%
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: T.t3 }}>Contribution:</span>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: T.ac }}>
                ${sku.contribution.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Pricing */}
        <div style={{ background: T.cd, borderRadius: 10, border: `1px solid ${T.bd}`, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.tx, marginBottom: 12 }}>
            Price Test (What-If)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <div style={{ fontSize: 8, color: T.t3, marginBottom: 4 }}>Current Buybox</div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: T.t1 }}>
                {fc(sku.buyboxPrice)}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 8, color: T.am, display: "block", marginBottom: 4, fontWeight: 600 }}>
                Test Price
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 12, color: T.t3 }}>$</span>
                <input
                  type="number"
                  value={testPrice || ""}
                  onChange={(e) => setTestPrice(e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="—"
                  style={{
                    background: T.bg,
                    border: `1px solid ${testPrice ? T.am : T.bd}`,
                    borderRadius: 4,
                    color: testPrice ? T.am : T.tx,
                    padding: "6px 8px",
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    flex: 1,
                    outline: "none",
                  }}
                />
              </div>
            </div>
            {testPrice && (
              <div style={{ fontSize: 9, color: T.t3, padding: "8px", background: T.bg, borderRadius: 4 }}>
                <div>
                  Delta: <span style={{ color: testPrice > sku.buyboxPrice ? T.gn : T.rd, fontWeight: 700 }}>
                    {testPrice > sku.buyboxPrice ? "+" : ""}{sku.buyboxPrice > 0 ? ((testPrice - sku.buyboxPrice) / sku.buyboxPrice * 100).toFixed(2) : "0.00"}%
                  </span>
                </div>
                <div style={{ marginTop: 4 }}>
                  Est. Net Revenue: <span style={{ color: T.ac, fontWeight: 700 }}>
                    {fc(testPrice * getNetMultiplier(testPrice))}
                  </span>
                  <span style={{ color: T.t3, marginLeft: 4 }}>
                    ({(getNetMultiplier(testPrice) * 100).toFixed(1)}% after fees)
                  </span>
                </div>
              </div>
            )}
            {testError && (
              <div style={{ fontSize: 9, color: T.rd, padding: "6px 8px", background: T.rd + "15", borderRadius: 4 }}>
                {testError}
              </div>
            )}
            {testStatus === "success" && (
              <div style={{ fontSize: 9, color: T.gn, padding: "6px 8px", background: T.gn + "15", borderRadius: 4 }}>
                Price test created successfully (pending approval).
              </div>
            )}
            <button
              onClick={handleSubmitPriceTest}
              disabled={!testPrice || testStatus === "submitting"}
              style={{
                marginTop: 4,
                padding: "6px 12px",
                borderRadius: 4,
                fontSize: 9,
                fontWeight: 700,
                fontFamily: "'Outfit', sans-serif",
                cursor: testPrice ? "pointer" : "not-allowed",
                border: `1px solid ${testPrice ? T.am : T.bd}`,
                background: testPrice ? T.am + "20" : "transparent",
                color: testPrice ? T.am : T.t3,
                opacity: testStatus === "submitting" ? 0.5 : 1,
                transition: "all 0.15s ease",
              }}
            >
              {testStatus === "submitting" ? "Submitting..." : "Submit Price Test"}
            </button>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {sku.daysOfCover < 30 && (
        <div
          style={{
            background: T.rd + "15",
            border: `1px solid ${T.rd}40`,
            borderRadius: 8,
            padding: "12px 14px",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚠</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.rd }}>LOW INVENTORY ALERT</div>
              <div style={{ fontSize: 9, color: T.t1, marginTop: 4 }}>
                Only {sku.daysOfCover} days of inventory remaining. Consider expediting reorder or reducing ad spend.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back Button */}
      <div style={{ marginTop: 20 }}>
        <button
          onClick={() => navigate("/sku-velocity")}
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 600,
            fontFamily: "'Outfit', sans-serif",
            cursor: "pointer",
            border: `1px solid ${T.bd}`,
            background: T.bg,
            color: T.t2,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = T.bd;
            e.currentTarget.style.color = T.tx;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = T.bg;
            e.currentTarget.style.color = T.t2;
          }}
        >
          ← Back to Overview
        </button>
      </div>
    </div>
  );
}
