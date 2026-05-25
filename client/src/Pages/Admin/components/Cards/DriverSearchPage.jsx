// DriverSearchPage.jsx
// Standalone page — search driver by name / mobile / license number
// Shows driver card + period stats + recent trip timeline
// Uses Ant Design for DatePicker + Input only; rest is custom styled

import { useState, useRef } from "react";
import { DatePicker, Input } from "antd";
import dayjs from "dayjs";
import api from "../../../../../services/API/Api/api"; // adjust path

const { RangePicker } = DatePicker;

// ── Colour palette (matches dashboard theme) ──────────────────────────────────
const C = {
  teal:       "#0d9488",
  tealLight:  "#ccfbf1",
  tealMid:    "#5eead4",
  slate:      "#94a3b8",
  slateLight: "#e2e8f0",
  red:        "#fca5a5",
  redDark:    "#ef4444",
  yellow:     "#eab308",
  yellowLight:"#fef9c3",
  bg:         "#f8fafc",
  card:       "#ffffff",
  border:     "#e5e7eb",
  text:       "#0f172a",
  muted:      "#64748b",
  micro:      "#94a3b8",
};

// ── Trip state config ─────────────────────────────────────────────────────────
const TRIP_STATE = {
  CLOSED:    { label: "Closed",    color: C.teal,    bg: C.tealLight,   border: C.tealMid   },
  CANCELLED: { label: "Cancelled", color: "#ef4444", bg: "#fee2e2",     border: "#fca5a5"   },
  ACTIVE:    { label: "Active",    color: "#eab308", bg: "#fef9c3",     border: "#fde047"   },
  COMPLETED: { label: "In Progress",color:"#6366f1", bg: "#ede9fe",     border: "#c4b5fd"   },
};

const TRIP_TYPE = {
  internal_transfer: { label: "Internal",  color: C.teal   },
  external_delivery: { label: "External",  color: "#6366f1" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const rateColor = (p) => p >= 80 ? C.teal : p >= 50 ? C.yellow : "#ef4444";
const rateBg    = (p) => p >= 80 ? C.tealLight : p >= 50 ? C.yellowLight : "#fee2e2";

const fmt = (d) => d
  ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  : "—";

const fmtTime = (d) => d
  ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  : "";

const formatDuration = (start, end) => {
    if (!start || !end) return "—";

    const ms = new Date(end) - new Date(start);

    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) {
        return `${minutes} min`;
    }

    if (hours < 24) {
        const remainingMin = minutes % 60;

        return remainingMin
        ? `${hours}h ${remainingMin}m`
        : `${hours}h`;
    }

    const remainingHours = hours % 24;

    return remainingHours
        ? `${days}d ${remainingHours}h`
        : `${days}d`;
};
// ── Sub-components ────────────────────────────────────────────────────────────

function StatPill({ label, value, color, bg, border }) {
  return (
    <div style={{
      background: bg, border: `1px solid ${border}`,
      borderRadius: 10, padding: "10px 14px", textAlign: "center", flex: 1, minWidth: 70,
    }}>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color,
        fontFamily: "'DM Sans', sans-serif", lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between",
        fontSize: 11, marginBottom: 3 }}>
        <span style={{ fontWeight: 600, color: C.muted }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ height: 5, background: C.slateLight, borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color,
          borderRadius: 99, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

function TripStateTag({ state }) {
  const cfg = TRIP_STATE[state] ?? { label: state, color: C.muted, bg: "#f8fafc", border: C.border };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px",
      borderRadius: 20, border: `1px solid ${cfg.border}`,
      background: cfg.bg, color: cfg.color, whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
}

function TypeTag({ type }) {
  const cfg = TRIP_TYPE[type] ?? { label: type, color: C.muted };
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 44 }) {
  const hue = name ? (name.charCodeAt(0) * 37) % 360 : 200;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `hsl(${hue}, 55%, 88%)`,
      color: `hsl(${hue}, 45%, 32%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 800, flexShrink: 0,
      fontFamily: "'DM Sans', sans-serif",
      border: `2px solid hsl(${hue}, 45%, 78%)`,
    }}>
      {(name ?? "?").charAt(0).toUpperCase()}
    </div>
  );
}

// ── Trip timeline row ─────────────────────────────────────────────────────────
function TripRow({ trip, idx }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderBottom: `1px solid ${C.border}`,
      background: open ? "#f8fafc" : "transparent",
      transition: "background 0.15s",
    }}>
      {/* summary row */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10,
          padding: "9px 14px", cursor: "pointer", flexWrap: "wrap" }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = "#f8fafc"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        {/* index dot */}
        <div style={{ width: 22, height: 22, borderRadius: "50%",
          background: C.slateLight, color: C.muted,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
          {idx + 1}
        </div>
        {/* date */}
        <span style={{ fontSize: 11, color: C.muted, minWidth: 90 }}>
          {fmt(trip.createdAt)}
        </span>
        {/* type */}
        <TypeTag type={trip.type} />
        {/* state */}
        <TripStateTag state={trip.tripState} />
        {/* spacer */}
        <span style={{ flex: 1 }} />
        {/* expand */}
        <span style={{ fontSize: 11, color: C.micro }}>{open ? "▲" : "▼"}</span>
      </div>

      {/* expanded detail */}
      {open && (
        <div style={{ padding: "0 14px 12px 46px", display: "flex", flexWrap: "wrap", gap: 16 }}>
          {[
            { label: "Started",   value: trip.startedAt   ? `${fmt(trip.startedAt)} ${fmtTime(trip.startedAt)}`   : "—" },
            { label: "Completed", value: trip.completedAt ? `${fmt(trip.completedAt)} ${fmtTime(trip.completedAt)}` : "—" },
            { label: "Duration", value: formatDuration(trip.startedAt, trip.completedAt)},
            { label: "From", value: typeof trip.externalSource === "string" && trip.externalSource.trim() ? trip.externalSource : trip.sourceFactory?.name || "—"},
            { label: "To", value: typeof trip.externalDestination === "string" && trip.externalDestination.trim() ? trip.externalDestination : trip.destinationFactory?.name || "—"},
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: 9, color: C.micro, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Driver card ───────────────────────────────────────────────────────────────
function DriverCard({ driver }) {
  const [showTrips, setShowTrips] = useState(false);
  const ps = driver.periodStats;
  const ls = driver.lifetimeStats;
  const maxVal = Math.max(ps.completed, ps.cancelled, ps.active, 1);

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      overflow: "hidden",
    }}>
      {/* ── top strip ── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.teal}18 0%, ${C.tealLight} 100%)`,
        borderBottom: `1px solid ${C.tealMid}`,
        padding: "16px 18px",
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      }}>
        <Avatar name={driver.driverName} size={48} />
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text,
            fontFamily: "'DM Sans', sans-serif" }}>
            {driver.driverName}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span><i className="ri-phone-fill text-md text-blue-600"></i> {driver.driverContact}</span>
            <span><i className="ri-id-card-fill text-md text-blue-600"></i> {driver.licenseNumber}</span>
          </div>
        </div>
        {/* status badges */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
            background: driver.hasActiveTrip ? "#fef9c3" : "#f1f5f9",
            border: `1px solid ${driver.hasActiveTrip ? "#fde047" : C.border}`,
            color: driver.hasActiveTrip ? "#854d0e" : C.muted,
          }}>
            {driver.hasActiveTrip ? "🟡 On Trip" : "⚪ Available"}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
            background: driver.isAssigned ? C.tealLight : "#f1f5f9",
            border: `1px solid ${driver.isAssigned ? C.tealMid : C.border}`,
            color: driver.isAssigned ? C.teal : C.muted,
          }}>
            {driver.isAssigned ? "🚛 Assigned" : "— Unassigned"}
          </span>
        </div>
      </div>

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* ── ID details row ── */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "ID Type",   value: driver.driverIdType   },
            { label: "ID Number", value: driver.driverIdNumber },
            { label: "Lifetime Trips", value: ls.totalTrips    },
          ].map(item => (
            <div key={item.label} style={{
              background: "#f8fafc", border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "7px 12px", flex: 1, minWidth: 100,
            }}>
              <div style={{ fontSize: 9, color: C.micro, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* ── Period KPI pills ── */}
        <div>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            Period Stats
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatPill label="Total"     value={ps.total}     color={C.text}      bg="#f8fafc"       border={C.border}    />
            <StatPill label="Completed" value={ps.completed} color={C.teal}      bg={C.tealLight}   border={C.tealMid}   />
            <StatPill label="Cancelled" value={ps.cancelled} color="#ef4444"     bg="#fee2e2"        border="#fca5a5"     />
            <StatPill label="Active"    value={ps.active}    color={C.yellow}    bg={C.yellowLight}  border="#fde047"     />
          </div>
        </div>

        {/* ── Mini bars ── */}
        <div>
          <MiniBar label="Completed" value={ps.completed} max={maxVal} color={C.teal}     />
          <MiniBar label="Cancelled" value={ps.cancelled} max={maxVal} color="#ef4444"    />
          <MiniBar label="Active"    value={ps.active}    max={maxVal} color={C.yellow}   />
        </div>

        {/* ── Completion rate ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, flexShrink: 0 }}>
            Completion Rate
          </span>
          <div style={{ flex: 1, height: 7, background: C.slateLight, borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              width: `${ps.completionRate}%`, height: "100%",
              background: rateColor(ps.completionRate), borderRadius: 99,
              transition: "width 1s ease",
            }} />
          </div>
          <span style={{
            fontSize: 13, fontWeight: 800, minWidth: 42, textAlign: "right",
            color: rateColor(ps.completionRate),
            background: rateBg(ps.completionRate),
            borderRadius: 7, padding: "2px 8px",
          }}>
            {ps.completionRate}%
          </span>
        </div>

        {/* ── Trip timeline toggle ── */}
        {driver.recentTrips.length > 0 && (
          <div>
            <button
              onClick={() => setShowTrips(o => !o)}
              style={{
                width: "100%",
                background: showTrips ? C.tealLight : "#f8fafc",
                border: `1px solid ${showTrips ? C.tealMid : C.border}`,
                borderRadius: 8, padding: "8px 14px",
                fontSize: 12, fontWeight: 700,
                color: showTrips ? C.teal : C.muted,
                cursor: "pointer", textAlign: "left",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}
            >
              <span>📋 Trip History ({driver.recentTrips.length} trips)</span>
              <span style={{ fontSize: 11 }}>{showTrips ? "Hide ▲" : "Show ▼"}</span>
            </button>

            {showTrips && (
              <div style={{
                marginTop: 8, borderRadius: 10,
                border: `1px solid ${C.border}`, overflow: "hidden",
              }}>
                {/* table header */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "7px 14px",
                  background: "#f8fafc",
                  borderBottom: `1px solid ${C.border}`,
                  fontSize: 9, fontWeight: 700, color: C.muted,
                  textTransform: "uppercase", letterSpacing: 0.5,
                }}>
                  <span style={{ width: 22 }}>#</span>
                  <span style={{ minWidth: 90 }}>Date</span>
                  <span style={{ minWidth: 60 }}>Type</span>
                  <span>State</span>
                  <span style={{ flex: 1 }} />
                </div>
                {driver.recentTrips.map((trip, i) => (
                  <TripRow key={String(trip.tripId)} trip={trip} idx={i} />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ── Empty / no result state ───────────────────────────────────────────────────
function EmptyState({ searched }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>
        {searched ? "🔍" : ""}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>
        {searched ? "No drivers found" : "Search for a driver"}
      </div>
      <div style={{ fontSize: 12, maxWidth: 300, margin: "0 auto", lineHeight: 1.7 }}>
        {searched
          ? "Try a different name, mobile number, or license number."
          : "Enter a driver name, mobile number, or license number to view their trip analytics."}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function DriverSearchPage() {
  const [query,      setQuery]      = useState("");
  const [dateRange,  setDateRange]  = useState([
    dayjs().subtract(30, "day").startOf("day"),
    dayjs().endOf("day"),
  ]);
  const [results,    setResults]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [searched,   setSearched]   = useState(false);
  const inputRef = useRef(null);

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(""); setSearched(true);
    try {
      const params = {
        q:         query.trim(),
        startDate: dateRange[0]?.toISOString(),
        endDate:   dateRange[1]?.toISOString(),
      };
      const res = await api.get("/analytics/driver-search", { params });
      setResults(res.data.drivers ?? []);
      console.log("Search results:", res.data);
    } catch (e) {
      setError("Failed to search. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") doSearch(); };

  const clearSearch = () => {
    setQuery(""); setResults(null);
    setSearched(false); setError("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div style={{
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: C.bg, minHeight: "100vh",
      padding: "20px 20px", boxSizing: "border-box",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
        .driver-search-input .ant-input { font-family: 'DM Sans', sans-serif !important; }
        .driver-range-picker .ant-picker-input input { font-family: 'DM Sans', sans-serif !important; }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted,
          textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
          Analytics
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text,
          fontFamily: "'DM Sans', sans-serif" }}>
          Driver Search
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          Search by name, mobile number, or license number · Filter by date range
        </div>
      </div>

      {/* ── Search panel ── */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 14, padding: "18px 20px", marginBottom: 20,
        boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>

          {/* Search input */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted,
              textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Driver / Mobile / License
            </div>
            <Input
              ref={inputRef}
              className="driver-search-input"
              size="large"
              placeholder="e.g. Mukesh, 9876543210, DL-1234567890"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              allowClear
              onClear={clearSearch}
              prefix={<span style={{ color: C.muted, marginRight: 4 }}><i className="ri-search-line"></i></span>}
              style={{ borderRadius: 8, fontSize: 13, borderColor: C.border }}
            />
          </div>

          {/* Date range */}
          <div style={{ minWidth: 260 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted,
              textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Date Range
            </div>
            <RangePicker
              className="driver-range-picker"
              size="large"
              value={dateRange}
              onChange={val => setDateRange(val ?? [dayjs().subtract(30,"day"), dayjs()])}
              style={{ width: "100%", borderRadius: 8, borderColor: C.border }}
              presets={[
                { label: "Today",       value: [dayjs().startOf("day"), dayjs()]                             },
                { label: "Last 7 days", value: [dayjs().subtract(7,"day").startOf("day"), dayjs()]           },
                { label: "Last 30 days",value: [dayjs().subtract(30,"day").startOf("day"), dayjs()]          },
                { label: "This month",  value: [dayjs().startOf("month"), dayjs().endOf("month")]            },
                { label: "Last month",  value: [dayjs().subtract(1,"month").startOf("month"),
                                                dayjs().subtract(1,"month").endOf("month")]                  },
              ]}
            />
          </div>

          {/* Search button */}
          <button
            onClick={doSearch}
            disabled={!query.trim() || loading}
            style={{
              height: 40, padding: "0 24px",
              background: query.trim() && !loading ? C.teal : C.slateLight,
              color:  query.trim() && !loading ? "#fff" : C.muted,
              border: "none", borderRadius: 8,
              fontSize: 13, fontWeight: 700, cursor: query.trim() ? "pointer" : "not-allowed",
              boxShadow: query.trim() ? "0 2px 8px rgba(13,148,136,0.3)" : "none",
              transition: "all 0.2s", whiteSpace: "nowrap",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {loading ? "Searching…" : "Search"}
          </button>

          {/* Clear */}
          {searched && (
            <button onClick={clearSearch} style={{
              height: 40, padding: "0 16px",
              background: "#fff", border: `1px solid ${C.border}`,
              borderRadius: 8, fontSize: 12, fontWeight: 600,
              color: C.muted, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Clear
            </button>
          )}
        </div>

        {/* Active date range badge */}
        {dateRange[0] && dateRange[1] && (
          <div style={{ marginTop: 10, fontSize: 11, color: C.muted }}>
            Showing trips:{" "}
            <span style={{ fontWeight: 700, color: C.teal }}>
              {dateRange[0].format("D MMM YYYY")} → {dateRange[1].format("D MMM YYYY")}
            </span>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5",
          borderRadius: 10, padding: "10px 14px", fontSize: 13,
          color: "#991b1b", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ── Results ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[1,2].map(i => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 14, overflow: "hidden" }}>
              <div style={{ height: 80, background: `${C.teal}10` }} />
              <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                {[140, 200, 100].map((w, j) => (
                  <div key={j} style={{ height: 14, width: w, borderRadius: 6,
                    background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
                    backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                ))}
              </div>
            </div>
          ))}
          <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
        </div>
      ) : results === null ? (
        <EmptyState searched={false} />
      ) : results.length === 0 ? (
        <EmptyState searched={true} />
      ) : (
        <>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, fontWeight: 600 }}>
            {results.length} driver{results.length !== 1 ? "s" : ""} found for "{query}"
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {results.map(driver => (
              <DriverCard key={String(driver.driverId)} driver={driver} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}