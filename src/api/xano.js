// NOTE: We intentionally hardcode the marketing-sandbox base URL here. The
// VITE_XANO_BASE env var on Vercel was set to the wrong workspace
// (x8ki-letl-twmt) and every endpoint 404'd in production. Until we either
// (a) remove that env var from Vercel or (b) re-point it at the correct
// xria-ip7c-otef workspace, we ignore it. To override locally set
// VITE_XANO_BASE_OVERRIDE.
const XANO_DEFAULT = "https://xria-ip7c-otef.n7e.xano.io/api:0-tFJsMo";
const XANO_BASE = import.meta.env.VITE_XANO_BASE_OVERRIDE || XANO_DEFAULT;

// Toggle: true = mock data only, false = try real API first (fall back to mock on error)
const USE_MOCK = false;

export const xanoFetch = async (endpoint, options = {}) => {
  if (USE_MOCK) return null;
  const token = localStorage.getItem("xano_token");
  const res = await fetch(`${XANO_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) throw new Error(`Xano ${endpoint}: ${res.status}`);
  return res.json();
};

export { XANO_BASE, USE_MOCK };
