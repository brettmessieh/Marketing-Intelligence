import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useComponentDetail } from "../api/hooks";
import { T, fc, pt } from "../components/shared/Theme";

export default function ComponentSkuDetail() {
  const { componentId } = useParams();
  const navigate = useNavigate();
  const { data: component, loading } = useComponentDetail(componentId);
  const [expandedWeek, setExpandedWeek] = useState(null);

  // Mock weekly data
  const weeklyData = [
    { week: 14, date: "2026-04-13", inv: 340, impact: null, dc: "JAX" },
    { week: 15, date: "2026-04-20", inv: 311, impact: null, dc: "JAX" },
    { week: 16, date: "2026-04-27", inv: 281, impact: null, dc: "JAX" },
    { week: 17, date: "2026-05-04", inv: 252, impact: null, dc: "JAX" },
    { week: 18, date: "2026-05-11", inv: 223, impact: null, dc: "JAX" },
    { week: 19, date: "2026-05-18", inv: 194, impact: null, dc: "JAX" },
    { week: 20, date: "2026-05-25", inv: 165, impact: null, dc: "JAX" },
    { week: 21, date: "2026-06-01", inv: 136, impact: null, dc: "JAX" },
    { week: 22, date: "2026-06-08", inv: 107, impact: null, dc: "JAX" },
    { week: 23, date: "2026-06-15", inv: 78, impact: null, dc: "JAX" },
    { week: 24, date: "2026-06-22", inv: 49, impact: null, dc: "JAX" },
    { week: 25, date: "2026-06-29", inv: 20, impact: null, dc: "JAX" },
    { week: 26, date: "2026-07-06", inv: 0, impact: "Stockout", dc: "JAX" },
    { week: 27, date: "2026-07-13", inv: 0, impact: null, dc: "JAX" },
    { week: 28, date: "2026-07-20", inv: 0, impact: null, dc: "JAX" },
    { week: 29, date: "2026-07-27", inv: 0, impact: null, dc: "JAX" },
    { week: 30, date: "2026-08-03", inv: 0, impact: null, dc: "JAX" },
    { week: 31, date: "2026-08-10", inv: 0, impact: null, dc: "JAX" },
    { week: 32, date: "2026-08-17", inv: 300, impact: "Arrival", dc: "JAX" },
    { week: 33, date: "2026-08-24", inv: 271, impact: null, dc: "JAX" },
    { week: 34, date: "2026-08-31", inv: 242, impact: null, dc: "JAX" },
    { week: 35, date: "2026-09-07", inv: 213, impact: null, dc: "JAX" },
  ];

  // Mock marketplace SKUs that use this component
  const dependentSkus = [
    {
      sku: "BUNDLE-QN-STD",
      name: "Queen Essential Bundle (Base + Mattress)",
      channel: "Amazon",
      share_of_velocity: 42.5,
      units_30d: 47,
      buybox_price: 1299.99,
      status: "Active",
    },
    {
      sku: "BASE-AB-E-Q-AMZN",
      name: "Essential Queen Adjustable Base - Amazon",
      channel: "Amazon",
      share_of_velocity: 28.3,
      units_30d: 31,
      buybox_price: 699.99,
      status: "Active",
    },
    {
      sku: "BUNDLE-QN-STD-WM",
      name: "Queen Essential Bundle - Walmart",
      channel: "Walmart",
      share_of_velocity: 15.7,
      units_30d: 17,
      buybox_price: 1199.99,
      status: "Active",
    },
    {
      sku: "BASE-AB-E-Q-WEB",
      name: "Essential Queen Adjustable Base - Web Direct",
      channel: "Web Direct",
      share_of_velocity: 9.2,
      units_30d: 10,
      buybox_price: 649.99,
      status: "Active",
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: "20px", color: T.tx, fontFamily: "'Outfit', sans-serif" }}>
        Loading component details...
      </div>
    );
  }

  const comp = component || {
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

  const getChannelColor = (channel) => {
    switch (channel) {
      case "Amazon":
        return T.amz;
      case "Shopify":
        return T.shop;
      case "Walmart":
        return "#1e90ff";
      case "Web Direct":
        return T.cy;
      default:
        return T.t2;
    }
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
        <span style={{ cursor: "pointer" }} onClick={() => navigate("/products")}>
          SKU Velocity
        </span>
        <span>›</span>
        <span style={{ cursor: "pointer" }} onClick={() => navigate("/components")}>
          Components
        </span>
        <span>›</span>
        <span style={{ color: T.tx }}>{comp.name}</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
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
            {comp.name}
          </h1>
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
            {comp.lifecycle.toUpperCase()}
          </span>
          <span
            style={{
              fontSize: 9,
              padding: "3px 8px",
              borderRadius: 3,
              background: T.ac + "20",
              color: T.ac,
              fontWeight: 700,
            }}
          >
            {comp.balanced ? "BALANCED" : "IMBALANCED"}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 10,
            color: T.t3,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <span>SKU: {comp.gen_sku}</span>
          <span>Vendor: {comp.vendor}</span>
          <span>Lead Time: {comp.lead_time_weeks}w</span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          { label: "On Hand", value: comp.on_hand.toLocaleString(), color: T.t1 },
          { label: "Avg Weekly Sales", value: comp.avg_weekly_sales.toFixed(1), color: T.cy },
          { label: "Days of Cover", value: comp.days_of_cover.toFixed(0) + "d", color: comp.days_of_cover < 30 ? T.rd : T.gn },
          { label: "Landed Cost", value: fc(comp.landed_cost), color: T.am },
          { label: "Primary DC", value: comp.primary_dc, color: T.t1 },
          { label: "Marketplace SKUs", value: comp.marketplace_skus_count, color: T.ac },
          { label: "Active Price Tests", value: comp.active_price_tests, color: T.pu },
          { label: "Share of Velocity", value: pt(comp.share_of_velocity), color: T.gn },
        ].map((m, i) => (
          <div
            key={i}
            style={{
              background: T.cd,
              borderRadius: 8,
              padding: "12px 14px",
              border: `1px solid ${T.bd}`,
            }}
          >
            <div style={{ fontSize: 8, color: T.t3, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
              {m.label}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                fontFamily: "'JetBrains Mono', monospace",
                color: m.color,
              }}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Inventory Projection */}
      <div style={{ background: T.cd, borderRadius: 10, border: `1px solid ${T.bd}`, padding: "14px 16px", marginBottom: 20 }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, color: T.tx, margin: "0 0 12px 0", textTransform: "uppercase" }}>
          Weekly Inventory Projection
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
            gap: 6,
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {weeklyData.map((w, i) => (
            <div
              key={i}
              onClick={() => setExpandedWeek(expandedWeek === i ? null : i)}
              style={{
                background: T.bg,
                borderRadius: 6,
                padding: "8px",
                border: `1px solid ${w.inv === 0 ? T.rd + "40" : T.bd}`,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = T.bd;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = T.bg;
              }}
            >
              <div style={{ fontSize: 7, color: T.t3, textTransform: "uppercase", fontWeight: 600, marginBottom: 3 }}>
                W{w.week}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: w.inv === 0 ? T.rd : w.inv < 100 ? T.am : T.gn,
                }}
              >
                {w.inv}
              </div>
              {w.impact && (
                <div
                  style={{
                    fontSize: 7,
                    color: w.impact === "Stockout" ? T.rd : T.gn,
                    marginTop: 4,
                    fontWeight: 700,
                  }}
                >
                  {w.impact}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dependent Marketplace SKUs */}
      <div style={{ background: T.cd, borderRadius: 10, border: `1px solid ${T.bd}`, padding: "14px 16px", marginBottom: 20 }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, color: T.tx, margin: "0 0 12px 0", textTransform: "uppercase" }}>
          Marketplace SKUs Using This Component
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "9px",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            <thead>
              <tr style={{ background: T.bg, borderBottom: `1px solid ${T.bd}` }}>
                <th style={{ padding: "8px 10px", textAlign: "left", color: T.t2, fontWeight: 600, textTransform: "uppercase" }}>
                  SKU
                </th>
                <th style={{ padding: "8px 10px", textAlign: "left", color: T.t2, fontWeight: 600, textTransform: "uppercase" }}>
                  Channel
                </th>
                <th style={{ padding: "8px 10px", textAlign: "right", color: T.t2, fontWeight: 600, textTransform: "uppercase" }}>
                  Share %
                </th>
                <th style={{ padding: "8px 10px", textAlign: "right", color: T.t2, fontWeight: 600, textTransform: "uppercase" }}>
                  Units 30d
                </th>
                <th style={{ padding: "8px 10px", textAlign: "right", color: T.t2, fontWeight: 600, textTransform: "uppercase" }}>
                  Price
                </th>
                <th style={{ padding: "8px 10px", textAlign: "left", color: T.t2, fontWeight: 600, textTransform: "uppercase" }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {dependentSkus.map((sku, i) => (
                <tr
                  key={i}
                  style={{
                    background: i % 2 === 0 ? T.bg : T.cd,
                    borderBottom: `1px solid ${T.bd}`,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = T.bd;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = i % 2 === 0 ? T.bg : T.cd;
                  }}
                  onClick={() => navigate(`/products`)}
                >
                  <td style={{ padding: "8px 10px", color: T.tx }}>{sku.sku}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        background: getChannelColor(sku.channel),
                        color: "#000",
                        padding: "2px 6px",
                        borderRadius: 3,
                        fontSize: "8px",
                        fontWeight: 600,
                      }}
                    >
                      {sku.channel}
                    </span>
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: T.ac, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                    {sku.share_of_velocity.toFixed(1)}%
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: T.tx, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                    {sku.units_30d}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: T.tx, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                    {fc(sku.buybox_price)}
                  </td>
                  <td style={{ padding: "8px 10px", color: sku.status === "Active" ? T.gn : T.t3, fontWeight: 600 }}>
                    {sku.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Back Button */}
      <div style={{ marginTop: 20 }}>
        <button
          onClick={() => navigate("/products")}
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
          ← Back
        </button>
      </div>
    </div>
  );
}
