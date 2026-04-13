import { useState, useMemo, useCallback } from "react";
import { T, fm } from "../components/shared/Theme";
import {
  recommendAllocation,
  projectContribution,
  getPromoContext,
  getSpendMultiplier,
  CHANNEL_CONFIG,
  CH_MINS,
  DEFAULT_BUDGETS,
  SUB_CH,
  MARGIN,
} from "../api/allocator";

// Format helpers
const fk = (n) => "$" + (n / 1000).toFixed(1) + "K";
const fp = (n) => n.toFixed(1) + "%";

// Today as YYYY-MM-DD
const today = new Date().toISOString().slice(0, 10);

export default function SpendAllocator() {
  const [budgets, setBudgets] = useState({ ...DEFAULT_BUDGETS });
  const [merCeiling, setMerCeiling] = useState(16);
  const [allocDate, setAllocDate] = useState(today);
  const [lastRun, setLastRun] = useState(null);
  const [showSubChannels, setShowSubChannels] = useState(false);

  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0);

  // Promo context for selected date
  const promoCtx = useMemo(() => getPromoContext(allocDate), [allocDate]);
  const { mult: spendMult } = useMemo(
    () => getSpendMultiplier(allocDate),
    [allocDate]
  );

  // Live projection (updates as sliders move)
  const projection = useMemo(
    () =>
      projectContribution(
        budgets.amz, budgets.ggl, budgets.meta, budgets.msft, budgets.wal
      ),
    [budgets]
  );

  const liveMer =
    projection.totalSp > 0
      ? (projection.totalSp / projection.total) * 100
      : 0;
  const liveRoas =
    projection.totalSp > 0 ? projection.total / projection.totalSp : 0;

  // Run optimizer
  const runOptimizer = useCallback(() => {
    const result = recommendAllocation(totalBudget, merCeiling, spendMult);
    setBudgets(result.allocation);
    setLastRun(result);
  }, [totalBudget, merCeiling, spendMult]);

  // Reset to defaults
  const resetBudgets = useCallback(() => {
    setBudgets({ ...DEFAULT_BUDGETS });
    setLastRun(null);
  }, []);

  // Update individual channel
  const updateChannel = (ch, val) => {
    setBudgets((prev) => ({ ...prev, [ch]: val }));
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: T.tx }}>
            Budget Allocator
          </h1>
          <p style={{ fontSize: 11, color: T.t3, margin: "4px 0 0" }}>
            LTV-adjusted contribution optimizer &middot; 764-day model &middot;
            17,773-order margin calibration
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="date"
            value={allocDate}
            onChange={(e) => setAllocDate(e.target.value)}
            style={{
              background: T.bg2,
              color: T.tx,
              border: `1px solid ${T.bd}`,
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 11,
            }}
          />
          <button onClick={resetBudgets} style={btnSecondary}>
            Reset
          </button>
          <button onClick={runOptimizer} style={btnPrimary}>
            Optimize
          </button>
        </div>
      </div>

      {/* Promo banner */}
      {promoCtx.promo && (
        <div
          style={{
            background: `${T.am}15`,
            border: `1px solid ${T.am}40`,
            borderRadius: 8,
            padding: "10px 16px",
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.am }}>
              {promoCtx.promo}
            </span>
            <span style={{ fontSize: 10, color: T.t3, marginLeft: 8 }}>
              {promoCtx.phase} &middot; {promoCtx.code} &middot; trend{" "}
              {promoCtx.trend}/100
            </span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.am }}>
            Spend mult: {spendMult.toFixed(2)}x
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 20 }}>
        {/* Left: Channel sliders */}
        <div style={{ flex: 1 }}>
          <Card title="CHANNEL BUDGETS">
            {Object.entries(CHANNEL_CONFIG).map(([ch, cfg]) => (
              <div key={ch} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: cfg.color,
                      }}
                    />
                    <span style={{ fontSize: 11, fontWeight: 600, color: T.tx }}>
                      {cfg.label}
                    </span>
                    {CH_MINS[ch] > 0 && (
                      <span style={{ fontSize: 9, color: T.t4 }}>
                        min {fk(CH_MINS[ch])}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>
                    {fk(budgets[ch])}
                  </span>
                </div>
                <input
                  type="range"
                  min={cfg.sliderMin}
                  max={cfg.sliderMax}
                  step={cfg.sliderStep}
                  value={budgets[ch]}
                  onChange={(e) => updateChannel(ch, parseInt(e.target.value))}
                  style={{
                    width: "100%",
                    accentColor: cfg.color,
                    cursor: "pointer",
                  }}
                />
                {/* Share bar */}
                <div
                  style={{
                    height: 3,
                    background: T.bd,
                    borderRadius: 2,
                    overflow: "hidden",
                    marginTop: 2,
                  }}
                >
                  <div
                    style={{
                      width: `${totalBudget > 0 ? (budgets[ch] / totalBudget) * 100 : 0}%`,
                      height: "100%",
                      background: cfg.color,
                      transition: "width 0.2s",
                    }}
                  />
                </div>
              </div>
            ))}

            {/* MER Ceiling */}
            <div style={{ borderTop: `1px solid ${T.bd}`, paddingTop: 12, marginTop: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, color: T.t2 }}>
                  MER Ceiling
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: liveMer > merCeiling ? T.rd : T.gn }}>
                  {fp(merCeiling)}
                </span>
              </div>
              <input
                type="range"
                min={8}
                max={25}
                step={0.5}
                value={merCeiling}
                onChange={(e) => setMerCeiling(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: T.ac, cursor: "pointer" }}
              />
            </div>

            {/* Total */}
            <div
              style={{
                borderTop: `1px solid ${T.bd}`,
                paddingTop: 12,
                marginTop: 12,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: T.tx }}>
                Total Daily Budget
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: T.ac }}>
                {fk(totalBudget)}
              </span>
            </div>
          </Card>

          {/* Sub-channel breakdown */}
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => setShowSubChannels(!showSubChannels)}
              style={{
                ...btnSecondary,
                width: "100%",
                fontSize: 10,
                padding: "8px",
              }}
            >
              {showSubChannels ? "Hide" : "Show"} Sub-Channel Breakdown
            </button>
            {showSubChannels && (
              <Card title="SUB-CHANNELS" style={{ marginTop: 8 }}>
                {Object.entries(SUB_CH).map(([ch, subs]) =>
                  budgets[ch] > 0 ? (
                    <div key={ch} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: CHANNEL_CONFIG[ch]?.color || T.ac, marginBottom: 4 }}>
                        {CHANNEL_CONFIG[ch]?.label}
                      </div>
                      {subs.map((sc) => (
                        <div
                          key={sc.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "3px 0",
                            fontSize: 10,
                          }}
                        >
                          <span style={{ color: T.t2 }}>
                            {sc.name}{" "}
                            <span style={{ color: T.t4, fontSize: 9 }}>
                              ({fp(sc.share * 100)} &middot; {sc.roas}x ROAS)
                            </span>
                          </span>
                          <span style={{ color: T.tx, fontWeight: 600 }}>
                            ${Math.round(budgets[ch] * sc.share).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null
                )}
              </Card>
            )}
          </div>
        </div>

        {/* Right: Projections */}
        <div style={{ flex: 1 }}>
          <Card title="PROJECTIONS">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <MetricBox label="Total Revenue" value={fm(projection.total)} color={T.gn} />
              <MetricBox label="Total Spend" value={fm(projection.totalSp)} color={T.rd} />
              <MetricBox
                label="MER"
                value={fp(liveMer)}
                color={liveMer > merCeiling ? T.rd : T.gn}
                sub={liveMer > merCeiling ? "OVER CEILING" : "within ceiling"}
              />
              <MetricBox label="ROAS" value={liveRoas.toFixed(2) + "x"} color={T.ac} />
              <MetricBox label="Gross Contrib" value={fm(projection.grossContrib)} color={T.am} />
              <MetricBox label="LTV Contrib" value={fm(projection.ltvContrib)} color={T.pu} sub="1.975x LTV adj" />
            </div>

            {/* Platform breakdown */}
            <div style={{ marginTop: 16, borderTop: `1px solid ${T.bd}`, paddingTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: T.t3, marginBottom: 8 }}>
                PLATFORM REVENUE
              </div>
              <PlatformRow
                label="Amazon"
                revenue={projection.amz}
                contrib={projection.amzContrib}
                margin={MARGIN.amz.net}
                color="#FF9900"
                total={projection.total}
                halo={projection.halo}
              />
              <PlatformRow
                label="Shopify"
                revenue={projection.shop}
                contrib={projection.shopContrib}
                margin={MARGIN.shop.net}
                color="#96BF48"
                total={projection.total}
              />
              <PlatformRow
                label="Walmart"
                revenue={projection.wal}
                contrib={projection.walContrib}
                margin={MARGIN.wal.net}
                color="#0071CE"
                total={projection.total}
              />
            </div>

            {/* Meta halo callout */}
            <div
              style={{
                marginTop: 12,
                padding: "8px 12px",
                background: `${T.pu}10`,
                borderRadius: 6,
                border: `1px solid ${T.pu}30`,
              }}
            >
              <div style={{ fontSize: 10, color: T.pu, fontWeight: 600 }}>
                Meta Halo Effect
              </div>
              <div style={{ fontSize: 9, color: T.t3, marginTop: 2 }}>
                ${budgets.meta.toLocaleString()} Meta spend generates{" "}
                <span style={{ color: T.pu, fontWeight: 600 }}>
                  {fm(projection.halo)}
                </span>{" "}
                incremental Amazon revenue via branded search lift. Saturates at{" "}
                $14K/day at ~$3K Meta spend.
              </div>
            </div>
          </Card>

          {/* Optimizer results */}
          {lastRun && (
            <Card title="OPTIMIZER RESULTS" style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, color: T.t3, marginBottom: 8 }}>
                Converged in {lastRun.metadata.iterationsUsed} iterations
                {lastRun.metadata.spendMult > 1 && (
                  <span>
                    {" "}&middot; promo mult {lastRun.metadata.spendMult.toFixed(2)}x
                    &middot; effective ceiling {fp(lastRun.metadata.effectiveCeiling)}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(lastRun.allocation).map(([ch, val]) => (
                  <div
                    key={ch}
                    style={{
                      background: T.bg,
                      borderRadius: 6,
                      padding: "6px 10px",
                      flex: 1,
                      minWidth: 80,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 9, color: CHANNEL_CONFIG[ch]?.color || T.t3 }}>
                      {CHANNEL_CONFIG[ch]?.label || ch}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.tx }}>
                      {fk(val)}
                    </div>
                    <div style={{ fontSize: 9, color: T.t4 }}>
                      {totalBudget > 0 ? fp((val / lastRun.metadata.adjustedBudget) * 100) : "0%"}
                    </div>
                  </div>
                ))}
              </div>

              {/* Predicted metrics */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <MiniStat label="Pred. Revenue" value={fm(lastRun.predictions.totalRevenue)} />
                <MiniStat label="Pred. MER" value={fp(lastRun.predictions.mer)} />
                <MiniStat label="Pred. ROAS" value={lastRun.predictions.roas + "x"} />
                <MiniStat label="Gross Contrib" value={fm(lastRun.predictions.grossContrib)} />
                <MiniStat label="LTV Contrib" value={fm(lastRun.predictions.ltvContrib)} />
                <MiniStat label="Meta Halo" value={fm(lastRun.predictions.metaHalo)} />
              </div>
            </Card>
          )}

          {/* Margin model info */}
          <Card title="MARGIN MODEL" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 9, color: T.t4, marginBottom: 6 }}>
              Calibrated from {(MARGIN.amz.n + MARGIN.shop.n + MARGIN.wal.n).toLocaleString()} orders (Nov 2025–Mar 2026)
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "Amazon", margin: MARGIN.amz.net, color: "#FF9900" },
                { label: "Shopify", margin: MARGIN.shop.net, color: "#96BF48" },
                { label: "Walmart", margin: MARGIN.wal.net, color: "#0071CE" },
              ].map((p) => (
                <div
                  key={p.label}
                  style={{
                    flex: 1,
                    background: T.bg,
                    borderRadius: 6,
                    padding: "8px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 9, color: p.color }}>{p.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.tx }}>
                    {fp(p.margin * 100)}
                  </div>
                  <div style={{ fontSize: 9, color: T.t4 }}>pre-ad margin</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Shared sub-components
// ============================================================

function Card({ title, children, style = {} }) {
  return (
    <div
      style={{
        background: T.bg2,
        border: `1px solid ${T.bd}`,
        borderRadius: 8,
        padding: 16,
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: T.t3,
            marginBottom: 12,
            letterSpacing: "0.5px",
          }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

function MetricBox({ label, value, color, sub }) {
  return (
    <div
      style={{
        background: T.bg,
        borderRadius: 6,
        padding: "10px 12px",
      }}
    >
      <div style={{ fontSize: 9, color: T.t3, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || T.tx }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 8, color: T.t4, marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}

function PlatformRow({ label, revenue, contrib, margin, color, total, halo }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "6px 0",
        borderBottom: `1px solid ${T.bd}20`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
        <span style={{ fontSize: 11, color: T.tx }}>{label}</span>
        <span style={{ fontSize: 9, color: T.t4 }}>
          ({fp(margin * 100)} margin)
        </span>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.tx }}>
          {fm(revenue)}
          {halo > 0 && (
            <span style={{ fontSize: 9, color: T.pu, marginLeft: 4 }}>
              (+{fm(halo)} halo)
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 9,
            color: contrib >= 0 ? T.gn : T.rd,
          }}
        >
          {fm(contrib)} contrib &middot;{" "}
          {total > 0 ? fp((revenue / total) * 100) : "0%"} of total
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 8, color: T.t4 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.tx }}>{value}</div>
    </div>
  );
}

// Button styles
const btnPrimary = {
  background: T.ac,
  color: T.bg,
  border: "none",
  borderRadius: 6,
  padding: "8px 16px",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};
const btnSecondary = {
  background: "transparent",
  color: T.t2,
  border: `1px solid ${T.bd}`,
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 11,
  fontWeight: 500,
  cursor: "pointer",
};
