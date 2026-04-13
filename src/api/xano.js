const XANO_BASE = import.meta.env.VITE_XANO_BASE || "https://xria-ip7c-otef.n7e.xano.io/api:0-tFJsMo";

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
