// analytics/VehicleAnalyticsDashboard.jsx
// ── Main page ─────────────────────────────────────────────────────────────────
// Composes all 5 sections. Drop this inside your router at:
//   /admin/analytics/vehicle-trends   (or any path you prefer)
//
// Usage:
//   import VehicleAnalyticsDashboard from "./analytics/VehicleAnalyticsDashboard";
//   <Route path="/admin/analytics/vehicle-trends" element={<VehicleAnalyticsDashboard />} />

import { useState, useEffect, useRef } from "react";
import FleetOverviewSection    from "../../components/Analytics/FleetOverviewSection.jsx";
import AvgTripsPerDaySection   from "../../components/Analytics/AvgTripsPerDaySection.jsx";
import TopPerformersSection    from "../../components/Analytics/TopPerformersSection.jsx";
import TimeAnalysisSection     from "../../components/Analytics/TimeAnalysisSection.jsx";
import TransporterVisitsSection from "../../components/Analytics/TransporterVisitsSection.jsx";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) => d.toISOString().split("T")[0];
const today = () => fmt(new Date());
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };

// Default: last 21 days
const DEFAULT_START = daysAgo(21);
const DEFAULT_END   = today();

// ── Live clock ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#94a3b8", letterSpacing: "0.04em" }}>
      {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}

// ── Shift toggle ──────────────────────────────────────────────────────────────
function ShiftToggle({ value, onChange }) {
  const opts = [
    { key: "all",   label: "All",   icon: "◎" },
    { key: "day",   label: "Day",   icon: "☀️" },
    { key: "night", label: "Night", icon: "🌙" },
  ];
  return (
    <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 8, padding: 3, gap: 2 }}>
      {opts.map(o => (
        <button key={o.key}
          style={{
            padding: "5px 12px",
            borderRadius: 6,
            border: "none",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            background: value === o.key ? "#fff" : "transparent",
            color: value === o.key ? "#0f172a" : "#6b7280",
            boxShadow: value === o.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            transition: "all 0.15s",
          }}
          onClick={() => onChange(o.key)}>
          {o.icon} {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Date range quick-pick ─────────────────────────────────────────────────────
const QUICK_RANGES = [
  { label: "7D",  days: 7  },
  { label: "21D", days: 21 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

// ── Main dashboard ─────────────────────────────────────────────────────────────
export default function VehicleAnalyticsDashboard() {
  const [startDate,  setStartDate]  = useState(DEFAULT_START);
  const [endDate,    setEndDate]    = useState(DEFAULT_END);
  const [shift,      setShift]      = useState("all");
  const [vehicle,    setVehicle]    = useState("");
  const [lastRefresh,setLastRefresh]= useState(new Date());
  const [activeQuick,setActiveQuick]= useState("21D");

  // Params passed down to every section
  const params = {
    startDate,
    endDate,
    ...(shift   !== "all" ? { shift }   : {}),
    ...(vehicle.trim()    ? { vehicle } : {}),
  };

  const handleQuickRange = (days, label) => {
    setStartDate(daysAgo(days));
    setEndDate(today());
    setActiveQuick(label);
  };

  const handleGenerate = () => {
    setLastRefresh(new Date());
    // Sections re-fetch automatically because params change causes effect re-run
    // Force a tiny state bump so even same-param re-fetches work
    setLastRefresh(new Date());
  };

  // Scroll-to-section refs
  const refs = {
    overview:     useRef(null),
    avgTrips:     useRef(null),
    topPerformers:useRef(null),
    timeAnalysis: useRef(null),
    transporter:  useRef(null),
  };

  const scrollTo = (key) => refs[key]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div style={s.page}>

      {/* ── Sticky top header ── */}
      <div style={s.topBar}>
        <div style={s.topLeft}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🚛</span>
            <div>
              <div style={s.topTitle}>Internal Vehicle Trend Analysis</div>
              <div style={s.topSub}>Daily Trip Count Per Vehicle — Plant to Plant & Customer Delivery</div>
            </div>
          </div>
          <div style={s.liveBadge}>
            <div style={s.liveDot} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#15803d" }}>LIVE</span>
            <span style={{ color: "#d1d5db", margin: "0 4px" }}>·</span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>Last refreshed</span>
            <LiveClock />
          </div>
        </div>

        {/* Controls */}
        <div style={s.controls}>
          <div style={s.controlGroup}>
            <label style={s.controlLabel}>Start Date</label>
            <input type="date" value={startDate} max={endDate}
              onChange={e => { setStartDate(e.target.value); setActiveQuick(""); }}
              style={s.dateInput} />
          </div>
          <div style={s.controlGroup}>
            <label style={s.controlLabel}>End Date</label>
            <input type="date" value={endDate} min={startDate} max={today()}
              onChange={e => { setEndDate(e.target.value); setActiveQuick(""); }}
              style={s.dateInput} />
          </div>
          <div style={s.controlGroup}>
            <label style={s.controlLabel}>Vehicle (optional)</label>
            <input type="text" value={vehicle}
              onChange={e => setVehicle(e.target.value.toUpperCase())}
              placeholder="MH12AB1234"
              style={{ ...s.dateInput, width: 120, textTransform: "uppercase" }} />
          </div>
          <div style={s.controlGroup}>
            <label style={s.controlLabel}>Shift</label>
            <ShiftToggle value={shift} onChange={setShift} />
          </div>
          <button style={s.generateBtn} onClick={handleGenerate}>
            📋 Generate Report
          </button>
        </div>
      </div>

      {/* ── Quick range pills ── */}
      <div style={s.quickRow}>
        <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Quick:</span>
        {QUICK_RANGES.map(r => (
          <button key={r.label}
            style={{ ...s.quickBtn, ...(activeQuick === r.label ? s.quickBtnActive : {}) }}
            onClick={() => handleQuickRange(r.days, r.label)}>
            {r.label}
          </button>
        ))}
        {/* Jump-to nav */}
        <div style={s.navDivider} />
        {[
          { key: "overview",      label: "🚛 Fleet Overview" },
          { key: "avgTrips",      label: "⚡ Avg Trips/Day" },
          { key: "topPerformers", label: "🏆 Top Performers" },
          { key: "timeAnalysis",  label: "📅 Time Analysis" },
          { key: "transporter",   label: "🏪 Transporter" },
        ].map(n => (
          <button key={n.key} style={s.navBtn} onClick={() => scrollTo(n.key)}>
            {n.label}
          </button>
        ))}
      </div>

      {/* ── Sections ── */}
      <div ref={refs.overview}>
        <FleetOverviewSection params={params} key={`overview-${JSON.stringify(params)}`} />
      </div>

      <div ref={refs.avgTrips}>
        <AvgTripsPerDaySection params={params} key={`avg-${JSON.stringify(params)}`} />
      </div>

      <div ref={refs.topPerformers}>
        <TopPerformersSection params={params} key={`top-${JSON.stringify(params)}`} />
      </div>

      <div ref={refs.timeAnalysis}>
        <TimeAnalysisSection params={params} key={`time-${JSON.stringify(params)}`} />
      </div>

      <div ref={refs.transporter}>
        <TransporterVisitsSection params={params} key={`transporter-${JSON.stringify(params)}`} />
      </div>

      {/* Bottom spacer */}
      <div style={{ height: 40 }} />

      {/* Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; }

        @media (max-width: 900px) {
          .analytics-topbar-controls { flex-wrap: wrap !important; }
          .analytics-kpi-strip { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .analytics-kpi-strip { grid-template-columns: 1fr !important; }
          .analytics-chart-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = {
  page: {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    background: "#f4f6f9",
    minHeight: "100vh",
    padding: "0",
  },

  // ── Top bar ──
  topBar: {
    background: "#fff",
    borderBottom: "1px solid #e8edf3",
    padding: "14px 28px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 14,
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 2px 12px rgba(15,23,42,0.06)",
  },
  topLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: "#0f172a",
    fontFamily: "'Sora', sans-serif",
    letterSpacing: "-0.3px",
  },
  topSub: {
    fontSize: 11,
    color: "#94a3b8",
  },
  liveBadge: {
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#22c55e",
    boxShadow: "0 0 0 2px #dcfce7",
    animation: "pulse 2s infinite",
  },
  controls: {
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  },
  controlGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  controlLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "#94a3b8",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  dateInput: {
    padding: "7px 10px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    fontSize: 12,
    background: "#f9fafb",
    color: "#0f172a",
    outline: "none",
    fontFamily: "'DM Mono', monospace",
  },
  generateBtn: {
    padding: "8px 18px",
    background: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 3px 12px rgba(99,102,241,0.3)",
    whiteSpace: "nowrap",
    letterSpacing: "0.01em",
    alignSelf: "flex-end",
  },

  // ── Quick range row ──
  quickRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 28px",
    background: "#fff",
    borderBottom: "1px solid #f1f5f9",
    flexWrap: "wrap",
  },
  quickBtn: {
    padding: "4px 10px",
    borderRadius: 6,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    color: "#6b7280",
    transition: "all 0.15s",
  },
  quickBtnActive: {
    background: "#6366f1",
    color: "#fff",
    border: "1px solid #6366f1",
  },
  navDivider: {
    width: 1,
    height: 18,
    background: "#e5e7eb",
    margin: "0 4px",
  },
  navBtn: {
    padding: "4px 10px",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    color: "#6366f1",
    transition: "background 0.15s",
  },
};