/**
 * AdminMonitorDashboard.jsx
 *
 * Read-only admin dashboard for monitoring all factory trips.
 * Features:
 *  - Single or split-screen mode (two factories side by side)
 *  - Factory selector per panel
 *  - Live auto-refresh every 10 s with pulse indicator
 *  - Filter tabs: All / Waiting / Inside / Enroute / Dispatched / Closed
 *  - Read-only trip detail modal (no workflow actions)
 *  - Zero mutation — purely observational
 *
 * Dependencies: react, @tanstack/react-query, antd, your api service
 * Usage:  <AdminMonitorDashboard />
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Spin, Select } from "antd";
import api from "../../../../../services/API/Api/api";

// ─── Constants ────────────────────────────────────────────────────────────────
const REFRESH_INTERVAL = 10_000; // 10 seconds

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

const vehicleTypeLabel = {
  truck: "Truck", miniTruck: "Mini Truck", containerTruck: "Container Truck",
  mixerTruck: "Mixer Truck", waterTanker: "Water Tanker", tractor: "Tractor",
  car: "Car", bus: "Bus", ambulance: "Ambulance",
};

const TRIP_STATE_META = {
  ACTIVE:     { bg: "#d1fae5", c: "#065f46" },
  PENDING:    { bg: "#fef3c7", c: "#92400e" },
  COMPLETED:  { bg: "#dbeafe", c: "#1e40af" },
  CLOSED:     { bg: "#e2e8f0", c: "#475569" },
  CANCELLED:  { bg: "#fee2e2", c: "#991b1b" },
};

const LOCATION_META = {
  inside_factory:  { label: "Inside",   bg: "#dcfce7", c: "#15803d" },
  outside_factory: { label: "Waiting",  bg: "#fef9c3", c: "#92400e" },
  enroute:         { label: "En Route", bg: "#dbeafe", c: "#1d4ed8" },
};

const ACTION_META = {
  begin:        { color: "#818cf8", label: "Begin"         },
  created:      { color: "#818cf8", label: "Created"       },
  checkin:      { color: "#38bdf8", label: "Check-in"      },
  checkout:     { color: "#a78bfa", label: "Checkout"      },
  arrive:       { color: "#22d3ee", label: "Arrived"       },
  load:         { color: "#4ade80", label: "Loaded"        },
  unload:       { color: "#fbbf24", label: "Unloaded"      },
  cancel:       { color: "#f87171", label: "Cancelled"     },
  complete:     { color: "#34d399", label: "Completed"     },
  route_change: { color: "#fb923c", label: "Route Changed" },
};

const resolveAction = (entry) => {
  const key = typeof entry.action === "string" ? entry.action : entry.action?.type;
  return ACTION_META[key] || { color: "#64748b", label: key || entry.status || "Event" };
};

// ─── Tiny UI atoms ────────────────────────────────────────────────────────────
function Pill({ bg, c, children }) {
  return (
    <span style={{
      background: bg, color: c, fontSize: 10, fontWeight: 700,
      borderRadius: 4, padding: "2px 7px", whiteSpace: "nowrap", letterSpacing: 0.3,
    }}>{children}</span>
  );
}

function LiveDot({ active = true }) {
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: active ? "#22c55e" : "#475569",
      boxShadow: active ? "0 0 0 3px #22c55e33" : "none",
      animation: active ? "adminPulse 1.8s ease-in-out infinite" : "none",
    }} />
  );
}

// ─── Trip Timeline (horizontal, read-only) ────────────────────────────────────
function TripTimeline({ tripHistory }) {
  if (!Array.isArray(tripHistory) || tripHistory.length === 0) return null;
  return (
    <div style={{ marginTop: 14, borderTop: "1px solid #1e293b", paddingTop: 12 }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: "#38bdf8", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 10 }}>
        Trip History
      </div>
      <div style={{ overflowX: "auto", paddingBottom: 4, scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}>
        <div style={{ display: "flex", alignItems: "flex-start", minWidth: "max-content", gap: 0 }}>
          {tripHistory.map((entry, idx) => {
            const meta = resolveAction(entry);
            const isLast = idx === tripHistory.length - 1;
            const nextMeta = !isLast ? resolveAction(tripHistory[idx + 1]) : null;
            return (
              <div key={entry._id || idx} style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 100 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: meta.color + "20", border: `2px solid ${meta.color}`,
                    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color }} />
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: meta.color, marginTop: 4, textAlign: "center", lineHeight: 1.2 }}>
                    {meta.label}
                  </span>
                  <span style={{ fontSize: 8.5, color: "#94a3b8", marginTop: 2, textAlign: "center", lineHeight: 1.3 }}>
                    {entry?.factory?.name || entry.location || "—"}
                  </span>
                  <span style={{ fontSize: 8, color: "#38bdf8", marginTop: 2, textAlign: "center" }}>
                    {fmtTime(entry.timestamp)}
                  </span>
                </div>
                {!isLast && (
                  <div style={{
                    width: 20, height: 2, marginTop: 9, flexShrink: 0,
                    background: `linear-gradient(90deg,${meta.color}80,${nextMeta.color}80)`,
                    borderRadius: 2,
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Read-only Detail Modal ───────────────────────────────────────────────────
function ReadOnlyModal({ trip, onClose }) {
  if (!trip) return null;
  const v = trip.vehicle || {};
  const d = trip.driver  || {};

  const Row = ({ label, value, accent }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "5px 0", borderBottom: "1px solid #1e293b" }}>
      <span style={{ fontSize: 10.5, color: "#64748b", fontWeight: 600, flexShrink: 0, minWidth: 110 }}>{label}</span>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: accent ? "#38bdf8" : "#e2e8f0", textAlign: "right" }}>{value || "—"}</span>
    </div>
  );

  const Sect = ({ title, children }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: "#38bdf8", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 6 }}>{title}</div>
      <div style={{ background: "#0f172a", borderRadius: 8, padding: "4px 10px", border: "1px solid #1e293b" }}>{children}</div>
    </div>
  );

  const locMeta = LOCATION_META[trip.location] || { label: trip.location || "—", bg: "#1e293b", c: "#94a3b8" };
  const stateMeta = TRIP_STATE_META[trip.tripState] || { bg: "#1e293b", c: "#94a3b8" };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#0f172a", borderRadius: 18, width: "100%", maxWidth: 680,
        maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
        border: "1px solid #1e293b", boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px 14px",
          borderBottom: "1px solid #1e293b",
          background: "linear-gradient(135deg,#0f172a,#1e293b)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>🚛</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9", letterSpacing: -0.3 }}>
                {v.vehicleNumber || "Unknown"}
              </div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>Read-only — Admin View</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Pill bg={locMeta.bg} c={locMeta.c}>{locMeta.label}</Pill>
            <Pill bg={stateMeta.bg} c={stateMeta.c}>{trip.tripState || "—"}</Pill>
            <button onClick={onClose} style={{
              border: "none", background: "#1e293b", borderRadius: 8,
              width: 28, height: 28, cursor: "pointer", fontSize: 14,
              color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "16px 20px 20px", scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}>
          {/* Read-only badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginBottom: 14,
            background: "#1e293b", borderRadius: 8, padding: "7px 12px",
            border: "1px solid #334155",
          }}>
            <span style={{ fontSize: 12 }}>👁️</span>
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
              Monitoring mode — no actions available for admin view
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Sect title="Driver Info">
              <Row label="Name"         value={d.driverName} />
              <Row label="Contact"      value={d.driverContact} />
              <Row label="ID Type"      value={d.driverIdType} />
              <Row label="License"      value={d.licenseNumber} />
            </Sect>
            <Sect title="Vehicle">
              <Row label="Number"       value={v.vehicleNumber} accent />
              <Row label="Transporter"  value={v.transporterName} />
              <Row label="Type"         value={vehicleTypeLabel[v.typeOfVehicle] || v.typeOfVehicle} />
              <Row label="PUC Expiry"   value={fmtDate(v.PUCExpiry)} />
            </Sect>
            <Sect title="Trip Details">
              <Row label="Trip Type"    value={trip.type === "external_delivery" ? "External" : "Internal"} />
              <Row label="Purpose"      value={trip.purpose} />
              <Row label="Load Status"  value={trip.loadStatus} accent />
              <Row label="Phase"        value={trip.phase} />
            </Sect>
            <Sect title="Route">
              <Row label="Source"       value={trip.sourceFactory?.name || trip.externalSource || "External"} />
              <Row label="Destination"  value={trip.destinationFactory?.name || trip.externalDestination || "—"} />
              <Row label="Location"     value={locMeta.label} accent />
              <Row label="Started"      value={fmtTime(trip.createdAt)} />
            </Sect>
            <Sect title="Material">
              <Row label="Material"     value={trip.materials?.[0]?.material} accent />
              <Row label="Type"         value={trip.materials?.[0]?.name} />
              <Row label="Quantity"     value={trip.materials?.[0]?.quantity} />
              <Row label="Customer"     value={trip.materials?.[0]?.customer} />
            </Sect>
            <Sect title="Invoice">
              <Row label="Invoice No"   value={trip.materials?.[0]?.invoiceNo} accent />
              <Row label="Amount"       value={trip.materials?.[0]?.invoiceAmount ? `₹${trip.materials?.[0]?.invoiceAmount}` : null} />
              <Row label="Completed"    value={fmtTime(trip.completedAt)} />
            </Sect>
          </div>

          {trip.reason && (
            <div style={{ background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: "#fca5a5", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>Cancellation Reason</div>
              <div style={{ fontSize: 12, color: "#fecaca" }}>{trip.reason}</div>
            </div>
          )}

          <TripTimeline tripHistory={trip.tripHistory || []} />
        </div>
      </div>
    </div>
  );
}

// ─── Trip Card (read-only) ────────────────────────────────────────────────────
function TripCard({ trip, onClick }) {
  const v = trip.vehicle || {};
  const locMeta = LOCATION_META[trip.location] || { label: trip.location || "—", bg: "#1e293b", c: "#64748b" };
  const stateMeta = TRIP_STATE_META[trip.tripState] || { bg: "#1e293b", c: "#64748b" };
  const isLive = trip.tripState !== "CLOSED" && trip.tripState !== "CANCELLED";
  const isPUCExpired = v.PUCExpiry && new Date(v.PUCExpiry) < new Date();

  return (
    <div
      onClick={onClick}
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 12,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "all .18s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.border = "1px solid #38bdf880";
        e.currentTarget.style.background = "#1e293b";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.border = "1px solid #1e293b";
        e.currentTarget.style.background = "#0f172a";
        e.currentTarget.style.transform = "";
      }}
    >
      {/* Top accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "12px 12px 0 0",
        background: trip.location === "inside_factory" ? "linear-gradient(90deg,#22c55e,#4ade80)"
          : trip.location === "enroute" ? "linear-gradient(90deg,#3b82f6,#60a5fa)"
          : trip.location === "outside_factory" ? "linear-gradient(90deg,#f59e0b,#fbbf24)"
          : "#334155",
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 9 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <LiveDot active={isLive} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {isPUCExpired && <span style={{ fontSize: 10, color: "#f87171" }}>⚠️</span>}
              <span style={{ fontSize: 13, fontWeight: 800, color: "#f1f5f9", letterSpacing: -0.2 }}>
                {v.vehicleNumber || "—"}
              </span>
            </div>
            <span style={{ fontSize: 10, color: "#64748b" }}>{v.transporterName || "—"}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <Pill bg={locMeta.bg} c={locMeta.c}>{locMeta.label}</Pill>
          <Pill bg={stateMeta.bg} c={stateMeta.c}>{trip.tripState || "—"}</Pill>
        </div>
      </div>

      {/* Route */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 10.5 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#60a5fa", flexShrink: 0 }} />
        <span style={{ color: "#94a3b8", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {trip.sourceFactory?.name || trip.externalSource || "External"}
        </span>
        <span style={{ color: "#334155", fontSize: 9 }}>→</span>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", flexShrink: 0 }} />
        <span style={{ color: "#94a3b8", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {trip.destinationFactory?.name || trip.externalDestination || "—"}
        </span>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {trip.purpose && (
          <span style={{ fontSize: 9.5, fontWeight: 600, color: "#64748b", background: "#1e293b", borderRadius: 4, padding: "1px 6px", border: "1px solid #334155" }}>
            {trip.purpose}
          </span>
        )}
        {trip.type && (
          <span style={{ fontSize: 9.5, fontWeight: 600, color: "#64748b", background: "#1e293b", borderRadius: 4, padding: "1px 6px", border: "1px solid #334155" }}>
            {trip.type === "external_delivery" ? "External" : "Internal"}
          </span>
        )}
        {trip.driver?.driverName && (
          <span style={{ fontSize: 9.5, fontWeight: 600, color: "#38bdf8", background: "#0c2a3a", borderRadius: 4, padding: "1px 6px" }}>
            👤 {trip.driver.driverName}
          </span>
        )}
        {trip.materials?.[0]?.material && (
          <span style={{ fontSize: 9.5, fontWeight: 600, color: "#a78bfa", background: "#1a1040", borderRadius: 4, padding: "1px 6px" }}>
            📦 {trip.materials[0].material}
          </span>
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: 9, color: "#475569" }}>
        Started {fmtTime(trip.createdAt)}
      </div>
    </div>
  );
}

// ─── Filter Tabs ──────────────────────────────────────────────────────────────
const TABS = [
  { v: "all",        l: "All"       },
  { v: "waiting",    l: "Waiting"   },
  { v: "inside",     l: "Inside"    },
  { v: "enroute",    l: "En Route"  },
  { v: "dispatched", l: "Dispatched"},
  { v: "closed",     l: "Closed"    },
];

function FilterTabs({ active, onChange, counts }) {
  return (
    <div style={{ display: "flex", gap: 2, background: "#0f172a", borderRadius: 8, padding: 3, flexWrap: "wrap", border: "1px solid #1e293b" }}>
      {TABS.map((t) => (
        <button key={t.v} onClick={() => onChange(t.v)} style={{
          border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 10.5,
          fontWeight: active === t.v ? 700 : 500, cursor: "pointer", transition: "all .15s",
          background: active === t.v ? "#1e3a5f" : "transparent",
          color: active === t.v ? "#38bdf8" : "#64748b",
        }}>
          {t.l}
          <span style={{
            marginLeft: 4, fontSize: 9, fontWeight: 700,
            background: active === t.v ? "#38bdf820" : "#1e293b",
            color: active === t.v ? "#38bdf8" : "#475569",
            borderRadius: 3, padding: "0 4px",
          }}>
            {counts[t.v] ?? 0}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── KPI Strip ────────────────────────────────────────────────────────────────
function KpiStrip({ trips }) {
  const inside    = trips.filter(t => t.location === "inside_factory" && t.tripState !== "CLOSED" && t.tripState !== "CANCELLED").length;
  const waiting   = trips.filter(t => t.location === "outside_factory" && t.tripState !== "CLOSED" && t.tripState !== "CANCELLED").length;
  const enroute   = trips.filter(t => t.location === "enroute" && t.tripState !== "CLOSED" && t.tripState !== "CANCELLED").length;
  const closed    = trips.filter(t => t.tripState === "CLOSED" || t.tripState === "CANCELLED").length;

  const items = [
    { label: "Inside",   value: inside,  color: "#22c55e" },
    { label: "Waiting",  value: waiting, color: "#fbbf24" },
    { label: "En Route", value: enroute, color: "#60a5fa" },
    { label: "Closed",   value: closed,  color: "#64748b" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 10 }}>
      {items.map((k) => (
        <div key={k.label} style={{
          background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8,
          padding: "8px 10px", display: "flex", alignItems: "center", gap: 7,
        }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: k.color }}>{k.value}</span>
          <span style={{ fontSize: 9, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{k.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Single Factory Panel ─────────────────────────────────────────────────────
function FactoryPanel({ factories, panelId, isSplit }) {
  const [selectedFactoryId, setSelectedFactoryId] = useState(null);
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");
  const [detailTrip, setDetailTrip] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ── Live trips ──────────────────────────────────────────────────────────────
  const { data: liveData, isLoading: liveLoading, dataUpdatedAt: liveUpdated } = useQuery({
    queryKey: ["admin-live-trips", selectedFactoryId, panelId],
    queryFn: async () => {
      if (!selectedFactoryId) return { trips: [] };
      const res = await api.get(`/vehicle/trips/live?factoryId=${selectedFactoryId}&limit=200`);
      return res.data;
    },
    enabled: !!selectedFactoryId,
    refetchInterval: REFRESH_INTERVAL,
    refetchOnWindowFocus: true,
  });

  // ── Closed trips ────────────────────────────────────────────────────────────
  const { data: closedData, isLoading: closedLoading } = useQuery({
    queryKey: ["admin-closed-trips", selectedFactoryId, panelId],
    queryFn: async () => {
      if (!selectedFactoryId) return { trips: [] };
      const res = await api.get(`/vehicle/trips/closed-and-cancelled?factoryId=${selectedFactoryId}&limit=100`);
      return res.data;
    },
    enabled: !!selectedFactoryId,
    refetchInterval: REFRESH_INTERVAL,
    refetchOnWindowFocus: true,
  });

  useEffect(() => { if (liveUpdated) setLastUpdated(new Date(liveUpdated)); }, [liveUpdated]);

  const liveTrips   = liveData?.trips   || [];
  const closedTrips = closedData?.trips || [];
  const allTrips    = [...liveTrips, ...closedTrips];

  // ── Filter ──────────────────────────────────────────────────────────────────
  const base = (() => {
    if (filter === "waiting")    return liveTrips.filter(t => t.location === "outside_factory");
    if (filter === "inside")     return liveTrips.filter(t => t.location === "inside_factory");
    if (filter === "enroute")    return liveTrips.filter(t => t.location === "enroute" && t.destinationFactory?._id === selectedFactoryId);
    if (filter === "dispatched") return liveTrips.filter(t => t.location === "enroute" && t.sourceFactory?._id === selectedFactoryId);
    if (filter === "closed")     return closedTrips;
    return allTrips;
  })();

  const displayed = search.trim()
    ? base.filter(t => (t.vehicle?.vehicleNumber || "").toLowerCase().includes(search.trim().toLowerCase()))
    : base;

  const counts = {
    all:        allTrips.length,
    waiting:    liveTrips.filter(t => t.location === "outside_factory").length,
    inside:     liveTrips.filter(t => t.location === "inside_factory").length,
    enroute:    liveTrips.filter(t => t.location === "enroute" && t.destinationFactory?._id === selectedFactoryId).length,
    dispatched: liveTrips.filter(t => t.location === "enroute" && t.sourceFactory?._id === selectedFactoryId).length,
    closed:     closedTrips.length,
  };

  const selectedFactory = factories.find(f => f._id === selectedFactoryId);
  const isLoading = liveLoading || closedLoading;

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", minWidth: 0,
      background: "#0a1628", border: "1px solid #1e293b", borderRadius: 16,
      overflow: "hidden",
    }}>
      {/* Panel header */}
      <div style={{
        background: "linear-gradient(135deg,#0f172a,#1a2744)",
        borderBottom: "1px solid #1e293b", padding: "14px 16px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {/* Factory selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
          }}>🏭</div>
          <div style={{ flex: 1 }}>
            <Select
              showSearch
              placeholder="Select a factory to monitor…"
              style={{ width: "100%" }}
              value={selectedFactoryId || undefined}
              onChange={(v) => { setSelectedFactoryId(v); setFilter("all"); }}
              options={factories.map(f => ({
                label: `${f.name} — ${f.location}`,
                value: f._id,
              }))}
              filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
              styles={{
                selector: { background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9" },
                popup: { root: { background: "#0f172a", border: "1px solid #334155" } },
              }}
            />
          </div>
          {selectedFactoryId && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
              <LiveDot active={!isLoading} />
              <span style={{ fontSize: 9.5, color: "#64748b" }}>
                {lastUpdated ? `${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "—"}
              </span>
            </div>
          )}
        </div>

        {selectedFactoryId && (
          <>
            {/* Search */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#0f172a", borderRadius: 8, padding: "6px 10px",
              border: "1px solid #334155",
            }}>
              <span style={{ fontSize: 12, color: "#475569" }}>🔍</span>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search vehicle number…"
                style={{
                  border: "none", background: "transparent", fontSize: 12,
                  color: "#e2e8f0", fontFamily: "'DM Mono', monospace", outline: "none", flex: 1,
                }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ border: "none", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: 12 }}>✕</button>
              )}
            </div>

            {/* KPIs */}
            <KpiStrip trips={allTrips} />

            {/* Filter tabs */}
            <FilterTabs active={filter} onChange={setFilter} counts={counts} />
          </>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}>
        {!selectedFactoryId ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 14, color: "#334155" }}>
            <span style={{ fontSize: 48 }}>🏭</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Select a factory to begin monitoring</span>
            <span style={{ fontSize: 11, color: "#334155" }}>Live data will appear here automatically</span>
          </div>
        ) : isLoading && allTrips.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
            <Spin style={{ color: "#38bdf8" }} />
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "48px 20px", color: "#334155" }}>
            <span style={{ fontSize: 36 }}>🚛</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>No vehicles for this filter</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {displayed.map(trip => (
              <TripCard key={trip._id} trip={trip} onClick={() => setDetailTrip(trip)} />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detailTrip && <ReadOnlyModal trip={detailTrip} onClose={() => setDetailTrip(null)} />}
    </div>
  );
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────
export default function AdminMonitorDashboard() {
  const [factories, setFactories]   = useState([]);
  const [factoriesLoading, setFactoriesLoading] = useState(true);
  const [splitMode, setSplitMode]   = useState(false);
  const [ticker, setTicker]         = useState(0); // for global refresh countdown

  // ── Load factories once ────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/factories")
      .then(res => setFactories(res.data.factories || []))
      .catch(console.error)
      .finally(() => setFactoriesLoading(false));
  }, []);

  // ── Countdown ticker ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setTicker(p => (p + 1) % 10), 1000);
    return () => clearInterval(t);
  }, []);

  const secondsToRefresh = REFRESH_INTERVAL / 1000 - ticker;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#060e1f",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      display: "flex", flexDirection: "column",
      color: "#e2e8f0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        @keyframes adminPulse { 0%,100%{box-shadow:0 0 0 3px #22c55e33} 50%{box-shadow:0 0 0 6px #22c55e11} }
        @keyframes adminFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 99px; }
        .ant-select .ant-select-selector { background: #0f172a !important; border-color: #334155 !important; color: #f1f5f9 !important; }
        .ant-select-dropdown { background: #0f172a !important; border: 1px solid #334155 !important; }
        .ant-select-item { color: #e2e8f0 !important; }
        .ant-select-item-option-active { background: #1e293b !important; }
        .ant-select-item-option-selected { background: #1e3a5f !important; }
      `}</style>

      {/* ── Top nav bar ── */}
      <nav style={{
        background: "linear-gradient(135deg,#0f172a,#1a2744)",
        borderBottom: "1px solid #1e293b",
        padding: "0 24px", height: 58,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 16, position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 2px 24px rgba(0,0,0,0.4)",
      }}>
        {/* Logo / title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg,#1d4ed8,#38bdf8)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>🛰️</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#f8fafc", letterSpacing: -0.3 }}>
              VEMS Admin Monitor
            </div>
            <div style={{ fontSize: 9.5, color: "#38bdf8", letterSpacing: 1.2, textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>
              Read-Only · Operations View
            </div>
          </div>
        </div>

        {/* Centre: factory count */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#0f172a", borderRadius: 8, padding: "5px 12px", border: "1px solid #1e293b" }}>
            <span style={{ fontSize: 11, color: "#64748b" }}>Factories</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#38bdf8" }}>{factories.length}</span>
          </div>
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Auto-refresh countdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#0f172a", borderRadius: 8, padding: "5px 12px", border: "1px solid #1e293b" }}>
            <LiveDot active />
            <span style={{ fontSize: 10.5, color: "#64748b", fontFamily: "'DM Mono', monospace" }}>
              Next refresh in <span style={{ color: "#38bdf8", fontWeight: 700 }}>{secondsToRefresh}s</span>
            </span>
          </div>

          {/* Split mode toggle */}
          <button
            onClick={() => setSplitMode(s => !s)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              background: splitMode ? "linear-gradient(135deg,#1d4ed8,#2563eb)" : "#1e293b",
              border: splitMode ? "none" : "1px solid #334155",
              borderRadius: 9, padding: "7px 14px",
              fontSize: 12, fontWeight: 700,
              color: splitMode ? "#fff" : "#94a3b8",
              cursor: "pointer", transition: "all .2s",
            }}
          >
            {splitMode ? (
              <>
                <span style={{ fontSize: 13 }}>▪▪</span>
                Split View ON
              </>
            ) : (
              <>
                <span style={{ fontSize: 13 }}>▫▫</span>
                Enable Split View
              </>
            )}
          </button>
        </div>
      </nav>

      {/* ── Admin read-only banner ── */}
      <div style={{
        background: "#1a0e35", borderBottom: "1px solid #2d1b69",
        padding: "7px 24px", display: "flex", alignItems: "center", gap: 8,
        fontSize: 11, color: "#a78bfa", fontWeight: 600,
      }}>
        <span>🔒</span>
        Admin monitoring mode — all data is live and read-only. No actions can be performed from this view.
        <span style={{ marginLeft: "auto", color: "#64748b", fontWeight: 400 }}>
          Data refreshes every {REFRESH_INTERVAL / 1000}s automatically
        </span>
      </div>

      {/* ── Panels ── */}
      {factoriesLoading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <Spin size="large" />
            <span style={{ fontSize: 12, color: "#64748b" }}>Loading factories…</span>
          </div>
        </div>
      ) : (
        <div style={{
          flex: 1, display: "flex", gap: 14, padding: 16,
          animation: "adminFadeIn .35s ease both",
          minHeight: 0,
        }}>
          <FactoryPanel key="panel-a" factories={factories} panelId="A" isSplit={splitMode} />
          {splitMode && (
            <>
              {/* Divider */}
              <div style={{
                width: 2, flexShrink: 0, background: "linear-gradient(to bottom, transparent, #1e293b 20%, #334155 50%, #1e293b 80%, transparent)",
                borderRadius: 2,
              }} />
              <FactoryPanel key="panel-b" factories={factories} panelId="B" isSplit={splitMode} />
            </>
          )}
        </div>
      )}
    </div>
  );
}