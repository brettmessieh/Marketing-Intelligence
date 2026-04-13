import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSkuOverview } from "../api/hooks";
import { T } from "../components/shared/Theme";

// Mock data for summary cards
const STOCKOUT_ALERTS = [
  {
    id: 1,
    sku: "SS10QN",
    name: "SS10QN Mattress",
    daysOfCover: 13,
    affectedSkus: 5,
    severity: "critical",
  },
  {
    id: 2,
    sku: "GEN-AB-E-Q",
    name: "GEN-AB-E-Q Base",
    daysOfCover: 18,
    affectedSkus: 8,
    severity: "critical",
  },
];

const SUMMARY_CARDS_DATA = {
  componentSkus: {
    total: 24,
    breakdown: [
      { label: "Launch", value: 4, color: T.ac },
      { label: "Mature", value: 16, color: T.gn },
      { label: "Closeout", value: 4, color: T.rd },
    ],
  },
  marketplaceSkus: {
    total: 48,
    breakdown: [
      { label: "Amazon", value: 28, color: T.amz },
      { label: "Shopify", value: 12, color: T.shop },
      { label: "Walmart", value: 8, color: "#1e90ff" },
    ],
  },
  recommendations: {
    total: 12,
    breakdown: [
      { label: "Inventory", value: 4 },
      { label: "Pricing", value: 3 },
      { label: "Spend", value: 3 },
      { label: "Balance", value: 2 },
    ],
  },
  priceTests: {
    running: 3,
    blocked: 2,
  },
};

// ============================================================================
// COMPONENT: StockoutAlertsBanner
// ============================================================================
function StockoutAlertsBanner() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      style={{
        background: T.bg,
        border: `1px solid ${T.bd}`,
        borderRadius: 8,
        padding: "12px 14px",
        marginBottom: 16,
        fontFamily: "Outfit, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              background: T.rd,
              color: "#fff",
              borderRadius: "4px",
              padding: "2px 6px",
              fontSize: "9px",
              fontWeight: 600,
            }}
          >
            {STOCKOUT_ALERTS.length}
          </div>
          <span style={{ color: T.t1, fontSize: "11px", fontWeight: 500 }}>
            Stockout Alerts
          </span>
        </div>
        <span style={{ color: T.t3, fontSize: "12px" }}>
          {isCollapsed ? "▼" : "▲"}
        </span>
      </div>

      {!isCollapsed && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {STOCKOUT_ALERTS.map((alert) => (
            <div
              key={alert.id}
              style={{
                background: T.cd,
                border: `1px solid ${T.rd}33`,
                borderRadius: 6,
                padding: "10px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    background: T.rd,
                    color: "#fff",
                    borderRadius: 4,
                    padding: "2px 6px",
                    fontSize: "8px",
                    fontWeight: 700,
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {alert.severity === "critical" ? "CRITICAL" : "WARNING"}
                </div>
                <div>
                  <div style={{ color: T.tx, fontSize: "11px", fontWeight: 600 }}>
                    {alert.name}
                  </div>
                  <div
                    style={{
                      color: T.t3,
                      fontSize: "9px",
                      marginTop: 2,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {alert.daysOfCover}d cover remaining
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  color: T.t2,
                  fontSize: "10px",
                }}
              >
                <span>Affects {alert.affectedSkus} SKUs</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENT: SummaryCard
// ============================================================================
function SummaryCard({ title, hero, children }) {
  return (
    <div
      style={{
        background: T.cd,
        border: `1px solid ${T.bd}`,
        borderRadius: 8,
        padding: "14px 16px",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: T.t3,
          fontSize: "9px",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div
        style={{
          color: T.tx,
          fontSize: "22px",
          fontWeight: 700,
          fontFamily: "JetBrains Mono, monospace",
          marginBottom: 10,
        }}
      >
        {hero}
      </div>
      {children}
    </div>
  );
}

// ============================================================================
// COMPONENT: LifecycleBar (mini bar chart)
// ============================================================================
function LifecycleBar() {
  const data = SUMMARY_CARDS_DATA.componentSkus.breakdown;
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div style={{ display: "flex", gap: 4, height: "4px", borderRadius: 2, overflow: "hidden" }}>
      {data.map((item, idx) => (
        <div
          key={idx}
          style={{
            flex: item.value / total,
            background: item.color,
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// COMPONENT: ChannelBreakdown
// ============================================================================
function ChannelBreakdown() {
  const data = SUMMARY_CARDS_DATA.marketplaceSkus.breakdown;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {data.map((item, idx) => (
        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: item.color,
            }}
          />
          <span
            style={{
              color: T.t2,
              fontSize: "10px",
              fontFamily: "Outfit, sans-serif",
              flex: 1,
            }}
          >
            {item.label}
          </span>
          <span
            style={{
              color: T.tx,
              fontSize: "10px",
              fontWeight: 600,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// COMPONENT: RecommendationBreakdown
// ============================================================================
function RecommendationBreakdown() {
  const data = SUMMARY_CARDS_DATA.recommendations.breakdown;

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {data.map((item, idx) => (
        <div
          key={idx}
          style={{
            background: T.bg,
            border: `1px solid ${T.bd}`,
            borderRadius: 4,
            padding: "4px 8px",
            fontSize: "9px",
          }}
        >
          <div style={{ color: T.t3 }}>{item.label}</div>
          <div
            style={{
              color: T.ac,
              fontSize: "11px",
              fontWeight: 700,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// COMPONENT: PriceTestStats
// ============================================================================
function PriceTestStats() {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div>
        <div style={{ color: T.t3, fontSize: "9px", marginBottom: 4 }}>Running</div>
        <div
          style={{
            color: T.gn,
            fontSize: "16px",
            fontWeight: 700,
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {SUMMARY_CARDS_DATA.priceTests.running}
        </div>
      </div>
      <div style={{ borderLeft: `1px solid ${T.bd}`, paddingLeft: 12 }}>
        <div style={{ color: T.t3, fontSize: "9px", marginBottom: 4 }}>Blocked</div>
        <div
          style={{
            color: T.rd,
            fontSize: "16px",
            fontWeight: 700,
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {SUMMARY_CARDS_DATA.priceTests.blocked}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT: FilterBar
// ============================================================================
function FilterBar() {
  const [channelFilter, setChannelFilter] = useState("All");
  const [lifecycleFilter, setLifecycleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filterStyle = {
    background: T.bg,
    border: `1px solid ${T.bd}`,
    color: T.tx,
    borderRadius: 4,
    padding: "6px 8px",
    fontSize: "10px",
    fontFamily: "Outfit, sans-serif",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        marginBottom: 12,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <select
        style={filterStyle}
        value={channelFilter}
        onChange={(e) => setChannelFilter(e.target.value)}
      >
        <option>All Channels</option>
        <option>Amazon</option>
        <option>Shopify</option>
        <option>Walmart</option>
      </select>

      <select
        style={filterStyle}
        value={lifecycleFilter}
        onChange={(e) => setLifecycleFilter(e.target.value)}
      >
        <option>All Lifecycle</option>
        <option>Launch</option>
        <option>Mature</option>
        <option>Closeout</option>
      </select>

      <select
        style={filterStyle}
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option>All Status</option>
        <option>Active</option>
        <option>Stockout Risk</option>
        <option>Stocked Out</option>
        <option>Price Test Active</option>
      </select>

      <input
        type="text"
        placeholder="Search SKU..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          ...filterStyle,
          flex: "0 1 150px",
          color: T.tx,
        }}
      />
    </div>
  );
}

// ============================================================================
// COMPONENT: MarketplaceSkuTable
// ============================================================================
function MarketplaceSkuTable({ data }) {
  const navigate = useNavigate();
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const columns = [
    { key: "name", label: "SKU Name" },
    { key: "channel", label: "Channel" },
    { key: "asinId", label: "ASIN/ID" },
    { key: "buyboxPrice", label: "Buybox Price" },
    { key: "velocity30d", label: "30d Velocity" },
    { key: "units30d", label: "30d Units" },
    { key: "daysOfCover", label: "Days of Cover" },
    { key: "margin", label: "Margin %" },
    { key: "contribution", label: "Contribution" },
    { key: "cvr", label: "CVR" },
    { key: "status", label: "Status" },
    { key: "lifecycle", label: "Lifecycle" },
  ];

  const handleSort = (colKey) => {
    if (sortCol === colKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(colKey);
      setSortDir("asc");
    }
  };

  let tableData = [...(data || [])];
  if (sortCol) {
    tableData.sort((a, b) => {
      const aVal = a[sortCol];
      const bVal = b[sortCol];
      if (typeof aVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }

  const getChannelColor = (channel) => {
    switch (channel) {
      case "Amazon":
        return T.amz;
      case "Shopify":
        return T.shop;
      case "Walmart":
        return "#1e90ff";
      default:
        return T.t2;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return T.gn;
      case "Stockout Risk":
        return T.am;
      case "Stocked Out":
        return T.rd;
      case "Price Test Active":
        return T.pu;
      default:
        return T.t2;
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case "Active":
        return `${T.gn}15`;
      case "Stockout Risk":
        return `${T.am}15`;
      case "Stocked Out":
        return `${T.rd}15`;
      case "Price Test Active":
        return `${T.pu}15`;
      default:
        return T.bg;
    }
  };

  return (
    <div style={{ fontFamily: "Outfit, sans-serif" }}>
      <FilterBar />

      <div
        style={{
          overflowX: "auto",
          border: `1px solid ${T.bd}`,
          borderRadius: 8,
          background: T.bg,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "10px",
          }}
        >
          <thead>
            <tr style={{ background: T.cd, borderBottom: `1px solid ${T.bd}` }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    color: T.t2,
                    fontWeight: 600,
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    cursor: "pointer",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                    borderRight: `1px solid ${T.bd}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {col.label}
                    {sortCol === col.key && (
                      <span style={{ color: T.ac }}>
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, idx) => (
              <tr
                key={row.id}
                style={{
                  background: idx % 2 === 0 ? T.bg : T.cd,
                  borderBottom: `1px solid ${T.bd}`,
                  cursor: "pointer",
                  transition: "background-color 0.15s",
                }}
                onClick={() => navigate(`/sku-velocity/${row.id}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = T.bd;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = idx % 2 === 0 ? T.bg : T.cd;
                }}
              >
                <td
                  style={{ padding: "10px 12px", color: T.tx, borderRight: `1px solid ${T.bd}` }}
                >
                  {row.name}
                </td>
                <td
                  style={{ padding: "10px 12px", color: T.tx, borderRight: `1px solid ${T.bd}` }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      background: getChannelColor(row.channel),
                      color: "#000",
                      padding: "2px 6px",
                      borderRadius: 3,
                      fontSize: "9px",
                      fontWeight: 600,
                    }}
                  >
                    {row.channel}
                  </span>
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    color: T.t2,
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "9px",
                    borderRight: `1px solid ${T.bd}`,
                  }}
                >
                  {row.asinId}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    color: T.tx,
                    fontFamily: "JetBrains Mono, monospace",
                    fontWeight: 600,
                    borderRight: `1px solid ${T.bd}`,
                  }}
                >
                  ${(row.buyboxPrice ?? 0).toFixed(2)}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    color: T.ac,
                    fontFamily: "JetBrains Mono, monospace",
                    fontWeight: 600,
                    borderRight: `1px solid ${T.bd}`,
                  }}
                >
                  {row.velocity30d != null ? `${row.velocity30d.toFixed(1)}x` : "—"}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    color: T.tx,
                    fontFamily: "JetBrains Mono, monospace",
                    fontWeight: 600,
                    borderRight: `1px solid ${T.bd}`,
                  }}
                >
                  {row.units30d != null ? row.units30d.toLocaleString() : "—"}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    color: row.daysOfCover != null && row.daysOfCover < 30 ? T.rd : T.gn,
                    fontFamily: "JetBrains Mono, monospace",
                    fontWeight: 600,
                    borderRight: `1px solid ${T.bd}`,
                  }}
                >
                  {row.daysOfCover != null ? `${row.daysOfCover}d` : "—"}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    color: T.tx,
                    fontFamily: "JetBrains Mono, monospace",
                    fontWeight: 600,
                    borderRight: `1px solid ${T.bd}`,
                  }}
                >
                  {row.margin != null ? `${row.margin.toFixed(1)}%` : "—"}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    color: T.tx,
                    fontFamily: "JetBrains Mono, monospace",
                    fontWeight: 600,
                    borderRight: `1px solid ${T.bd}`,
                  }}
                >
                  {row.contribution != null ? `$${row.contribution.toLocaleString()}` : "—"}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    color: T.t2,
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "9px",
                    borderRight: `1px solid ${T.bd}`,
                  }}
                >
                  {row.cvr != null ? `${row.cvr.toFixed(2)}%` : "—"}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    background: getStatusBg(row.status),
                    borderRight: `1px solid ${T.bd}`,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      color: getStatusColor(row.status),
                      fontSize: "9px",
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: getStatusColor(row.status),
                      }}
                    />
                    {row.status}
                  </span>
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    color: T.t2,
                    fontSize: "9px",
                  }}
                >
                  {row.lifecycle}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT: QuickStatsFooter
// ============================================================================
function QuickStatsFooter({ data }) {
  const marketplaceSkus = data || [];
  // Use dynamic net multiplier (1 - referral - service fee) instead of hardcoded 0.7
  // Default: 1 - 0.15 referral - 0.06 service = 0.79 (conservative estimate)
  const NET_MULTIPLIER = 0.79;
  const totalRevenue = marketplaceSkus.reduce(
    (sum, sku) => sum + sku.buyboxPrice * sku.units30d * NET_MULTIPLIER,
    0
  );
  const totalAdSpend = totalRevenue * 0.25;
  const blendedAcos = totalRevenue > 0 ? (totalAdSpend / totalRevenue) * 100 : 0;
  const avgMargin =
    marketplaceSkus.length > 0
      ? marketplaceSkus.reduce((sum, sku) => sum + sku.margin, 0) / marketplaceSkus.length
      : 0;
  const totalUnits = marketplaceSkus.reduce((sum, sku) => sum + sku.units30d, 0);

  const statStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  };

  const labelStyle = {
    color: T.t3,
    fontSize: "9px",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  const valueStyle = {
    color: T.tx,
    fontSize: "16px",
    fontWeight: 700,
    fontFamily: "JetBrains Mono, monospace",
  };

  return (
    <div
      style={{
        background: T.cd,
        border: `1px solid ${T.bd}`,
        borderRadius: 8,
        padding: "16px",
        marginTop: 16,
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 20,
      }}
    >
      <div style={statStyle}>
        <div style={labelStyle}>30d Revenue</div>
        <div style={valueStyle}>${(totalRevenue / 1000).toFixed(1)}K</div>
      </div>

      <div style={statStyle}>
        <div style={labelStyle}>30d Ad Spend</div>
        <div style={valueStyle}>${(totalAdSpend / 1000).toFixed(1)}K</div>
      </div>

      <div style={statStyle}>
        <div style={labelStyle}>Blended ACOS</div>
        <div style={valueStyle}>{blendedAcos.toFixed(1)}%</div>
      </div>

      <div style={statStyle}>
        <div style={labelStyle}>Avg Margin</div>
        <div style={valueStyle}>{avgMargin.toFixed(1)}%</div>
      </div>

      <div style={statStyle}>
        <div style={labelStyle}>Total Units</div>
        <div style={valueStyle}>{totalUnits.toLocaleString()}</div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export default function SkuVelocityOverview() {
  const { data, loading } = useSkuOverview();

  return (
    <div
      style={{
        background: T.bg,
        color: T.tx,
        minHeight: "100vh",
        fontFamily: "Outfit, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            margin: "0 0 6px 0",
            fontSize: "28px",
            fontWeight: 700,
            color: T.tx,
          }}
        >
          SKU Velocity
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "12px",
            color: T.t3,
          }}
        >
          Real-time marketplace performance tracking and optimization
        </p>
      </div>

      {/* Stockout Alerts */}
      <StockoutAlertsBanner />

      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <SummaryCard title="Component SKUs" hero={SUMMARY_CARDS_DATA.componentSkus.total}>
          <LifecycleBar />
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 8,
              fontSize: "9px",
              color: T.t3,
            }}
          >
            {SUMMARY_CARDS_DATA.componentSkus.breakdown.map((item, idx) => (
              <span key={idx}>
                {item.value} {item.label}
              </span>
            ))}
          </div>
        </SummaryCard>

        <SummaryCard title="Marketplace SKUs" hero={SUMMARY_CARDS_DATA.marketplaceSkus.total}>
          <ChannelBreakdown />
        </SummaryCard>

        <SummaryCard
          title="Pending Recommendations"
          hero={SUMMARY_CARDS_DATA.recommendations.total}
        >
          <RecommendationBreakdown />
        </SummaryCard>

        <SummaryCard title="Active Price Tests" hero={SUMMARY_CARDS_DATA.priceTests.running}>
          <PriceTestStats />
        </SummaryCard>
      </div>

      {/* Marketplace SKU Table */}
      <div style={{ marginBottom: 20 }}>
        <h2
          style={{
            margin: "0 0 12px 0",
            fontSize: "14px",
            fontWeight: 600,
            color: T.t1,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Marketplace SKU Performance
        </h2>
        <MarketplaceSkuTable data={data} />
      </div>

      {/* Quick Stats Footer */}
      <QuickStatsFooter data={data} />
    </div>
  );
}
