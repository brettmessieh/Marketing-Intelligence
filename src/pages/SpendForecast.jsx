import { useState, useMemo } from "react";
import { useSpendForecast } from "../api/hooks";
import { T, fm, fc } from "../components/shared/Theme";

// Channel colors
const CHANNEL_COLORS = {
  amazon: "#FF9900",
  sven: "#60a5fa",
  sleepgeekz: "#34d399",
  celestial: "#a78bfa",
  walmart: "#22d3ee",
};

const CHANNEL_LABELS = {
  amazon: "Amazon",
  sven: "Sven & Son",
  sleepgeekz: "Sleep Geekz",
  celestial: "Celestial",
  walmart: "Walmart",
};

// Simple bar component
function Bar({ value, max, color, width = "100%" }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ width, height: 8, background: T.bd, borderRadius: 4, overflow: "hidden" }}>
      <div
        style={{
          width: `${Math.min(pct, 100)}%`,
          height: "100%",
          background: color,
          borderRadius: 4,
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}

// Stat card component
function StatCard({ label, value, subValue, color, icon }) {
  return (
    <div
      style={{
        background: T.bg2,
        border: `1px solid ${T.bd}`,
        borderRadius: 8,
        padding: "16px 20px",
        flex: 1,
        minWidth: 160,
      }}
    >
      <div style={{ fontSize: 10, color: T.t3, fontWeight: 500, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || T.tx, letterSpacing: "-0.5px" }}>
        {value}
      </div>
      {subValue && (
        <div style={{ fontSize: 10, color: T.t3, marginTop: 4 }}>{subValue}</div>
      )}
    </div>
  );
}

// Mini sparkline as stacked horizontal bar
function ChannelBreakdownBar({ channelTotals, metric }) {
  const total = Object.values(channelTotals).reduce((s, c) => s + (c[metric] || 0), 0);
  if (total === 0) return null;
  return (
    <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", gap: 1 }}>
      {Object.entries(channelTotals)
        .filter(([, v]) => v[metric] > 0)
        .sort(([, a], [, b]) => b[metric] - a[metric])
        .map(([ch, v]) => (
          <div
            key={ch}
            style={{
              width: `${(v[metric] / total) * 100}%`,
              background: CHANNEL_COLORS[ch] || T.ac,
              minWidth: 2,
            }}
            title={`${CHANNEL_LABELS[ch] || ch}: ${fc(v[metric])}`}
          />
        ))}
    </div>
  );
}

export default function SpendForecast() {
  const { data, loading, source } = useSpendForecast();
  const [viewMode, setViewMode] = useState("monthly"); // "daily" | "monthly"
  const [selectedChannel, setSelectedChannel] = useState("all");

  // Aggregate data
  const { channelTotals, monthlyData, dailyData, dateRange } = useMemo(() => {
    if (!data || data.length === 0) return { channelTotals: {}, monthlyData: [], dailyData: [], dateRange: {} };

    const channels = {};
    const byMonth = {};
    const byDay = {};

    data.forEach((r) => {
      if (selectedChannel !== "all" && r.channel !== selectedChannel) return;

      // Channel totals
      if (!channels[r.channel]) channels[r.channel] = { revenue: 0, spend: 0, days: 0 };
      channels[r.channel].revenue += r.forecasted_revenue || 0;
      channels[r.channel].spend += r.spend_budget || 0;
      channels[r.channel].days += 1;

      // Monthly aggregation
      const month = r.date?.slice(0, 7) || "unknown";
      if (!byMonth[month]) byMonth[month] = { revenue: 0, spend: 0, days: new Set() };
      byMonth[month].revenue += r.forecasted_revenue || 0;
      byMonth[month].spend += r.spend_budget || 0;
      byMonth[month].days.add(r.date);

      // Daily aggregation (sum across channels for that day)
      if (!byDay[r.date]) byDay[r.date] = { revenue: 0, spend: 0, channels: {} };
      byDay[r.date].revenue += r.forecasted_revenue || 0;
      byDay[r.date].spend += r.spend_budget || 0;
      byDay[r.date].channels[r.channel] = {
        revenue: r.forecasted_revenue || 0,
        spend: r.spend_budget || 0,
      };
    });

    // For channel totals, use ALL data (not filtered by channel)
    const allChannels = {};
    data.forEach((r) => {
      if (!allChannels[r.channel]) allChannels[r.channel] = { revenue: 0, spend: 0, days: 0 };
      allChannels[r.channel].revenue += r.forecasted_revenue || 0;
      allChannels[r.channel].spend += r.spend_budget || 0;
      allChannels[r.channel].days += 1;
    });

    const monthly = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v, days: v.days.size }));

    const daily = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    const dates = data.map((r) => r.date).filter(Boolean);
    return {
      channelTotals: allChannels,
      monthlyData: monthly,
      dailyData: daily,
      dateRange: { min: dates.length ? dates.sort()[0] : "", max: dates.length ? dates.sort().pop() : "" },
    };
  }, [data, selectedChannel]);

  const grandTotal = useMemo(() => {
    return Object.values(channelTotals).reduce(
      (acc, c) => ({ revenue: acc.revenue + c.revenue, spend: acc.spend + c.spend }),
      { revenue: 0, spend: 0 }
    );
  }, [channelTotals]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: T.t3 }}>
        Loading spend forecast data...
      </div>
    );
  }

  const maxDailyRevenue = dailyData.length > 0 ? Math.max(...dailyData.map((d) => d.revenue)) : 1;
  const maxMonthlyRevenue = monthlyData.length > 0 ? Math.max(...monthlyData.map((d) => d.revenue)) : 1;

  const MONTH_NAMES = { "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun", "07": "Jul", "08": "Aug", "09": "Sep", 10: "Oct", 11: "Nov", 12: "Dec" };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: T.tx }}>Spend Forecast</h1>
          <p style={{ fontSize: 11, color: T.t3, margin: "4px 0 0" }}>
            12% blended ACoS model &middot; {dateRange.min} to {dateRange.max} &middot; {data?.length || 0} records
            {source && (
              <span
                style={{
                  marginLeft: 8,
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontSize: 9,
                  background: source === "api" ? `${T.gn}20` : `${T.am}20`,
                  color: source === "api" ? T.gn : T.am,
                }}
              >
                {source === "api" ? "LIVE" : "MOCK"}
              </span>
            )}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {/* Channel filter */}
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            style={{
              background: T.bg2,
              color: T.tx,
              border: `1px solid ${T.bd}`,
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            <option value="all">All Channels</option>
            {Object.keys(CHANNEL_LABELS).map((ch) => (
              <option key={ch} value={ch}>
                {CHANNEL_LABELS[ch]}
              </option>
            ))}
          </select>

          {/* View toggle */}
          <div style={{ display: "flex", background: T.bg2, borderRadius: 6, border: `1px solid ${T.bd}` }}>
            {["monthly", "daily"].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  background: viewMode === mode ? T.ac : "transparent",
                  color: viewMode === mode ? T.bg : T.t2,
                  border: "none",
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                  borderRadius: 5,
                }}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard
          label="FORECASTED REVENUE"
          value={fm(grandTotal.revenue)}
          subValue={`${dateRange.min} to ${dateRange.max}`}
          color={T.gn}
        />
        <StatCard
          label="SPEND BUDGET (12% ACoS)"
          value={fm(grandTotal.spend)}
          subValue={`${((grandTotal.spend / grandTotal.revenue) * 100).toFixed(1)}% of revenue`}
          color={T.ac}
        />
        <StatCard
          label="AVG DAILY SPEND"
          value={fm(grandTotal.spend / (dailyData.length || 1))}
          subValue={`Across ${dailyData.length} days`}
          color={T.am}
        />
        <StatCard
          label="TOP CHANNEL"
          value={
            Object.entries(channelTotals).sort(([, a], [, b]) => b.revenue - a.revenue)[0]?.[0]
              ? CHANNEL_LABELS[Object.entries(channelTotals).sort(([, a], [, b]) => b.revenue - a.revenue)[0][0]]
              : "—"
          }
          subValue={
            Object.entries(channelTotals).sort(([, a], [, b]) => b.revenue - a.revenue)[0]
              ? fm(Object.entries(channelTotals).sort(([, a], [, b]) => b.revenue - a.revenue)[0][1].revenue)
              : ""
          }
          color={T.pu}
        />
      </div>

      {/* Channel breakdown */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.t2, marginBottom: 8 }}>CHANNEL BREAKDOWN</div>
        <ChannelBreakdownBar channelTotals={channelTotals} metric="revenue" />
        <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
          {Object.entries(channelTotals)
            .sort(([, a], [, b]) => b.revenue - a.revenue)
            .map(([ch, v]) => (
              <div key={ch} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: CHANNEL_COLORS[ch] || T.ac }} />
                <span style={{ color: T.t2 }}>{CHANNEL_LABELS[ch] || ch}</span>
                <span style={{ color: T.tx, fontWeight: 600 }}>{fm(v.revenue)}</span>
                <span style={{ color: T.t3 }}>({((v.revenue / grandTotal.revenue) * 100).toFixed(1)}%)</span>
              </div>
            ))}
        </div>
      </div>

      {/* Data table */}
      <div
        style={{
          background: T.bg2,
          border: `1px solid ${T.bd}`,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.bd}` }}>
              <th style={thStyle}>{viewMode === "monthly" ? "Month" : "Date"}</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Forecasted Revenue</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Spend Budget</th>
              <th style={{ ...thStyle, textAlign: "right" }}>ACoS</th>
              <th style={{ ...thStyle, width: "25%" }}>Revenue Distribution</th>
            </tr>
          </thead>
          <tbody>
            {viewMode === "monthly"
              ? monthlyData.map((row) => (
                  <tr key={row.month} style={{ borderBottom: `1px solid ${T.bd}20` }}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: T.tx }}>
                        {MONTH_NAMES[row.month.slice(5)] || row.month.slice(5)} {row.month.slice(0, 4)}
                      </span>
                      <span style={{ fontSize: 9, color: T.t4, marginLeft: 6 }}>{row.days} days</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", color: T.gn, fontWeight: 600 }}>
                      {fm(row.revenue)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", color: T.ac, fontWeight: 600 }}>
                      {fm(row.spend)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", color: T.t2 }}>
                      {row.revenue > 0 ? ((row.spend / row.revenue) * 100).toFixed(1) + "%" : "—"}
                    </td>
                    <td style={tdStyle}>
                      <Bar value={row.revenue} max={maxMonthlyRevenue} color={T.gn} />
                    </td>
                  </tr>
                ))
              : dailyData.slice(-30).map((row) => (
                  <tr key={row.date} style={{ borderBottom: `1px solid ${T.bd}20` }}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 500, color: T.tx }}>{row.date}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", color: T.gn, fontWeight: 600 }}>
                      {fc(row.revenue)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", color: T.ac, fontWeight: 600 }}>
                      {fc(row.spend)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", color: T.t2 }}>
                      {row.revenue > 0 ? ((row.spend / row.revenue) * 100).toFixed(1) + "%" : "—"}
                    </td>
                    <td style={tdStyle}>
                      <Bar value={row.revenue} max={maxDailyRevenue} color={T.gn} />
                    </td>
                  </tr>
                ))}
          </tbody>
          {/* Totals row */}
          <tfoot>
            <tr style={{ borderTop: `2px solid ${T.bd}` }}>
              <td style={{ ...tdStyle, fontWeight: 700, color: T.tx }}>
                {viewMode === "monthly" ? "TOTAL" : `LAST 30 DAYS`}
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: T.gn }}>
                {fm(
                  viewMode === "monthly"
                    ? monthlyData.reduce((s, r) => s + r.revenue, 0)
                    : dailyData.slice(-30).reduce((s, r) => s + r.revenue, 0)
                )}
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: T.ac }}>
                {fm(
                  viewMode === "monthly"
                    ? monthlyData.reduce((s, r) => s + r.spend, 0)
                    : dailyData.slice(-30).reduce((s, r) => s + r.spend, 0)
                )}
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: T.t2 }}>12.0%</td>
              <td style={tdStyle} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Daily view note */}
      {viewMode === "daily" && dailyData.length > 30 && (
        <div style={{ fontSize: 10, color: T.t4, marginTop: 8, textAlign: "center" }}>
          Showing last 30 of {dailyData.length} days. Full range: {dateRange.min} to {dateRange.max}
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: 10,
  fontWeight: 600,
  color: "#9ea4ad",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const tdStyle = {
  padding: "10px 14px",
  color: "#c4c8cf",
};
