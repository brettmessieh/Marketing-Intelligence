export const T = {
  bg: "#1a1d23",
  bg2: "#15171c",
  cd: "#13151a",
  bd: "#2a2d35",
  tx: "#e8eaed",
  t1: "#c4c8cf",
  t2: "#9ea4ad",
  t3: "#737a85",
  t4: "#555b64",
  ac: "#60a5fa",
  gn: "#34d399",
  rd: "#f87171",
  am: "#fbbf24",
  pu: "#a78bfa",
  cy: "#22d3ee",
  amz: "#FF9900",
  shop: "#96BF48",
};

export const fm = (n) => {
  if (n == null) return "—";
  if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + n.toFixed(0);
};

export const fc = (n) =>
  n != null ? "$" + n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—";

export const pt = (n) => (n != null ? n.toFixed(1) + "%" : "—");
