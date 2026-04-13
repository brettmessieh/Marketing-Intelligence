import { Link, useLocation } from "react-router-dom";
import { T } from "../shared/Theme";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  const navItems = [
    { label: "SKU Velocity", path: "/sku-velocity", icon: "📊" },
    { label: "Spend Command Center", path: "/spend-command-center", icon: "📈" },
    { label: "Channel Deep Dive", path: "/channel-deep-dive", icon: "🎯" },
    { label: "Components", path: "/components", icon: "🔧" },
    { label: "Settings", path: "/settings", icon: "⚙️" },
  ];

  return (
    <div
      style={{
        width: "200px",
        minWidth: "200px",
        background: T.bg2,
        borderRight: `1px solid ${T.bd}`,
        padding: "20px 0",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {/* Brand Logo */}
      <div
        style={{
          padding: "0 16px",
          marginBottom: 32,
          borderBottom: `1px solid ${T.bd}`,
          paddingBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: T.tx,
            letterSpacing: "-0.5px",
          }}
        >
          SSM
        </div>
        <div
          style={{
            fontSize: "9px",
            color: T.t3,
            marginTop: 2,
            fontWeight: 500,
          }}
        >
          Command Center
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingX: 8 }}>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              textDecoration: "none",
              padding: "10px 12px",
              borderRadius: 6,
              color: isActive(item.path) ? T.ac : T.t2,
              fontSize: "11px",
              fontWeight: isActive(item.path) ? 600 : 500,
              backgroundColor: isActive(item.path) ? `${T.ac}15` : "transparent",
              borderLeft: isActive(item.path) ? `2px solid ${T.ac}` : "none",
              paddingLeft: isActive(item.path) ? "11px" : "12px",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isActive(item.path)) {
                e.currentTarget.style.backgroundColor = `${T.bd}40`;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive(item.path)) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            <span style={{ fontSize: "14px" }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User & Logout */}
      <div
        style={{
          padding: "12px",
          borderTop: `1px solid ${T.bd}`,
          fontSize: "11px",
        }}
      >
        {user && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: T.tx, fontWeight: 600, fontSize: "11px" }}>
              {user.name || user.email}
            </div>
            <div style={{ color: T.t4, fontSize: "9px", marginTop: 2 }}>
              {user.role || "viewer"}
            </div>
          </div>
        )}
        <button
          onClick={logout}
          style={{
            width: "100%",
            padding: "8px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: 6,
            color: "#ef4444",
            fontSize: "10px",
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "'Outfit', sans-serif",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
