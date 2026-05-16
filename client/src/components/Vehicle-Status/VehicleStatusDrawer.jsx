import { useState, useRef, useCallback } from "react";
import { Drawer, Input } from "antd";
import api from "../../../services/API/Api/api";

// ─── Debounce ─────────────────────────────────────────────────────────────────
function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// ─── Status Config ────────────────────────────────────────────────────────────
const PHASE_CONFIG = {
  SOURCE:      { label: "At Source",      color: "#6366f1", bg: "#eef2ff", dot: "#6366f1" },
  ENROUTE:     { label: "En Route",       color: "#f59e0b", bg: "#fffbeb", dot: "#f59e0b" },
  DESTINATION: { label: "At Destination", color: "#10b981", bg: "#ecfdf5", dot: "#10b981" },
};

const TRIP_STATE_CONFIG = {
  active:    { label: "Active",    color: "#10b981", bg: "#ecfdf5" },
  completed: { label: "Completed", color: "#6b7280", bg: "#f3f4f6" },
  cancelled: { label: "Cancelled", color: "#ef4444", bg: "#fef2f2" },
};

const LOAD_CONFIG = {
  loaded:   { label: "Loaded",   icon: "📦", color: "#6366f1" },
  unloaded: { label: "Unloaded", icon: "📭", color: "#94a3b8" },
  loading:  { label: "Loading",  icon: "⏳", color: "#f59e0b" },
};

// ─── Pill Badge ───────────────────────────────────────────────────────────────
function Pill({ label, color, bg }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px",
      borderRadius: 20, background: bg, color,
      letterSpacing: 0.4, whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "5px 0" }}>
      <span style={{ fontSize: 13, width: 18, flexShrink: 0 }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
        <div style={{ fontSize: 12, color: "#1e293b", fontWeight: 600, marginTop: 1 }}>{value}</div>
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, color = "#6366f1", children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 9.5, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: 1 }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: `${color}25` }} />
      </div>
      <div style={{
        background: "#f8fafc", borderRadius: 10,
        border: "1px solid #f1f5f9", padding: "6px 12px",
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Live Dot ─────────────────────────────────────────────────────────────────
function LiveDot({ color }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 10, height: 10 }}>
      <span style={{
        position: "absolute", width: 10, height: 10, borderRadius: "50%",
        background: color, opacity: 0.3,
        animation: "vehiclePulse 1.8s ease-in-out infinite",
      }} />
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, position: "relative" }} />
    </span>
  );
}

// ─── Empty / Idle State ───────────────────────────────────────────────────────
function EmptyState({ type }) {
  const configs = {
    idle:     { icon: "🔍", title: "Search a vehicle", sub: "Enter a vehicle number to see its live status" },
    notfound: { icon: "🚫", title: "Vehicle not found", sub: "No vehicle matched that number" },
    error:    { icon: "⚠️", title: "Something went wrong", sub: "Could not fetch vehicle status" },
  };
  const c = configs[type];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", gap: 10 }}>
      <div style={{ fontSize: 38 }}>{c.icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>{c.title}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", lineHeight: 1.5 }}>{c.sub}</div>
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────
function ResultCard({ data }) {
  const { vehicleBusy, vehicle, currentTrip, driver, route, lastMovement } = data;

  const phase   = PHASE_CONFIG[currentTrip?.phase] || null;
  const state   = TRIP_STATE_CONFIG[currentTrip?.tripState] || null;
  const load    = LOAD_CONFIG[currentTrip?.loadStatus] || null;

  const formatDate = (d) => d ? new Date(d).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }) : null;

  return (
    <div style={{ animation: "slideIn .22s ease" }}>
      {/* ── Vehicle Header ── */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        borderRadius: 14, padding: "16px 18px", marginBottom: 14,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position:"absolute", top:-20, right:-20, width:90, height:90, borderRadius:"50%", background:"rgba(99,102,241,.1)" }}/>
        <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: vehicleBusy ? "linear-gradient(135deg,#f59e0b,#d97706)" : "linear-gradient(135deg,#10b981,#059669)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            boxShadow: vehicleBusy ? "0 4px 14px rgba(245,158,11,.4)" : "0 4px 14px rgba(16,185,129,.4)",
          }}>
            {vehicleBusy ? "🚛" : "🅿️"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: "#f8fafc", letterSpacing: 1, fontFamily: "monospace" }}>
                {vehicle.vehicleNumber}
              </span>
              {vehicleBusy && phase && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <LiveDot color={phase.dot} />
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              {vehicleBusy
                ? `On trip · ${vehicle.type || "Vehicle"}`
                : "Currently free — no active trip"}
            </div>
          </div>
          <Pill
            label={vehicleBusy ? "BUSY" : "FREE"}
            color={vehicleBusy ? "#f59e0b" : "#10b981"}
            bg={vehicleBusy ? "rgba(245,158,11,.15)" : "rgba(16,185,129,.15)"}
          />
        </div>
      </div>

      {/* ── Free state ── */}
      {!vehicleBusy && (
        <div style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8", fontSize: 13 }}>
           Vehicle is available for a new trip
        </div>
      )}

      {/* ── Busy state details ── */}
      {vehicleBusy && currentTrip && (
        <>
          {/* Trip Status Bar */}
          <div style={{
            display: "flex", gap: 6, marginBottom: 14,
            background: "#f8fafc", borderRadius: 10, padding: "8px 12px",
            border: "1px solid #f1f5f9",
          }}>
            {phase && <Pill label={phase.label} color={phase.color} bg={phase.bg} />}
            {state && <Pill label={state.label} color={state.color} bg={state.bg} />}
            {load  && (
              <span style={{ fontSize: 11, fontWeight: 600, color: load.color, display: "flex", alignItems: "center", gap: 4 }}>
                {load.icon} {load.label}
              </span>
            )}
            {currentTrip.purpose && (
              <Pill label={currentTrip.purpose} color="#6366f1" bg="#eef2ff" />
            )}
          </div>

          {/* Route */}
          <Section title="Route" color="#6366f1">
            <InfoRow icon={(<i class="ri-building-fill"></i>)} label="Source"      value={route.sourceFactory?.name      || route.externalSource || "—"} />
            <InfoRow icon={(<i class="ri-map-pin-2-fill"></i>)} label="Destination" value={route.destinationFactory?.name || "—"} />
            {vehicle.currentFactory && (
              <InfoRow icon={(<i class="ri-map-pin-2-fill"></i>)} label="Currently At" value={vehicle.currentFactory.name} />
            )}
          </Section>

          {/* Driver */}
          {driver && (
            <Section title="Driver" color="#0891b2">
              <InfoRow icon={(<i class="ri-user-fill"></i>)} label="Name"    value={driver.driverName} />
              <InfoRow icon={(<i class="ri-phone-fill"></i>)} label="Contact" value={driver.driverContact ? `+91 ${driver.driverContact}` : null} />
            </Section>
          )}

          {/* Timeline */}
          <Section title="Timeline" color="#7c3aed">
            <InfoRow icon={(<i class="ri-alarm-fill"></i>)} label="Trip Started" value={formatDate(currentTrip.startedAt)} />
            <InfoRow icon={(<i class="ri-refresh-fill"></i>)} label="Last Updated" value={formatDate(currentTrip.updatedAt)} />
            {lastMovement && (
              <InfoRow icon={(<i class="ri-alarm-fill"></i>)} label="Last Event"  value={lastMovement.action || lastMovement.status || JSON.stringify(lastMovement).slice(0,40)} />
            )}
          </Section>
        </>
      )}
    </div>
  );
}

// ─── Main Drawer Component ────────────────────────────────────────────────────
export default function VehicleStatusDrawer({ open, onClose }) {
  const [query,   setQuery]   = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);   // null | "notfound" | "error" | data{}
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
        @keyframes vehiclePulse { 0%,100%{transform:scale(1);opacity:.3} 50%{transform:scale(2.2);opacity:0} }
        @keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      <Drawer
        open={open}
        onClose={handleClose}
        placement="right"
        width={380}
        closable={false}
        styles={{
          body:   { padding: 0, background: "#f8fafc" },
          header: { display: "none" },
          wrapper:{ boxShadow: "-8px 0 40px rgba(0,0,0,.12)" },
        }}
      >
        {/* ── Drawer Header ── */}
        <div style={{
          background: "linear-gradient(135deg, #1e1b4b, #312e81)",
          padding: "18px 20px 16px", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position:"absolute", top:-30, right:-30, width:130, height:130, borderRadius:"50%", background:"rgba(165,180,252,.08)" }}/>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:"rgba(255,255,255,.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🚛</div>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:"#f8fafc", letterSpacing:-.2 }}>Vehicle Tracker</div>
                <div style={{ fontSize:9.5, color:"rgba(255,255,255,.5)", fontWeight:400 }}>Live status lookup</div>
              </div>
            </div>
            <button onClick={handleClose} style={{
              width:28, height:28, borderRadius:8, border:"none",
              background:"rgba(255,255,255,.12)", color:"#fff",
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:13, transition:"background .15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,.22)"}
              onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,.12)"}
            >✕</button>
          </div>

          {/* Search Input */}
          <div style={{ position: "relative" }}>
            <span style={{
              position:"absolute", left:11, top:"50%", transform:"translateY(-50%)",
              fontSize:14, pointerEvents:"none", zIndex:1,
            }}>
              {loading
                ? <span style={{ display:"inline-block", animation:"spin .7s linear infinite" }}><i className="ri-loader-2-line"></i></span>
                : <i className="ri-search-ai-line"></i>}
            </span>
            <input
              value={query}
              onChange={handleChange}
              placeholder="Enter vehicle number…  e.g. MH12AB1234"
              autoFocus
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "9px 12px 9px 36px",
                borderRadius: 10, border: "1.5px solid rgba(255,255,255,.15)",
                background: "rgba(255,255,255,.1)", color: "#f8fafc",
                fontSize: 13, fontWeight: 600, outline: "none",
                fontFamily: "monospace", letterSpacing: .5,
                backdropFilter: "blur(8px)",
                transition: "border-color .2s",
              }}
              onFocus={e  => e.target.style.borderColor="rgba(165,180,252,.6)"}
              onBlur={e   => e.target.style.borderColor="rgba(255,255,255,.15)"}
            />
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: 16, overflowY: "auto", height: "calc(100vh - 130px)" }}>
          {!searched && !loading && <EmptyState type="idle" />}
          {searched && !loading && result === "notfound" && <EmptyState type="notfound" />}
          {searched && !loading && result === "error"    && <EmptyState type="error" />}
          {searched && !loading && result && typeof result === "object" && <ResultCard data={result} />}
        </div>
      </Drawer>
    </>
  );
}