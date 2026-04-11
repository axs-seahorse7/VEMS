// AdminDashboard.jsx  — Overview / Coming Soon page
// Drop inside <AdminLayout activePage="overview"> … </AdminLayout>

export default function AdminDashboard() {
  const tiles = [
    { label: "Real-time Van Tracking", icon: "🚛", eta: "Q3 2025" },
    { label: "Factory KPI Trends", icon: "📈", eta: "Q3 2025" },
    { label: "Driver Analytics", icon: "👤", eta: "Q4 2025" },
    { label: "PUC Compliance Reports", icon: "📋", eta: "Q4 2025" },
    { label: "Route Heatmaps", icon: "🗺️", eta: "Q1 2026" },
    { label: "Predictive Alerts", icon: "🔔", eta: "Q1 2026" },
  ];

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>

      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #0f1117 0%, #1e2130 60%, #1a1040 100%)",
        borderRadius: 20, padding: "52px 48px", marginBottom: 28,
        position: "relative", overflow: "hidden",
        boxShadow: "0 20px 60px rgba(99,102,241,0.18)",
      }}>
        {/* Decorative blobs */}
        <div style={{
          position: "absolute", top: -60, right: -60, width: 240, height: 240,
          borderRadius: "50%", background: "rgba(99,102,241,0.15)", filter: "blur(60px)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -40, left: 80, width: 180, height: 180,
          borderRadius: "50%", background: "rgba(129,140,248,0.1)", filter: "blur(50px)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)",
            borderRadius: 20, padding: "5px 14px", marginBottom: 22,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#818cf8", display: "inline-block" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: .5 }}>FEATURE IN PROGRESS</span>
          </div>

          <h1 style={{
            fontSize: 36, fontWeight: 800, color: "#fff", margin: "0 0 12px",
            lineHeight: 1.15, letterSpacing: -.5,
          }}>
            Analytics &amp; Overview<br />
            <span style={{ color: "#818cf8" }}>is coming soon.</span>
          </h1>
          <p style={{ fontSize: 15, color: "#94a3b8", maxWidth: 460, lineHeight: 1.7, margin: 0 }}>
            We're building a powerful analytics dashboard with factory trends,
            van movement insights and compliance reports — all in one place.
          </p>

          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <button style={{
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              border: "none", borderRadius: 10, padding: "11px 22px",
              color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
            }}>
              Notify Me
            </button>
            <button style={{
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10, padding: "11px 22px",
              color: "#e2e8f0", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
            }}>
              View Roadmap
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming features grid */}
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", letterSpacing: .8, textTransform: "uppercase", marginBottom: 16 }}>
          What's coming
        </h2>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14
        }}>
          {tiles.map((t) => (
            <div key={t.label} style={{
              background: "#fff", borderRadius: 14,
              border: "1px solid #e5e7eb",
              padding: "20px 20px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              <span style={{ fontSize: 28 }}>{t.icon}</span>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{t.label}</div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: "#ede9fe", borderRadius: 6, padding: "3px 9px", width: "fit-content",
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1" }}>ETA {t.eta}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid #e5e7eb", marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: "#111" }}>Overall build progress</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#6366f1" }}>32%</span>
        </div>
        <div style={{ background: "#f1f5f9", borderRadius: 8, height: 8, overflow: "hidden" }}>
          <div style={{ width: "32%", height: "100%", background: "linear-gradient(90deg,#6366f1,#818cf8)", borderRadius: 8, transition: "width 1s ease" }} />
        </div>
        <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 8 }}>
          Core infrastructure complete · UI components in progress · Analytics engine pending
        </div>
      </div>
    </div>
  );
}