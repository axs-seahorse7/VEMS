import { useState, useCallback } from "react";
import { Drawer } from "antd";
import {
  SearchOutlined,
  LoadingOutlined,
  CloseOutlined,
  CarOutlined,
  EnvironmentOutlined,
  UserOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  BankOutlined,
  CheckCircleOutlined,
  StopOutlined,
  InboxOutlined,
  ThunderboltOutlined,
  ArrowRightOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import api from "../../../services/API/Api/api";

// ─── Debounce ─────────────────────────────────────────────────────────────────
function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// ─── Status Configs ───────────────────────────────────────────────────────────
const PHASE_CONFIG = {
  SOURCE:      { label: "At Source",      color: "#4f46e5", bg: "#eff6ff" },
  ENROUTE:     { label: "En Route",       color: "#d97706", bg: "#fffbeb" },
  DESTINATION: { label: "At Destination", color: "#059669", bg: "#f0fdf4" },
};

const TRIP_STATE_CONFIG = {
  active:    { label: "Active",    color: "#059669", bg: "#f0fdf4" },
  completed: { label: "Completed", color: "#6b7280", bg: "#f9fafb" },
  cancelled: { label: "Cancelled", color: "#dc2626", bg: "#fef2f2" },
};

const LOAD_CONFIG = {
  loaded:   { label: "Loaded",   color: "#4f46e5", bg: "#eff6ff" },
  unloaded: { label: "Unloaded", color: "#6b7280", bg: "#f9fafb" },
  loading:  { label: "Loading",  color: "#d97706", bg: "#fffbeb" },
};

// ─── Tag ──────────────────────────────────────────────────────────────────────
function Tag({ label, color, bg }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontSize: 10, fontWeight: 600, padding: "3px 9px",
      borderRadius: 6, background: bg, color,
      letterSpacing: 0.3, whiteSpace: "nowrap",
      border: `1px solid ${color}22`,
    }}>
      {label}
    </span>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "7px 0",
      borderBottom: "1px solid #f1f5f9",
    }}>
      <span style={{
        width: 28, height: 28, borderRadius: 7,
        background: "#f8fafc", border: "1px solid #e2e8f0",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#64748b", fontSize: 12, flexShrink: 0,
      }}>
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </div>
        <div style={{ fontSize: 12.5, color: "#1e293b", fontWeight: 600, marginTop: 2, lineHeight: 1.4 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: "#94a3b8",
        textTransform: "uppercase", letterSpacing: 0.8,
        marginBottom: 6, paddingLeft: 2,
      }}>
        {title}
      </div>
      <div style={{
        background: "#ffffff",
        borderRadius: 10,
        border: "1px solid #e2e8f0",
        padding: "0 12px",
        overflow: "hidden",
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Live Pulse ───────────────────────────────────────────────────────────────
function LivePulse({ color }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 8, height: 8 }}>
      <span style={{
        position: "absolute", width: 8, height: 8, borderRadius: "50%",
        background: color, opacity: 0.25,
        animation: "vsPulse 1.8s ease-in-out infinite",
      }} />
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, position: "relative" }} />
    </span>
  );
}

// ─── Status Indicator Bar ─────────────────────────────────────────────────────
function VehicleStatusBar({ vehicleBusy }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "5px 10px", borderRadius: 8,
      background: vehicleBusy ? "#fff7ed" : "#f0fdf4",
      border: `1px solid ${vehicleBusy ? "#fed7aa" : "#bbf7d0"}`,
      width: "fit-content",
    }}>
      <LivePulse color={vehicleBusy ? "#f97316" : "#22c55e"} />
      <span style={{
        fontSize: 10, fontWeight: 700,
        color: vehicleBusy ? "#ea580c" : "#16a34a",
        letterSpacing: 0.4,
      }}>
        {vehicleBusy ? "ON TRIP" : "AVAILABLE"}
      </span>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ type }) {
  const configs = {
    idle:     {
      icon: <SearchOutlined style={{ fontSize: 28, color: "#cbd5e1" }} />,
      title: "Search a vehicle",
      sub: "Enter a vehicle number to see its live status",
    },
    notfound: {
      icon: <StopOutlined style={{ fontSize: 28, color: "#fca5a5" }} />,
      title: "Vehicle not found",
      sub: "No vehicle matched that number",
    },
    error:    {
      icon: <CloseOutlined style={{ fontSize: 28, color: "#fca5a5" }} />,
      title: "Something went wrong",
      sub: "Could not fetch vehicle status",
    },
  };
  const c = configs[type];
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "52px 24px", gap: 10,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "#f8fafc", border: "1px solid #e2e8f0",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 4,
      }}>
        {c.icon}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#334155" }}>{c.title}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", lineHeight: 1.6, maxWidth: 220 }}>{c.sub}</div>
    </div>
  );
}

// ─── Route Arrow ─────────────────────────────────────────────────────────────
function RouteDisplay({ source, destination, currentFactory }) {
  if (!source && !destination) return null;
  return (
    <div style={{ padding: "10px 0 6px" }}>
      {/* Source → Destination row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px",
        background: "#f8fafc",
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        marginBottom: currentFactory ? 8 : 0,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>From</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {source || "—"}
          </div>
        </div>
        <TruckOutlined  style={{ color: "#94a3b8", fontSize: 20, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
          <div style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>To</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {destination || "—"}
          </div>
        </div>
      </div>

      {currentFactory && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 12px",
          background: "#f0fdf4",
          borderRadius: 8,
          border: "1px solid #bbf7d0",
        }}>
          <EnvironmentOutlined style={{ color: "#16a34a", fontSize: 12 }} />
          <div>
            <div style={{ fontSize: 9.5, color: "#16a34a", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Currently At</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#14532d" }}>{currentFactory}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────
function ResultCard({ data }) {
  const { vehicleBusy, vehicle, currentTrip, driver, route, lastMovement } = data;

  const phase = PHASE_CONFIG[currentTrip?.phase] || null;
  const state = TRIP_STATE_CONFIG[currentTrip?.tripState] || null;
  const load  = LOAD_CONFIG[currentTrip?.loadStatus] || null;

  const formatDate = (d) =>
    d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div style={{ animation: "vsSlideIn .2s ease" }}>
      {/* ── Vehicle Card ── */}
      <div style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: vehicleBusy ? "#fff7ed" : "#f0fdf4",
            border: `1px solid ${vehicleBusy ? "#fed7aa" : "#bbf7d0"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <CarOutlined style={{
              fontSize: 20,
              color: vehicleBusy ? "#f97316" : "#22c55e",
            }} />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 15, fontWeight: 800, color: "#0f172a",
              letterSpacing: 1, fontFamily: "monospace",
            }}>
              {vehicle.vehicleNumber}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              {vehicle.type || "Vehicle"}
            </div>
          </div>

          <VehicleStatusBar vehicleBusy={vehicleBusy} />
        </div>
      </div>

      {/* ── Free State ── */}
      {!vehicleBusy && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "20px", borderRadius: 10,
          background: "#f8fafc", border: "1px dashed #e2e8f0",
          color: "#94a3b8", fontSize: 12,
        }}>
          <CheckCircleOutlined style={{ color: "#22c55e" }} />
          Vehicle is available for a new trip
        </div>
      )}

      {/* ── Busy State ── */}
      {vehicleBusy && currentTrip && (
        <>
          {/* Status Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
            {phase && <Tag label={phase.label} color={phase.color} bg={phase.bg} />}
            {state && <Tag label={state.label} color={state.color} bg={state.bg} />}
            {load  && <Tag label={load.label}  color={load.color}  bg={load.bg} />}
            {currentTrip.purpose && (
              <Tag label={currentTrip.purpose} color="#4f46e5" bg="#eff6ff" />
            )}
          </div>

          {/* Route */}
          <Section title="Route">
            <RouteDisplay
              source={route.sourceFactory?.name || route.externalSource}
              destination={route.destinationFactory?.name}
              currentFactory={vehicle.currentFactory?.name}
            />
          </Section>

          {/* Driver */}
          {driver && (
            <Section title="Driver">
              <InfoRow icon={<UserOutlined />}  label="Name"    value={driver.driverName} />
              <InfoRow icon={<PhoneOutlined />}  label="Contact" value={driver.driverContact ? `+91 ${driver.driverContact}` : null} />
            </Section>
          )}

          {/* Timeline */}
          <Section title="Timeline">
            <InfoRow icon={<ThunderboltOutlined />} label="Trip Started" value={formatDate(currentTrip.startedAt)} />
            <InfoRow icon={<SyncOutlined />}         label="Last Updated" value={formatDate(currentTrip.updatedAt)} />
            {lastMovement && (
              <InfoRow
                icon={<ClockCircleOutlined />}
                label="Last Event"
                value={lastMovement.action || lastMovement.status || JSON.stringify(lastMovement).slice(0, 40)}
              />
            )}
          </Section>
        </>
      )}
    </div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────
export default function VehicleStatusDrawer({ open, onClose }) {
  const [query,    setQuery]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(
    debounce(async (val) => {
      const clean = val.replace(/[\s-]/g, "").toUpperCase();
      if (clean.length < 4) { setResult(null); setSearched(false); return; }
      setLoading(true); setSearched(true);
      try {
        const res = await api.get(`/vehicle/live-status/${clean}`);
        setResult(res.data);
      } catch (e) {
        setResult(e.response?.status === 404 ? "notfound" : "error");
      } finally {
        setLoading(false);
      }
    }, 600),
    []
  );

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    doSearch(val);
  };

  const handleClose = () => {
    setQuery(""); setResult(null); setSearched(false); setLoading(false);
    onClose();
  };

  return (
    <>
      <style>{`
        @keyframes vsPulse {
          0%, 100% { transform: scale(1); opacity: 0.25; }
          50%       { transform: scale(2.4); opacity: 0; }
        }
        @keyframes vsSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes vsSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .vs-search-input::placeholder { color: #94a3b8 !important; }
        .vs-search-input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.08) !important; }
        .vs-close-btn:hover { background: #f1f5f9 !important; }
        /* Remove last InfoRow border */
        .vs-section-body > div:last-child { border-bottom: none !important; }
      `}</style>

      <Drawer
        open={open}
        onClose={handleClose}
        placement="right"
        width={380}
        closable={false}
        styles={{
          body:    { padding: 0, background: "#f8fafc" },
          header:  { display: "none" },
          wrapper: { boxShadow: "-4px 0 24px rgba(15,23,42,.08)" },
        }}
      >
        {/* ── Header ── */}
        <div style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "16px 16px 14px",
        }}>
          {/* Title row */}
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", marginBottom: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "#f1f5f9", border: "1px solid #e2e8f0",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <CarOutlined style={{ fontSize: 15, color: "#475569" }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: -0.2 }}>
                  Vehicle Tracker
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>Live status lookup</div>
              </div>
            </div>

            <button
              className="vs-close-btn"
              onClick={handleClose}
              style={{
                width: 28, height: 28, borderRadius: 7,
                border: "1px solid #e2e8f0",
                background: "#ffffff", color: "#64748b",
                cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 11, transition: "background .15s",
              }}
            >
              <CloseOutlined />
            </button>
          </div>

          {/* Search */}
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
              color: "#94a3b8", fontSize: 14, pointerEvents: "none", zIndex: 1,
              display: "flex", alignItems: "center",
            }}>
              {loading
                ? <LoadingOutlined style={{ animation: "vsSpin .7s linear infinite", color: "#6366f1" }} />
                : <SearchOutlined />}
            </span>
            <input
              className="vs-search-input"
              value={query}
              onChange={handleChange}
              placeholder="Enter vehicle number — MH12AB1234"
              autoFocus
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "9px 12px 9px 36px",
                borderRadius: 8, border: "1.5px solid #e2e8f0",
                background: "#f8fafc", color: "#0f172a",
                fontSize: 12.5, fontWeight: 600, outline: "none",
                fontFamily: "monospace", letterSpacing: 0.5,
                transition: "border-color .15s, box-shadow .15s",
              }}
            />
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{
          padding: 14,
          overflowY: "auto",
          height: "calc(100vh - 116px)",
        }}>
          {!searched && !loading && <EmptyState type="idle" />}
          {searched && !loading && result === "notfound" && <EmptyState type="notfound" />}
          {searched && !loading && result === "error"    && <EmptyState type="error" />}
          {searched && !loading && result && typeof result === "object" && <ResultCard data={result} />}
        </div>
      </Drawer>
    </>
  );
}