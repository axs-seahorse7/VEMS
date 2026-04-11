import { Timeline, Tag, Steps, Divider,  Watermark   } from "antd";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isPUCExpired(date) {
  if (!date) return false;
  return new Date(date) < new Date();
}

function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

const Icon = {
  truck: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  list: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  refresh: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  alert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  signout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  map: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
  package: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  location: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
};

// ─── Card accent colours keyed on loadStatus ──────────────────────────────────
const LOAD_STATUS_THEME = {
  pending: {
    border: "#E2E8F0",        // soft slate
    accent: "#6366F1",        // muted indigo
    bg: "#FFFF",            // light neutral
    dot: "#6366F1",
    label: "#4F46E5",
    labelBg: "#EEF2FF"
  },

  loaded: {
    border: "#BBF7D0",        // soft mint border
    accent: "#059669",        // emerald (muted)
    bg: "#F0FDF4",            // soft green bg
    dot: "#10B981",
    label: "#047857",
    labelBg: "#D1FAE5"
  },

  unloaded: {
    border: "#C7D2FE",        // soft indigo border (NOT red)
    accent: "#4F46E5",        // deep indigo
    bg: "#F5F7FF",            // cool subtle bg
    dot: "#6366F1",
    label: "#4338CA",
    labelBg: "#E0E7FF"
  }
};

const vehicleTypeLabel = {
  truck: "Truck", miniTruck: "Mini Truck", containerTruck: "Container Truck",
  mixerTruck: "Mixer Truck", waterTanker: "Water Tanker", tractor: "Tractor",
  car: "Car", bus: "Bus", ambulance: "Ambulance",
};

const STAGE_META = {
  waiting:  { label: "Waiting",  bg: "#fef9c3", color: "#92400e" },
  inside:   { label: "Inside Factory",   bg: "#dcfce7", color: "#15803d" },
  enroute:  { label: "In Transit", bg: "#dbeafe", color: "#1d4ed8" },
  unknown:  { label: "Unknown",  bg: "#f3f4f6", color: "#6b7280" },
};

// ─── Action icon + colour for each timeline event ─────────────────────────────
const ACTION_META = {
  created:  { icon: "ri-add-circle-line",      color: "#6366f1", label: "Created"   },
  checkin:  { icon: "ri-login-box-line",        color: "#2563eb", label: "Check-in"  },
  checkout: { icon: "ri-logout-box-r-line",     color: "#7c3aed", label: "Check-out" },
  load:     { icon: "ri-stack-line",            color: "#16a34a", label: "Loaded"    },
  unload:   { icon: "ri-stack-overflow-line",   color: "#d97706", label: "Unloaded"  },
  cancel:   { icon: "ri-close-circle-line",     color: "#dc2626", label: "Cancelled" },
  complete: { icon: "ri-checkbox-circle-line",  color: "#059669", label: "Completed" },
  // fallback for legacy entries that only have status / location
  ARRIVED:  { icon: "ri-map-pin-2-line",        color: "#2563eb", label: "Arrived"   },
  DEPARTED: { icon: "ri-arrow-right-circle-line",color:"#7c3aed", label: "Departed"  },
};

function Badge({ stage }) {
  const s = STAGE_META[stage] || STAGE_META.unknown;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 10.5, fontWeight: 700, borderRadius: 5, padding: "2px 7px", letterSpacing: .3, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function TypeBadge({ type }) {
  return (
    <span style={{ background: "#f3f4f6", color: "#374151", fontSize: 10.5, fontWeight: 600, borderRadius: 5, border: "1px solid #d1d5db", padding: "2px 7px", whiteSpace: "nowrap" }}>
      {vehicleTypeLabel[type] || type}
    </span>
  );
}

const getActionMeta = (entry) => {
  switch (entry.action?.type) {
    case "created": return { label: "Created", color: "#3b82f6", icon: "ri-add-line" };
    case "checkin": return { label: "Check In", color: "#10b981", icon: "ri-login-box-line" };
    case "checkout": return { label: "Check Out", color: "#f59e0b", icon: "ri-logout-box-line" };
    case "load": return { label: "Loaded", color: "#6366f1", icon: "ri-upload-line" };
    case "unload": return { label: "Unloaded", color: "#ef4444", icon: "ri-download-line" };
    case "complete": return { label: "Completed", color: "#22c55e", icon: "ri-checkbox-circle-line" };
    default: return { label: entry.status, color: "#9ca3af", icon: "ri-time-line" };
  }
};



// ─── VehicleCard ──────────────────────────────────────────────────────────────
export default function VehicleCard({ vehicle, onClick }) {
  const vehicleData = vehicle.vehicle || {};
  const location    = vehicle.location;
  const phase       = vehicle.phase;
  const pucAlert    = isPUCExpired(vehicleData?.PUCExpiry);
  const loadStatus  = vehicle?.loadStatus || "pending";
  const theme       = LOAD_STATUS_THEME[loadStatus] || LOAD_STATUS_THEME.pending;
  const tripHistory = Array.isArray(vehicle.tripHistory) ? vehicle.tripHistory : [];
    console.log("vehicle inside card", vehicle)
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", gap: 0,
        border: `1px solid ${theme.border}`,
        background: theme.bg,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 2px 4px rgba(0,0,0,0.07)",
        cursor: "pointer", transition: "all .15s", position: "relative",
        // left accent bar
        borderLeft: `1px solid ${theme.border}`,
        opacity: vehicle?.tripState === "CLOSED" ? 0.4 : 1
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 6px 20px ${theme.accent}22, 0 0 0 1.5px ${theme.accent}`;
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.07)";
        e.currentTarget.style.transform = "";
      }}
    >
      {/* ── Card Body ── */}
      <div style={{ padding: "12px 14px 10px" }}>
        {/* PUC alert */}
        {pucAlert && (
          <div style={{ position: "absolute", top: 10, right: 10, color: "#dc2626", width: 14, height: 14 }} title="PUC Expired">
            {Icon.alert}
          </div>
        )}

        {/* Top Row — vehicle number + badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: theme.accent + "18", display: "flex", alignItems: "center", justifyContent: "center", color: theme.accent, flexShrink: 0 }}>
            <span style={{ width: 17, height: 17 }}>{Icon.truck}</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: "#111", letterSpacing: .2 }}>{vehicleData?.vehicleNumber}</div>
            <div style={{ fontSize: 10.5, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vehicleData?.transporterName}</div>
          </div>
          {phase && (
            <Tag style={{ marginLeft: "auto", fontSize: 9, fontWeight: 800, letterSpacing: .6, textTransform: "uppercase", padding: "1px 6px", flexShrink: 0, background: phase === "ORIGIN" ? "#ede9fe" : "#dcfce7", color: phase === "ORIGIN" ? "#6366f1" : "#15803d", border: "none" }}>
              <i className="ri-map-pin-line" style={{ fontSize: 11 }} /> {phase}
            </Tag>
          )}
          <Tag color={vehicle.type === "external_delivery" ? "red" : "cyan"} style={{ fontWeight: 700, letterSpacing: .6, flexShrink: 0 }}>
            {vehicle.type === "external_delivery" ? "External" : "Internal"}
          </Tag>
        </div>
          <Divider />
        {/* Type + Location badges */}
        <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
          <TypeBadge type={vehicleData?.typeOfVehicle} />
          <Badge stage={location === "outside_factory" ? "waiting" : location === "inside_factory" ? "inside" : "enroute"} />
          {/* Load Status badge */}
          <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: theme.labelBg, color: theme.label, textTransform: "uppercase", letterSpacing: .5 }}>
            {loadStatus}
          </span>
        </div>

        {/* Info rows */}
        <div style={{ fontSize: 11.5, color: "#374151", display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 11, height: 11, color: "#9ca3af", flexShrink: 0 }}><i className="ri-map-pin-user-line" /></span>
            <span>Driver — <span className="text-blue-800 font-semibold">{vehicleData?.driverName}</span></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 11, height: 11, color: "#9ca3af", flexShrink: 0 }}><i className="ri-truck-fill" /></span>
            <span>Type — <span className="text-blue-800 font-semibold">{vehicle?.purpose === "pickup" ? "Pickup" : "Delivery"}</span></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 11, height: 11, color: "#9ca3af", flexShrink: 0 }}><i className="ri-route-line" /></span>
            <span>Route — <span className="text-blue-800 font-semibold">
              {/* {vehicleData.type === "internal_transfer"? `${vehicle.sourceFactoryId?.name || "Source"} → ${vehicle?.destinationFactory?.name || "Dest"}`
                : `External → ${vehicle?.destinationFactory?.name || "—"}`} */}
                {vehicle.type === "internal_transfer"
                  ? `${vehicle.sourceFactory?.name || "Source"} → ${vehicle.destinationFactory?.name || "Dest"}`
                  : `External → ${vehicle.destinationFactory ? vehicle.destinationFactory.name : "UNKOWN"}`}

            </span>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 11, height: 11, color: "#9ca3af", flexShrink: 0 }}><i className="ri-restart-fill" /></span>
            <span>
                Load —{" "}
                <span className="text-blue-800 font-semibold">
                    {loadStatus.charAt(0).toUpperCase() + loadStatus.slice(1)}
                </span>
            </span>          
        </div>
        </div>
      </div>

    </div>
  );
}