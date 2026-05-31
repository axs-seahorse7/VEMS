// SearchPage.jsx  — Driver + Vehicle unified search
// Segment slider toggles between modes.
// Ant Design: Input, DatePicker only. Rest: custom CSS.

import { useState, useRef } from "react";
import { DatePicker, Input } from "antd";
import dayjs from "dayjs";
import api from "../../../../../services/API/Api/api"; // adjust path

const { RangePicker } = DatePicker;

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  teal:        "#0d9488",
  tealLight:   "#ccfbf1",
  tealMid:     "#5eead4",
  indigo:      "#6366f1",
  indigoLight: "#ede9fe",
  indigoMid:   "#a5b4fc",
  slate:       "#94a3b8",
  slateLight:  "#e2e8f0",
  red:         "#ef4444",
  redLight:    "#fee2e2",
  redMid:      "#fca5a5",
  yellow:      "#eab308",
  yellowLight: "#fef9c3",
  bg:          "#f8fafc",
  card:        "#ffffff",
  border:      "#e5e7eb",
  text:        "#0f172a",
  muted:       "#64748b",
  micro:       "#94a3b8",
};

// ─── Config ───────────────────────────────────────────────────────────────────
const TRIP_STATE = {
  CLOSED:    { label: "Closed",      color: C.teal,   bg: C.tealLight,   border: C.tealMid   },
  CANCELLED: { label: "Cancelled",   color: C.red,    bg: C.redLight,    border: C.redMid    },
  ACTIVE:    { label: "Active",      color: C.yellow, bg: C.yellowLight, border: "#fde047"   },
  COMPLETED: { label: "In Progress", color: C.indigo, bg: C.indigoLight, border: C.indigoMid },
};
const TRIP_TYPE = {
  internal_transfer: { label: "Internal", color: C.teal   },
  external_delivery: { label: "External", color: C.indigo },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rateColor = p => p >= 80 ? C.teal : p >= 50 ? C.yellow : C.red;
const rateBg    = p => p >= 80 ? C.tealLight : p >= 50 ? C.yellowLight : C.redLight;

const fmt = d => d
  ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  : "—";
const fmtTime = d => d
  ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  : "";

const formatDuration = (start, end) => {
  if (!start || !end) return "—";
  const ms   = new Date(end) - new Date(start);
  const min  = Math.floor(ms / 60000);
  const hrs  = Math.floor(min / 60);
  const days = Math.floor(hrs / 24);
  if (min < 60)  return `${min}m`;
  if (hrs < 24)  return min % 60 ? `${hrs}h ${min % 60}m` : `${hrs}h`;
  return hrs % 24 ? `${days}d ${hrs % 24}h` : `${days}d`;
};

// ─── Micro UI Atoms ───────────────────────────────────────────────────────────
function StatPill({ label, value, color, bg, border }) {
  return (
    <div style={{
      background: bg, border: `1px solid ${border}`,
      borderRadius: 10, padding: "10px 14px",
      textAlign: "center", flex: 1, minWidth: 70,
    }}>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>
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
  const cfg = TRIP_STATE[state] ?? { label: state, color: C.muted, bg: C.bg, border: C.border };
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
  return <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>;
}

function Avatar({ name, size = 44, shape = "circle" }) {
  const hue = name ? (name.charCodeAt(0) * 37) % 360 : 200;
  return (
    <div style={{
      width: size, height: size,
      borderRadius: shape === "circle" ? "50%" : 12,
      background: `hsl(${hue}, 55%, 88%)`,
      color: `hsl(${hue}, 45%, 32%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 800, flexShrink: 0,
      border: `2px solid hsl(${hue}, 45%, 78%)`,
    }}>
      {(name ?? "?").charAt(0).toUpperCase()}
    </div>
  );
}

function InfoChip({ icon, text }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, color: C.muted, fontWeight: 500 }}>
      <i className={`ri-${icon}`} style={{ color: "#3b82f6", fontSize: 13 }}></i>
      {text}
    </span>
  );
}

function Badge({ label, active, activeColor, activeText, activeBorder, activeBg }) {
  return active ? (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
      background: activeBg, border: `1px solid ${activeBorder}`, color: activeText,
    }}>
      {label}
    </span>
  ) : (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
      background: "#f1f5f9", border: `1px solid ${C.border}`, color: C.muted,
    }}>
      {label}
    </span>
  );
}

// ─── Trip Row (shared between driver & vehicle cards) ─────────────────────────
function TripRow({ trip, idx, showDriver, showVehicle }) {
  const [open, setOpen] = useState(false);
  const from = typeof trip.externalSource === "string" && trip.externalSource.trim()
    ? trip.externalSource
    : trip.sourceFactory?.name || "—";
  const to = typeof trip.externalDestination === "string" && trip.externalDestination.trim()
    ? trip.externalDestination
    : trip.destinationFactory?.name || "—";

  return (
    <div style={{
      borderBottom: `1px solid ${C.border}`,
      background: open ? "#f8fafc" : "transparent",
      transition: "background 0.15s",
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10,
          padding: "9px 14px", cursor: "pointer", flexWrap: "wrap" }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = "#f8fafc"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: C.slateLight, color: C.muted,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 700, flexShrink: 0,
        }}>
          {idx + 1}
        </div>
        <span style={{ fontSize: 11, color: C.muted, minWidth: 90 }}>{fmt(trip.createdAt)}</span>
        <TypeTag type={trip.type} />
        {/* route preview */}
        <span style={{ fontSize: 11, color: C.text, fontWeight: 600,
          flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          minWidth: 80 }}>
          {from} → {to}
        </span>
        <TripStateTag state={trip.tripState} />
        <span style={{ fontSize: 11, color: C.micro }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ padding: "0 14px 14px 46px", display: "flex", flexWrap: "wrap", gap: 16 }}>
          {[
            { label: "Started",   value: trip.createdAt   ? `${fmt(trip.createdAt)} ${fmtTime(trip.createdAt)}`     : "—" },
            { label: "Completed", value: trip.completedAt ? `${fmt(trip.completedAt)} ${fmtTime(trip.completedAt)}` : "—" },
            { label: "Duration",  value: formatDuration(trip.createdAt, trip.completedAt) },
            { label: "From",      value: from },
            { label: "To",        value: to   },
            ...(showDriver && trip.driver?.driverName
              ? [{ label: "Driver", value: `${trip.driver.driverName} · ${trip.driver.driverContact ?? ""}` }]
              : []),
            ...(showVehicle && trip.vehicleNumber
              ? [{ label: "Vehicle", value: trip.vehicleNumber }]
              : []),
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

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, color: C.muted, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
      {children}
    </div>
  );
}

// ─── Trip History Panel ───────────────────────────────────────────────────────
function TripHistoryPanel({ trips, showDriver, showVehicle, accentColor, accentLight, accentMid }) {
  const [open, setOpen] = useState(false);
  if (!trips.length) return null;
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          background: open ? accentLight : "#f8fafc",
          border: `1px solid ${open ? accentMid : C.border}`,
          borderRadius: 8, padding: "8px 14px",
          fontSize: 12, fontWeight: 700,
          color: open ? accentColor : C.muted,
          cursor: "pointer", textAlign: "left",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}
      >
        <span>📋 Trip History ({trips.length} trips)</span>
        <span style={{ fontSize: 11 }}>{open ? "Hide ▲" : "Show ▼"}</span>
      </button>
      {open && (
        <div style={{ marginTop: 8, borderRadius: 10,
          border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "7px 14px", background: "#f8fafc",
            borderBottom: `1px solid ${C.border}`,
            fontSize: 9, fontWeight: 700, color: C.muted,
            textTransform: "uppercase", letterSpacing: 0.5,
          }}>
            <span style={{ width: 22 }}>#</span>
            <span style={{ minWidth: 90 }}>Date</span>
            <span style={{ minWidth: 60 }}>Type</span>
            <span style={{ flex: 1 }}>Route</span>
            <span>State</span>
          </div>
          {trips.map((trip, i) => (
            <TripRow
              key={String(trip.tripId)}
              trip={trip}
              idx={i}
              showDriver={showDriver}
              showVehicle={showVehicle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Completion Rate Bar ──────────────────────────────────────────────────────
function CompletionRate({ rate }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, flexShrink: 0 }}>
        Completion Rate
      </span>
      <div style={{ flex: 1, height: 7, background: C.slateLight, borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          width: `${rate}%`, height: "100%",
          background: rateColor(rate), borderRadius: 99,
          transition: "width 1s ease",
        }} />
      </div>
      <span style={{
        fontSize: 13, fontWeight: 800, minWidth: 42, textAlign: "right",
        color: rateColor(rate), background: rateBg(rate),
        borderRadius: 7, padding: "2px 8px",
      }}>
        {rate}%
      </span>
    </div>
  );
}

// ─── Period Stats Row ─────────────────────────────────────────────────────────
function PeriodStats({ ps }) {
  const maxVal = Math.max(ps.completed, ps.cancelled, ps.active, 1);
  return (
    <>
      <div>
        <SectionLabel>Period Stats</SectionLabel>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <StatPill label="Total"     value={ps.total}     color={C.text}   bg="#f8fafc"       border={C.border}   />
          <StatPill label="Completed" value={ps.completed} color={C.teal}   bg={C.tealLight}   border={C.tealMid}  />
          <StatPill label="Cancelled" value={ps.cancelled} color={C.red}    bg={C.redLight}    border={C.redMid}   />
          <StatPill label="Active"    value={ps.active}    color={C.yellow} bg={C.yellowLight} border="#fde047"    />
        </div>
      </div>
      <div>
        <MiniBar label="Completed" value={ps.completed} max={maxVal} color={C.teal}   />
        <MiniBar label="Cancelled" value={ps.cancelled} max={maxVal} color={C.red}    />
        <MiniBar label="Active"    value={ps.active}    max={maxVal} color={C.yellow} />
      </div>
      <CompletionRate rate={ps.completionRate} />
    </>
  );
}

// ─── Driver Card ──────────────────────────────────────────────────────────────
function DriverCard({ driver }) {
  const ps = driver.periodStats;
  const ls = driver.lifetimeStats;
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.05)", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.teal}18 0%, ${C.tealLight} 100%)`,
        borderBottom: `1px solid ${C.tealMid}`,
        padding: "16px 18px",
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      }}>
        <Avatar name={driver.driverName} size={48} shape="circle" />
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{driver.driverName}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <InfoChip icon="phone-fill"   text={driver.driverContact} />
            <InfoChip icon="id-card-fill" text={driver.licenseNumber} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Badge
            label={driver.hasActiveTrip ? "🟡 On Trip" : "⚪ Available"}
            active={driver.hasActiveTrip}
            activeText="#854d0e" activeBg={C.yellowLight} activeBorder="#fde047"
          />
          <Badge
            label={driver.isAssigned ? "🚛 Assigned" : "— Unassigned"}
            active={driver.isAssigned}
            activeText={C.teal} activeBg={C.tealLight} activeBorder={C.tealMid}
          />
        </div>
      </div>

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* ID details */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "ID Type",       value: driver.driverIdType   },
            { label: "ID Number",     value: driver.driverIdNumber },
            { label: "Lifetime Trips",value: ls.totalTrips         },
          ].map(item => (
            <div key={item.label} style={{
              background: "#f8fafc", border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "7px 12px", flex: 1, minWidth: 100,
            }}>
              <div style={{ fontSize: 9, color: C.micro, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.value ?? "—"}</div>
            </div>
          ))}
        </div>

        <PeriodStats ps={ps} />

        <TripHistoryPanel
          trips={driver.recentTrips}
          showDriver={false}
          showVehicle={true}
          accentColor={C.teal}
          accentLight={C.tealLight}
          accentMid={C.tealMid}
        />
      </div>
    </div>
  );
}

// ─── Vehicle Card ─────────────────────────────────────────────────────────────
function VehicleCard({ vehicle }) {
  const ps = vehicle.periodStats;
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.05)", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.indigo}18 0%, ${C.indigoLight} 100%)`,
        borderBottom: `1px solid ${C.indigoMid}`,
        padding: "16px 18px",
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      }}>
        <Avatar name={vehicle.vehicleNumber} size={48} shape="rounded" />
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, fontFamily: "'DM Mono', monospace" }}>
            {vehicle.vehicleNumber}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <InfoChip icon="truck-fill"     text={vehicle.typeOfVehicle} />
            <InfoChip icon="exchange-funds-fill" text={vehicle.type === "internal" ? "Internal Fleet" : "External"} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Badge
            label={vehicle.hasActiveTrip ? "🟡 On Trip" : "⚪ Available"}
            active={vehicle.hasActiveTrip}
            activeText="#854d0e" activeBg={C.yellowLight} activeBorder="#fde047"
          />
          <Badge
            label={vehicle.isActive ? "✅ Active" : "❌ Inactive"}
            active={vehicle.isActive}
            activeText={C.teal} activeBg={C.tealLight} activeBorder={C.tealMid}
          />
        </div>
      </div>

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Meta chips */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Owner Factory",   value: vehicle.ownerFactory?.name    ?? "—" },
            { label: "Current Location",value: vehicle.currentFactory?.name  ?? "—" },
          ].map(item => (
            <div key={item.label} style={{
              background: "#f8fafc", border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "7px 12px", flex: 1, minWidth: 130,
            }}>
              <div style={{ fontSize: 9, color: C.micro, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Assigned driver */}
        {vehicle.assignedDriver && (
          <div style={{
            background: `${C.indigo}08`,
            border: `1px solid ${C.indigoMid}`,
            borderRadius: 10, padding: "10px 14px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <Avatar name={vehicle.assignedDriver.driverName} size={34} shape="circle" />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                {vehicle.assignedDriver.driverName}
              </div>
              <div style={{ fontSize: 11, color: C.muted, display: "flex", gap: 10, marginTop: 2 }}>
                <InfoChip icon="phone-fill"   text={vehicle.assignedDriver.driverContact} />
                <InfoChip icon="id-card-fill" text={vehicle.assignedDriver.licenseNumber} />
              </div>
            </div>
            <span style={{
              marginLeft: "auto", fontSize: 10, fontWeight: 700,
              padding: "2px 10px", borderRadius: 20,
              background: C.indigoLight, border: `1px solid ${C.indigoMid}`,
              color: C.indigo,
            }}>
              Assigned Driver
            </span>
          </div>
        )}

        <PeriodStats ps={ps} />

        {/* Per-trip driver info inside history */}
        <TripHistoryPanel
          trips={vehicle.recentTrips}
          showDriver={true}
          showVehicle={false}
          accentColor={C.indigo}
          accentLight={C.indigoLight}
          accentMid={C.indigoMid}
        />
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ searched, mode }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{searched ? "🔍" : (mode === "driver" ? "👤" : "🚛")}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>
        {searched ? `No ${mode}s found` : `Search for a ${mode}`}
      </div>
      <div style={{ fontSize: 12, maxWidth: 300, margin: "0 auto", lineHeight: 1.7 }}>
        {searched
          ? `Try a different search term.`
          : mode === "driver"
            ? "Enter a driver name, mobile number, or license number to view their trip analytics."
            : "Enter a vehicle number or vehicle type to view its full trip history."}
      </div>
    </div>
  );
}

// ─── Segment Slider ───────────────────────────────────────────────────────────
function SegmentSlider({ mode, onChange }) {
  const opts = [
    { key: "driver",  label: "Driver",  icon: "user-fill"  },
    { key: "vehicle", label: "Vehicle", icon: "truck-fill" },
  ];
  return (
    <div style={{
      display: "inline-flex",
      background: C.slateLight,
      borderRadius: 10,
      padding: 3,
      gap: 2,
    }}>
      {opts.map(opt => {
        const active = mode === opt.key;
        const accent = opt.key === "driver" ? C.teal : C.indigo;
        const accentLight = opt.key === "driver" ? C.tealLight : C.indigoLight;
        const accentMid   = opt.key === "driver" ? C.tealMid   : C.indigoMid;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 18px",
              borderRadius: 8,
              border: active ? `1px solid ${accentMid}` : "1px solid transparent",
              background: active ? accentLight : "transparent",
              color: active ? accent : C.muted,
              fontSize: 13, fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.18s ease",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <i className={`ri-${opt.icon}`} style={{ fontSize: 15 }}></i>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
function SkeletonCard({ accent }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 14, overflow: "hidden" }}>
      <div style={{ height: 80, background: `${accent}18` }} />
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
        {[140, 220, 100, 180].map((w, j) => (
          <div key={j} style={{
            height: 13, width: w, borderRadius: 6,
            background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
            backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SearchPage() {
  const [mode,      setMode]      = useState("driver"); // "driver" | "vehicle"
  const [query,     setQuery]     = useState("");
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, "day").startOf("day"),
    dayjs().endOf("day"),
  ]);
  const [results,   setResults]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [searched,  setSearched]  = useState(false);
  const inputRef = useRef(null);

  const accent      = mode === "driver" ? C.teal   : C.indigo;
  const accentLight = mode === "driver" ? C.tealLight  : C.indigoLight;
  const accentMid   = mode === "driver" ? C.tealMid    : C.indigoMid;
  const endpoint    = mode === "driver" ? "/analytics/driver-search" : "/analytics/vehicle-search";
  const resultKey   = mode === "driver" ? "drivers" : "vehicles";

  const placeholder = mode === "driver"
    ? "e.g. Mukesh, 9876543210, DL-1234567890"
    : "e.g. MH01AB1234, Truck, Toyota";

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(""); setSearched(true);
    try {
      const params = {
        q:         query.trim(),
        startDate: dateRange[0]?.toISOString(),
        endDate:   dateRange[1]?.toISOString(),
      };
      const res = await api.get(endpoint, { params });
      setResults(res.data[resultKey] ?? []);
    } catch {
      setError("Failed to search. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = e => { if (e.key === "Enter") doSearch(); };

  const clearSearch = () => {
    setQuery(""); setResults(null);
    setSearched(false); setError("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const switchMode = (m) => {
    setMode(m);
    setResults(null);
    setSearched(false);
    setError("");
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div style={{
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: C.bg, minHeight: "100vh",
      padding: "20px", boxSizing: "border-box",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Mono:wght@500&display=swap');
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .srch-input .ant-input { font-family:'DM Sans',sans-serif !important; }
        .srch-range .ant-picker-input input { font-family:'DM Sans',sans-serif !important; }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted,
            textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
            Analytics
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>
            {mode === "driver" ? "Driver" : "Vehicle"} Search
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {mode === "driver"
              ? "Search by name, mobile number, or license number"
              : "Search by vehicle number or vehicle type"}
            {" · "}Filter by date range
          </div>
        </div>

        {/* Segment toggle */}
        <SegmentSlider mode={mode} onChange={switchMode} />
      </div>

      {/* ── Search panel ── */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 14, padding: "18px 20px", marginBottom: 20,
        boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
        borderTop: `3px solid ${accent}`,
        transition: "border-top-color 0.3s ease",
      }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>

          {/* Query input */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted,
              textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              {mode === "driver" ? "Driver / Mobile / License" : "Vehicle Number / Type"}
            </div>
            <Input
              ref={inputRef}
              className="srch-input"
              size="large"
              placeholder={placeholder}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              allowClear
              onClear={clearSearch}
              prefix={
                <i className={`ri-${mode === "driver" ? "user-search-line" : "truck-line"}`}
                  style={{ color: C.muted, marginRight: 4, fontSize: 15 }}></i>
              }
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
              className="srch-range"
              size="large"
              value={dateRange}
              onChange={val => setDateRange(val ?? [dayjs().subtract(30, "day"), dayjs()])}
              style={{ width: "100%", borderRadius: 8, borderColor: C.border }}
              presets={[
                { label: "Today",        value: [dayjs().startOf("day"), dayjs()] },
                { label: "Last 7 days",  value: [dayjs().subtract(7, "day").startOf("day"), dayjs()] },
                { label: "Last 30 days", value: [dayjs().subtract(30, "day").startOf("day"), dayjs()] },
                { label: "This month",   value: [dayjs().startOf("month"), dayjs().endOf("month")] },
                { label: "Last month",   value: [dayjs().subtract(1, "month").startOf("month"),
                                                  dayjs().subtract(1, "month").endOf("month")] },
              ]}
            />
          </div>

          {/* Search button */}
          <button
            onClick={doSearch}
            disabled={!query.trim() || loading}
            style={{
              height: 40, padding: "0 24px",
              background: query.trim() && !loading ? accent : C.slateLight,
              color: query.trim() && !loading ? "#fff" : C.muted,
              border: "none", borderRadius: 8,
              fontSize: 13, fontWeight: 700,
              cursor: query.trim() ? "pointer" : "not-allowed",
              boxShadow: query.trim() ? `0 2px 8px ${accent}44` : "none",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {loading ? "Searching…" : "Search"}
          </button>

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

        {dateRange[0] && dateRange[1] && (
          <div style={{ marginTop: 10, fontSize: 11, color: C.muted }}>
            Showing trips:{" "}
            <span style={{ fontWeight: 700, color: accent }}>
              {dateRange[0].format("D MMM YYYY")} → {dateRange[1].format("D MMM YYYY")}
            </span>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: C.redLight, border: `1px solid ${C.redMid}`,
          borderRadius: 10, padding: "10px 14px",
          fontSize: 13, color: "#991b1b", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ── Results ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[1, 2].map(i => <SkeletonCard key={i} accent={accent} />)}
        </div>
      ) : results === null ? (
        <EmptyState searched={false} mode={mode} />
      ) : results.length === 0 ? (
        <EmptyState searched={true} mode={mode} />
      ) : (
        <>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, fontWeight: 600 }}>
            {results.length} {mode}{results.length !== 1 ? "s" : ""} found for "{query}"
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mode === "driver"
              ? results.map(d => <DriverCard key={String(d.driverId)}  driver={d}  />)
              : results.map(v => <VehicleCard key={String(v.vehicleId)} vehicle={v} />)
            }
          </div>
        </>
      )}
    </div>
  );
}