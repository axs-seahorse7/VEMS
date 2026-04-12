import { Tag, Divider } from "antd";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isPUCExpired(date) {
  if (!date) return false;
  return new Date(date) < new Date();
}

function fmtTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

const Icon = {
  truck: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  alert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

const LOAD_STATUS_THEME = {
  pending:  { border: "#E2E8F0", accent: "#6366F1", bg: "#FFFFFF", dot: "#6366F1", label: "#4F46E5", labelBg: "#EEF2FF" },
  loaded:   { border: "#BBF7D0", accent: "#059669", bg: "#F0FDF4", dot: "#10B981", label: "#047857", labelBg: "#D1FAE5" },
  unloaded: { border: "#C7D2FE", accent: "#4F46E5", bg: "#F5F7FF", dot: "#6366F1", label: "#4338CA", labelBg: "#E0E7FF" },
};

const vehicleTypeLabel = {
  truck: "Truck", miniTruck: "Mini Truck", containerTruck: "Container Truck",
  mixerTruck: "Mixer Truck", waterTanker: "Water Tanker", tractor: "Tractor",
  car: "Car", bus: "Bus", ambulance: "Ambulance",
};

const STAGE_META = {
  waiting: { label: "Waiting",  bg: "#fef9c3", color: "#92400e" },
  inside:  { label: "Inside",   bg: "#dcfce7", color: "#15803d" },
  enroute: { label: "Transit",  bg: "#dbeafe", color: "#1d4ed8" },
  unknown: { label: "Unknown",  bg: "#f3f4f6", color: "#6b7280" },
};

function Badge({ stage }) {
  const s = STAGE_META[stage] || STAGE_META.unknown;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 9.5, fontWeight: 700, borderRadius: 4, padding: "1px 6px", letterSpacing: .3, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

// ─── Single compact info row ───────────────────────────────────────────────────
function InfoRow({ icon, iconColor, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#374151" }}>
      <i className={`${icon}`} style={{ fontSize: 11, color: iconColor, width: 13, textAlign: "center", flexShrink: 0 }} />
      <span style={{ color: "#9ca3af", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, color: "#1e40af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

// ─── VehicleCard ──────────────────────────────────────────────────────────────
export default function VehicleCard({ vehicle, onClick }) {
  const vehicleData = vehicle.vehicle || {};
  const location    = vehicle.location;
  const phase       = vehicle.phase;
  const pucAlert    = isPUCExpired(vehicleData?.PUCExpiry);
  const loadStatus  = vehicle?.loadStatus || "pending";
  const theme       = LOAD_STATUS_THEME[loadStatus] || LOAD_STATUS_THEME.pending;
  const stageKey    = location === "outside_factory" ? "waiting" : location === "inside_factory" ? "inside" : "enroute";
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const route = vehicle.type === "internal_transfer"
    ? `${vehicle.sourceFactory?.name || "Source"} → ${vehicle.destinationFactory?.name || "Dest"}`
    : `External → ${vehicle.destinationFactory?.name || "Unknown"}`;
  console.log("user", user);
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column",
        border: `1px solid ${theme.border}`,
        background: theme.bg,
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        cursor: "pointer",
        transition: "all .15s",
        position: "relative",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 4px 16px ${theme.accent}22, 0 0 0 1.5px ${theme.accent}`;
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
        e.currentTarget.style.transform = "";
      }}
    >
      {/* ── Top accent bar ── */}
      <div style={{ height: 3, background: theme.accent, opacity: 0.7 }} />

      <div style={{ padding: "9px 12px 10px" }}>

        {/* PUC alert */}
        {pucAlert && (
          <div style={{ position: "absolute", top: 8, right: 8, color: "#dc2626", width: 12, height: 12 }} title="PUC Expired">
            {Icon.alert}
          </div>
        )}

        {/* ── Row 1: Icon + Vehicle No + Phase + Type tags ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
          {/* Truck icon */}
          <div style={{ width: 28, height: 28, borderRadius: 7, background: theme.accent + "18", display: "flex", alignItems: "center", justifyContent: "center", color: theme.accent, flexShrink: 0 }}>
            <span style={{ width: 15, height: 15 }}>{Icon.truck}</span>
          </div>

          {/* Vehicle no + transporter */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 12.5, color: "#111", letterSpacing: .2, lineHeight: 1.2 }}>
              {vehicleData?.vehicleNumber}
            </div>
            <div style={{ fontSize: 10, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {vehicleData?.transporterName}
            </div>
          </div>

          {/* Tags — right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            {/* Phase (live) */}
            {phase && (
              <>
                <style>{`
                  @keyframes livePulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50%       { opacity: 0.3; transform: scale(0.6); }
                  }
                `}</style>
                <Tag style={{
                  fontSize: 8, fontWeight: 800, letterSpacing: .5,
                  textTransform: "uppercase", padding: "1px 5px", margin: 0,
                  background: phase === "ORIGIN" ? "#ede9fe" : "#dcfce7",
                  color: phase === "ORIGIN" ? "#6366f1" : "#15803d",
                  border: "none", display: "flex", alignItems: "center", gap: 3,
                }}>
                  <span style={{
                    width: 4, height: 4, borderRadius: "50%", flexShrink: 0,
                    background: phase === "ORIGIN" ? "#6366f1" : "#15803d",
                    animation: "livePulse 1.8s ease-in-out infinite",
                  }} />
                  {phase === "ORIGIN"
                    ? vehicle.sourceFactory?.name
                    : phase === "DESTINATION"
                    ? vehicle.destinationFactory?.name
                    : phase}
                </Tag>
              </>
            )}

            {/* Internal / External */}
            <Tag
              color={vehicle.type === "external_delivery" ? "red" : "cyan"}
              style={{ fontSize: 8, fontWeight: 700, letterSpacing: .5, margin: 0, padding: "1px 5px" }}
            >
              {vehicle.type === "external_delivery" ? "Ext" : "Int"}
            </Tag>
          </div>
        </div>

        {/* ── Row 2: Status badges ── */}
        <div style={{ display: "flex", gap: 4, marginBottom: 7, flexWrap: "wrap", alignItems: "center" }}>
          {/* Vehicle type */}
          <span style={{ background: "#f3f4f6", color: "#374151", fontSize: 9.5, fontWeight: 600, borderRadius: 4, border: "1px solid #e5e7eb", padding: "1px 6px", whiteSpace: "nowrap" }}>
            {vehicleTypeLabel[vehicleData?.typeOfVehicle] || vehicleData?.typeOfVehicle}
          </span>

          <Badge stage={stageKey} />

          {/* Load status */}
          {/* <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: theme.labelBg, color: theme.label, textTransform: "uppercase", letterSpacing: .4 }}>
            {loadStatus}
          </span> */}

          {(user.factoryId === vehicle.sourceFactoryId ||
          user.factoryId === vehicle.destinationFactory?._id) && (
          
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 4,
              background: theme.labelBg,
              color: theme.label,
              textTransform: "uppercase",
              letterSpacing: .4
            }}
          >
            {user.factory._id === vehicle.destinationFactory?._id
              ? "Incoming"
              : "Outgoing"}
          </span>
        )}

        </div>

        <Divider style={{ margin: "5px 0" }} />

        {/* ── Row 3: Info rows ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <InfoRow icon="ri-map-pin-user-line" iconColor="#2563eb" label="Driver" value={vehicleData?.driverName || "—"} />
          <InfoRow
            icon="ri-truck-fill" iconColor="#ea580c"
            label="Purpose"
            value={vehicle?.purpose === "pickup" ? "Pickup" : "Delivery"}
          />
          <InfoRow icon="ri-route-line" iconColor="#ca8a04" label="Route" value={route} />
          <InfoRow
            icon="ri-restart-fill" iconColor="#059669"
            label="Load"
            value={loadStatus.charAt(0).toUpperCase() + loadStatus.slice(1)}
          />
          <InfoRow
            icon="ri-time-line" iconColor="#7c3aed"
            label="Trip At"
            value={fmtTime(vehicle?.createdAt)}
          />
        </div>

        <div className="absolute right-5 top-20 flex flex-col items-center text-[10px]">
  
          {/* ORIGIN */}
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="mt-1 text-green-600">{vehicle?.sourceFactory?.name || "ORIGIN"}</span>
          </div>

          {/* LINE */}
          <div className={`w-[1px] h-6 ${vehicle.phase === "DESTINATION" ? "bg-emerald-600" : "bg-gray-300"} my-1`}></div>

          {/* DESTINATION */}
          <div className="flex flex-col items-center">
            <div className={`w-2 h-2 rounded-full ${vehicle.phase === "DESTINATION" ? "bg-emerald-600" : "bg-gray-400"}`}></div>
            <span className={`mt-1 ${vehicle.phase === "DESTINATION" ? "text-emerald-600" : "text-gray-400"} `}>{vehicle?.destinationFactory?.name || "DESTINATION"}</span>
          </div>

        </div>

      </div>
    </div>
  );
}