// AdminDashboard.jsx  — Overview / Analytics Landing Page
import { useState, useEffect, useRef } from "react";
import api from "../../../../services/API/Api/api"; // adjust path as needed

// ── Route map for upcoming feature cards ───────────────────────────────────
const FEATURE_ROUTES = {
  "Real-time Van Tracking":    "/admin/analytics/van-tracking",
  "Factory KPI Trends":        "/admin/analytics/factory-kpi",
  "Driver Analytics":          "/admin/analytics/driver-analytics",
  "PUC Compliance Reports":    "/admin/analytics/puc-compliance",
  "Route Heatmaps":            "/admin/analytics/route-heatmaps",
  "Predictive Alerts":         "/admin/analytics/predictive-alerts",
};

const TILES = [
  { label: "Real-time Van Tracking",  icon: "🚛", eta: "Q3 2025", status: "building",  desc: "Live GPS positions and ETA for every vehicle on the road." },
  { label: "Factory KPI Trends",      icon: "📈", eta: "Q3 2025", status: "building",  desc: "Throughput, turnaround time and capacity metrics per factory." },
  { label: "Driver Analytics",        icon: "👤", eta: "Q4 2025", status: "planned",   desc: "Trip history, punctuality score and safety ratings per driver." },
  { label: "PUC Compliance Reports",  icon: "📋", eta: "Q4 2025", status: "planned",   desc: "Expiry calendar, bulk renewal reminders and compliance %."},
  { label: "Route Heatmaps",          icon: "🗺️", eta: "Q1 2026", status: "research",  desc: "Visual heat maps of high-frequency corridors and bottlenecks." },
  { label: "Predictive Alerts",       icon: "🔔", eta: "Q1 2026", status: "research",  desc: "ML-powered anomaly detection and maintenance forecasts." },
];

const STATUS_META = {
  building:  { label: "Building",  bg: "#dbeafe", color: "#1d4ed8" },
  planned:   { label: "Planned",   bg: "#ede9fe", color: "#6d28d9" },
  research:  { label: "Research",  bg: "#fef3c7", color: "#b45309" },
};

const VEHICLE_ICONS = {
  truck: "🚛", miniTruck: "🚚", containerTruck: "🚛", mixerTruck: "🚜",
  waterTanker: "🚒", tractor: "🚜", car: "🚗", bus: "🚌",
  ambulance: "🚑", van: "🚐", trailer: "🚋",
};

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week",  label: "Last 7 Days" },
  { key: "month", label: "Last 30 Days" },
];

// ── Mini horizontal bar chart ──────────────────────────────────────────────
function TripBar({ count, max, color }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
      <div style={{
        width: `${pct}%`, height: "100%", borderRadius: 99,
        background: color,
        transition: "width 0.7s cubic-bezier(.4,0,.2,1)",
      }} />
    </div>
  );
}

// ── Leaderboard card ───────────────────────────────────────────────────────
function LeaderboardChart() {
  const [period,      setPeriod]      = useState("today");
  const [data,        setData]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/analytics/vehicle-trip-leaderboard", { params: { period, limit: 8 } });
        setData(res.data.leaderboard);
      } catch {
        setError("Could not load leaderboard.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [period]);

  const max = data.length > 0 ? data[0].tripCount : 1;

  const medalColor = (i) => ["#f59e0b", "#94a3b8", "#cd7c3a"][i] ?? null;

  return (
    <div style={s.card}>
      {/* Card header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>🏆</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", fontFamily: "'Sora', sans-serif" }}>
              Vehicle Trip Leaderboard
            </span>
          </div>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
            Ranked by closed trips in the selected period
          </p>
        </div>
        {/* Period toggle */}
        <div style={{ display: "flex", gap: 3, background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
          {PERIODS.map(p => (
            <button key={p.key}
              style={{ ...s.periodBtn, ...(period === p.key ? s.periodBtnActive : {}) }}
              onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div style={s.chartSkeleton}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ ...s.skeletonRow, opacity: 1 - i * 0.15 }}>
              <div style={{ ...s.skeletonPill, width: 28 }} />
              <div style={{ ...s.skeletonPill, width: 90 }} />
              <div style={{ flex: 1, height: 6, background: "#e2e8f0", borderRadius: 99 }} />
              <div style={{ ...s.skeletonPill, width: 32 }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: 32, color: "#ef4444", fontSize: 13 }}>{error}</div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🚫</div>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>No closed trips found for this period.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.map((row, i) => {
            const medal = medalColor(i);
            const barColor = i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#cd7c3a" : "#6366f1";
            return (
              <div key={row.vehicleId} style={s.leaderRow}>
                {/* Rank */}
                <div style={{ ...s.rankBadge, ...(medal ? { background: medal + "22", color: medal } : {}) }}>
                  {medal ? ["🥇","🥈","🥉"][i] : `#${i+1}`}
                </div>
                {/* Vehicle info */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 130, flex: "0 0 auto" }}>
                  <span style={{ fontSize: 16 }}>{VEHICLE_ICONS[row.typeOfVehicle] ?? "🚗"}</span>
                  <div>
                    <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 12, color: "#0f172a", letterSpacing: "0.04em" }}>
                      {row.vehicleNumber}
                    </div>
                    {row.factoryName && (
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>{row.factoryName}</div>
                    )}
                  </div>
                </div>
                {/* Bar */}
                <TripBar count={row.tripCount} max={max} color={barColor} />
                {/* Count badge */}
                <div style={{ ...s.tripCountBadge, background: barColor + "18", color: barColor }}>
                  {row.tripCount} trip{row.tripCount !== 1 ? "s" : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Feature card ───────────────────────────────────────────────────────────
function FeatureCard({ tile, index }) {
  const [hovered, setHovered] = useState(false);
  const route = FEATURE_ROUTES[tile.label];
  const meta  = STATUS_META[tile.status];

  const handleClick = () => {
    window.open(route, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...s.featureCard,
        transform:  hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow:  hovered
          ? "0 8px 28px rgba(99,102,241,0.13), 0 2px 8px rgba(0,0,0,0.06)"
          : "0 1px 4px rgba(0,0,0,0.05)",
        borderColor: hovered ? "#c7d2fe" : "#e5e7eb",
        cursor: "pointer",
        animationDelay: `${index * 60}ms`,
      }}
      title={`Open ${tile.label}`}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 30, lineHeight: 1 }}>{tile.icon}</span>
        <span style={{ ...s.statusChip, background: meta.bg, color: meta.color }}>{meta.label}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginTop: 12, lineHeight: 1.35, fontFamily: "'Sora', sans-serif" }}>
        {tile.label}
      </div>
      <p style={{ fontSize: 12, color: "#6b7280", margin: "6px 0 0", lineHeight: 1.6 }}>
        {tile.desc}
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
        <div style={{ ...s.etaChip }}>
          ETA {tile.eta}
        </div>
        <span style={{ fontSize: 12, color: hovered ? "#6366f1" : "#d1d5db", fontWeight: 600, transition: "color 0.2s" }}>
          Open →
        </span>
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  return (
    <div style={s.page}>

      {/* ── Leaderboard at top ── */}
      <LeaderboardChart />

      {/* ── Hero banner ── */}
      <div style={s.hero}>
        {/* Subtle dot-grid bg */}
        <div style={s.heroDotGrid} />
        <div style={s.heroAccentBlob1} />
        <div style={s.heroAccentBlob2} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={s.heroPill}>
            <span style={s.heroPillDot} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", letterSpacing: .6, textTransform: "uppercase" }}>
              Analytics Dashboard — In Progress
            </span>
          </div>

          <h1 style={s.heroTitle}>
            Powerful Fleet Insights<br />
            <span style={{ color: "#6366f1" }}>coming your way.</span>
          </h1>
          <p style={s.heroSub}>
            We're building a best-in-class analytics layer — live vehicle tracking,
            factory KPIs, compliance reports and route intelligence, all unified.
          </p>

          <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
            <button style={s.heroPrimaryBtn}>🔔 Notify Me</button>
            <button style={s.heroSecondaryBtn}>View Roadmap →</button>
          </div>
        </div>
      </div>

      {/* ── Features grid ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={s.sectionTitle}>What's coming</h2>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>{TILES.length} features planned</span>
        </div>
        <div style={s.featureGrid}>
          {TILES.map((t, i) => <FeatureCard key={t.label} tile={t} index={i} />)}
        </div>
      </div>

      {/* ── Progress ── */}
      <div style={s.progressCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", fontFamily: "'Sora', sans-serif" }}>
              Overall Build Progress
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              Core infrastructure complete · UI components in progress · Analytics engine pending
            </div>
          </div>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#6366f1", fontFamily: "'Sora', sans-serif" }}>32%</span>
        </div>
        <div style={s.progressTrack}>
          <div style={s.progressFill} />
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 14, flexWrap: "wrap" }}>
          {[
            { label: "Infrastructure", pct: 100, color: "#22c55e" },
            { label: "UI Components",  pct: 55,  color: "#6366f1" },
            { label: "Analytics Engine", pct: 10, color: "#f59e0b" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
              <span style={{ color: "#374151", fontWeight: 600 }}>{item.label}</span>
              <span style={{ color: "#94a3b8" }}>{item.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&display=swap');

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .feature-card-enter {
          animation: fadeSlideUp 0.4s ease both;
        }
      `}</style>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = {
  page: {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    background: "#f4f5f7",
    minHeight: "100vh",
    padding: "28px 32px",
    maxWidth: 1100,
    margin: "0 auto",
    boxSizing: "border-box",
  },

  // ── Leaderboard ──
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: "24px 26px",
    marginBottom: 24,
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
  },
  periodBtn: {
    padding: "5px 12px",
    fontSize: 11.5,
    fontWeight: 600,
    border: "none",
    borderRadius: 6,
    background: "transparent",
    color: "#6b7280",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.15s",
  },
  periodBtnActive: {
    background: "#fff",
    color: "#0f172a",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
  },
  leaderRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "8px 10px",
    borderRadius: 10,
    transition: "background 0.15s",
    cursor: "default",
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: "#f1f5f9",
    color: "#6b7280",
    fontSize: 12,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tripCountBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 9px",
    borderRadius: 20,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  chartSkeleton: { display: "flex", flexDirection: "column", gap: 10 },
  skeletonRow: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "8px 10px",
  },
  skeletonPill: {
    height: 14, borderRadius: 6, background: "#e2e8f0", flexShrink: 0,
  },

  // ── Hero ──
  hero: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    padding: "44px 48px",
    marginBottom: 24,
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 2px 20px rgba(0,0,0,0.04)",
  },
  heroDotGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage: "radial-gradient(circle, #e5e7eb 1px, transparent 1px)",
    backgroundSize: "20px 20px",
    opacity: 0.6,
    pointerEvents: "none",
  },
  heroAccentBlob1: {
    position: "absolute",
    top: -80, right: -80, width: 300, height: 300,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  heroAccentBlob2: {
    position: "absolute",
    bottom: -60, left: 60, width: 200, height: 200,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  heroPill: {
    display: "inline-flex", alignItems: "center", gap: 8,
    background: "#ede9fe",
    border: "1px solid #c4b5fd",
    borderRadius: 20, padding: "5px 14px", marginBottom: 20,
  },
  heroPillDot: {
    width: 7, height: 7, borderRadius: "50%", background: "#6366f1", display: "inline-block",
  },
  heroTitle: {
    fontFamily: "'Sora', 'DM Sans', sans-serif",
    fontSize: "clamp(24px, 3vw, 34px)",
    fontWeight: 800,
    color: "#0f172a",
    margin: "0 0 12px",
    lineHeight: 1.2,
    letterSpacing: "-0.5px",
  },
  heroSub: {
    fontSize: 15,
    color: "#6b7280",
    maxWidth: 500,
    lineHeight: 1.7,
    margin: 0,
  },
  heroPrimaryBtn: {
    background: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "11px 22px",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
    transition: "transform 0.15s, box-shadow 0.15s",
  },
  heroSecondaryBtn: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "11px 22px",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    color: "#374151",
    transition: "border-color 0.15s",
  },

  // ── Feature grid ──
  sectionTitle: {
    fontSize: 11,
    fontWeight: 800,
    color: "#6b7280",
    letterSpacing: 1,
    textTransform: "uppercase",
    margin: 0,
  },
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 14,
    marginBottom: 24,
  },
  featureCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "20px 22px",
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
    animation: "fadeSlideUp 0.4s ease both",
    userSelect: "none",
  },
  statusChip: {
    fontSize: 10,
    fontWeight: 700,
    padding: "3px 9px",
    borderRadius: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    flexShrink: 0,
  },
  etaChip: {
    display: "inline-flex",
    alignItems: "center",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 6,
    padding: "3px 9px",
    fontSize: 11,
    fontWeight: 700,
    color: "#15803d",
  },

  // ── Progress card ──
  progressCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: "22px 26px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    marginBottom: 8,
  },
  progressTrack: {
    background: "#f1f5f9",
    borderRadius: 8,
    height: 8,
    overflow: "hidden",
  },
  progressFill: {
    width: "32%",
    height: "100%",
    background: "linear-gradient(90deg, #6366f1, #818cf8)",
    borderRadius: 8,
    transition: "width 1s ease",
  },
};