import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[SSM ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            background: "#0a0a0f",
            color: "#e0e0e0",
            fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
            padding: 40,
          }}
        >
          <div
            style={{
              background: "#141420",
              border: "1px solid #2a2a3a",
              borderRadius: 12,
              padding: "32px 40px",
              maxWidth: 500,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 16 }}>⚠</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 20, lineHeight: 1.5 }}>
              The SSM Command Center encountered an unexpected error.
              Your data is safe — try refreshing the page.
            </p>
            <pre
              style={{
                fontSize: 10,
                color: "#ff6b6b",
                background: "#0a0a0f",
                padding: 12,
                borderRadius: 6,
                textAlign: "left",
                overflow: "auto",
                maxHeight: 120,
                marginBottom: 20,
              }}
            >
              {this.state.error?.message || "Unknown error"}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 24px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "'Outfit', sans-serif",
                cursor: "pointer",
                border: "1px solid #4a6cf7",
                background: "#4a6cf720",
                color: "#4a6cf7",
                transition: "all 0.15s",
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
