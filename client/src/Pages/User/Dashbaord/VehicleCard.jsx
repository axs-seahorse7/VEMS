import { useState, useEffect } from "react";
import { Tag, Divider, Badge } from "antd";

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

// Returns hours since trip was created
function hoursWaiting(createdAt) {
  if (!createdAt) return 0;
  return (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
}

const Icon = {
  truck: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  alert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// ─── State-based top border colors ────────────────────────────────────────────

const STATE_BORDER = {
  waiting: { bar: "linear-gradient(90deg, #f59e0b, #d97706, #f59e0b)", glow: "#f59e0b" },
  inside:  { bar: "linear-gradient(90deg, #10b981, #059669, #10b981)", glow: "#10b981" },
  enroute: { bar: "linear-gradient(90deg, #3b82f6, #2563eb, #3b82f6)", glow: "#3b82f6" },
  closed:  { bar: "linear-gradient(90deg, #94a3b8, #64748b, #94a3b8)", glow: "#94a3b8" },
  unknown: { bar: "linear-gradient(90deg, #e5e7eb, #d1d5db, #e5e7eb)", glow: "#d1d5db" },
};

const LOAD_STATUS_THEME = {
  pending:  { border: "#E2E8F0", accent: "#6366F1", bg: "#FFFFFF", dot: "#6366F1", label: "#4F46E5", labelBg: "#EEF2FF" },
  loaded:   { border: "#BBF7D0", accent: "#059669", bg: "#F0FDF4", dot: "#10B981", label: "#047857", labelBg: "#D1FAE5" },
  unloaded: { border: "#C7D2FE", accent: "#4F46E5", bg: "#F5F7FF", dot: "#6366F1", label: "#4338CA", labelBg: "#E0E7FF" },
};

// Premium amber override theme for long-waiting cards
const OVERDUE_THEME = {
  border: "#fde68a",
  accent: "#d97706",
  bg: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 60%, #fde68a22 100%)",
  dot: "#d97706",
  label: "#92400e",
  labelBg: "#fef3c7",
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
  closed: { label: "Closed",  bg: "#D6F4ED",  color: "#3A8B95" },
  canceled: { label: "Canceled",  bg: "#fee2e2",  color: "#dc2626" },
  unknown: { label: "Unknown",  bg: "#f3f4f6", color: "#6b7280" },
};

function CBadge({ stage }) {
  const s = STAGE_META[stage] || STAGE_META.unknown;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 9.5, fontWeight: 700, borderRadius: 4, padding: "1px 6px", letterSpacing: .3, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function InfoRow({ icon, iconColor, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "#374151" }} className="border-b  border-gray-100 " >
      <i className={`${icon}`} style={{ fontSize: 11, color: iconColor, width: 13, textAlign: "center", flexShrink: 0 }} />
      <span style={{ color: "black", flexShrink: 0, width: 50 }}>{label}</span>
      <span style={{ fontWeight: 600, color: "#1e40af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

// ─── VehicleCard ──────────────────────────────────────────────────────────────
export default function VehicleCard({ vehicle, onClick }) {
  const vehicleData  = vehicle.vehicle || {};
  const location     = vehicle.location;
  const phase        = vehicle.phase;
  const pucAlert     = isPUCExpired(vehicleData?.PUCExpiry);
  const loadStatus   = vehicle?.loadStatus || "pending";
  const user         = (() => { try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; } })();

  // ── Overdue logic ────────────────────────────────────────────────────────
  // A card is "overdue" when: still waiting outside AND has been waiting > 4 hrs
  const isWaiting    = location === "outside_factory" && vehicle.tripState !== "CLOSED";
  const waitingHrs   = hoursWaiting(vehicle?.createdAt);
  const isOverdue    = isWaiting && waitingHrs >= 4;
  console.log("vehicle trip state:", vehicle?.tripState);
  console.log("vehicle in waiting:", isWaiting, waitingHrs);
  // ── Shake toggle: fires every 30 s, active for ~1 s ─────────────────────
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (!isOverdue) return;
    const trigger = () => {
      setShaking(true);
      setTimeout(() => setShaking(false), 900);
    };
    trigger(); // fire immediately on mount too
    const id = setInterval(trigger, 10_000);
    return () => clearInterval(id);
  }, [isOverdue]);

  // ── Theme ────────────────────────────────────────────────────────────────
  const baseTheme  = LOAD_STATUS_THEME[loadStatus] || LOAD_STATUS_THEME.pending;
  const theme      = isOverdue ? OVERDUE_THEME : baseTheme;

  // ── State key for border bar ─────────────────────────────────────────────
  const stageKey = (() => {
    if (vehicle?.tripState === "CLOSED") return "closed";
    if (vehicle?.tripState === "CANCELED") return "canceled";
    if (location === "inside_factory") return "inside";
    if (location === "enroute") return "enroute";
    if (location === "outside_factory") return "waiting";
    return "unknown";
  })();

  const borderMeta = STATE_BORDER[stageKey];

  const route =
  vehicle.type === "internal_transfer" ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      {vehicle.sourceFactory?.name || "Source"}
      <i class="ri-arrow-right-long-line"></i>
      {vehicle.destinationFactory?.name || "Dest"}
    </span>
  ) : (
    <span>
      External <i class="ri-arrow-right-long-line"></i> {vehicle.destinationFactory?.name || "Unknown"}
    </span>
  );

  const isAtOrigin      = phase === "ORIGIN";
  const isAtDestination = phase === "DESTINATION";
  const isAtInTransit     = vehicle.status === "IN_TRANSIT";

  const materialNames = Array.isArray(vehicle?.materials)
  ? vehicle.materials
      .filter((m) => m && m.material) // remove null / invalid
      .map((m) =>
        typeof m.material === "string"
          ? m.material
          : m.material?.name
      )
  : [];

  return (
    <>
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.3; transform: scale(0.6); }
        }

        /* Gentle but noticeable shake — premium feel */
        @keyframes cardShake {
          0%   { transform: translateX(0)    rotate(0deg); }
          10%  { transform: translateX(-4px) rotate(-0.6deg); }
          20%  { transform: translateX(4px)  rotate(0.6deg); }
          30%  { transform: translateX(-3px) rotate(-0.4deg); }
          40%  { transform: translateX(3px)  rotate(0.4deg); }
          50%  { transform: translateX(-2px) rotate(-0.2deg); }
          60%  { transform: translateX(2px)  rotate(0.2deg); }
          70%  { transform: translateX(-1px) rotate(-0.1deg); }
          80%  { transform: translateX(1px)  rotate(0.1deg); }
          90%  { transform: translateX(0)    rotate(0deg); }
          100% { transform: translateX(0)    rotate(0deg); }
        }

        /* Slow amber shimmer across the card background */
        // @keyframes ambientGlow {
        //   0%, 100% { box-shadow: 0 0 0 1.5px #d97706, 0 4px 20px #f59e0b33; }
        //   50%       { box-shadow: 0 0 0 1.5px #f59e0b, 0 6px 28px #f59e0b55; }
        // }

        /* Top bar slide shimmer */
        @keyframes barShimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }

        .vehicle-card-overdue {
          animation: ambientGlow 2.4s ease-in-out infinite;
        }
        .vehicle-card-overdue.shaking {
          animation: cardShake 0.9s ease-in-out, ambientGlow 2.4s ease-in-out infinite;
        }
        .state-bar {
          height: 3px;
          background-size: 200% auto;
          animation: barShimmer 3s linear infinite;
        }
      `}</style>

      <div
        onClick={onClick}
        className={isOverdue ? ` vehicle-card-overdue border border-gray-200 shadow-sm ${shaking ? " shaking" : ""}  ` : "border border-gray-200 shadow-sm "}
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: 10,
          overflow: "hidden",
          // boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          cursor: "pointer",
          transition: "box-shadow .15s, transform .15s",
          position: "relative",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = `0 4px 16px ${theme.accent}22, 0 0 0 1.5px ${theme.accent}`;
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
          e.currentTarget.style.transform = "";
        }}
        
      >
        {/* ── State-based top accent bar ── */}
        <div
          className="state-bar"
          style={{ background: borderMeta.bar }}
          title={`Vehicle is ${stageKey}`}
        />

        {/* ── Overdue amber corner badge ── */}
        {isOverdue && (
          <div style={{
            position: "absolute",
            top: 7,
            right: 8,
            display: "flex",
            alignItems: "center",
            gap: 3,
            background: "linear-gradient(90deg, #ca8a04, #fcd34d)",
            color: "#fff",
            fontSize: 8.5,
            fontWeight: 500,
            letterSpacing: 1,
            padding: "1px 6px",
            borderRadius: 4,
            boxShadow: "0 1px 6px #f59e0b55",
            zIndex: 2,
          }}>
             {Math.floor(waitingHrs)}h waiting
          </div>
        )}

        <div style={{ padding: "9px 12px 10px", paddingTop: isOverdue ? 22 : 9 }}>

          

          {/* ── Row 1: Icon + Vehicle No + Phase + Type tags ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: theme.accent + "18",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: theme.accent, flexShrink: 0,
            }}>
              <span style={{ width: 15, height: 15 }}>{Icon.truck}</span>
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 800, fontSize: 12.5, color: "#111", letterSpacing: .2, lineHeight: 1.2 }}>
                {vehicleData?.vehicleNumber}
                {pucAlert && (
                  <div style={{  color: "#dc2626", width: 14, height: 14 }} title="PUC Expired">
                    {Icon.alert}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 10, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {vehicleData?.transporterName} {/* PUC alert */}

              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              {phase && (
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
              )}

              <Tag
                color={vehicle.type === "external_delivery" ? "red" : "cyan"}
                style={{ fontSize: 9, fontWeight: 700, letterSpacing: .5, margin: 0, padding: "1px 5px" }}
              >
                {vehicle.type === "external_delivery" ? "External" : "Internal"}
              </Tag>
            </div>
          </div>

          {/* ── Row 2: Status badges ── */}
          <div style={{ display: "flex", gap: 4, marginBottom: 7, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ background: "#f3f4f6", color: "#374151", fontSize: 9.5, fontWeight: 600, borderRadius: 4, border: "1px solid #e5e7eb", padding: "1px 6px", whiteSpace: "nowrap" }}>
              {vehicleTypeLabel[vehicleData?.typeOfVehicle] || vehicleData?.typeOfVehicle}
            </span>

            <CBadge stage={stageKey} />

            {(user.factoryId === vehicle.sourceFactoryId ||
              user.factoryId === vehicle.destinationFactory?._id) && (
              <span 
                style={{
                  fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                  background: theme.labelBg, color: theme.label,
                  textTransform: "uppercase", letterSpacing: .4,
              }}>
                  {user.factory._id === vehicle.destinationFactory?._id ? "Incoming" : "Outgoing"}
              </span>
            )}
          </div>

          <Divider style={{ margin: "5px 0" }} />

          {/* ── Row 3: Info rows ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <InfoRow icon="ri-map-pin-user-line" iconColor="#2563eb" color={theme.label} label="Driver" value={vehicleData?.driverName || "—"} />
            <InfoRow
              icon="ri-truck-fill" iconColor="#ea580c"
              label="Purpose"
              value={vehicle?.purpose === "Pickup" ? "Pickup" : "Delivery"}
            />
            <InfoRow icon="ri-route-line" iconColor="#ca8a04" label="Route" value={route} />
            <InfoRow
              icon="ri-restart-fill" iconColor="#059669"
              label="Load"
              value={loadStatus.charAt(0).toUpperCase() + loadStatus.slice(1)}
            />
            <InfoRow
              icon="ri-box-1-line"
              iconColor="#059669"
              label="Material"
              value={materialNames.join(", ") || "Empty"}
              />
            <InfoRow
              icon="ri-time-line" iconColor="#7c3aed"
              label="Trip At"
              value={fmtTime(vehicle?.createdAt)}
            />
          </div>

          {/* ── Origin → Destination tracker ── */}
          <div className="absolute right-5 top-20 flex flex-col items-center text-[10px]">

            {/* ORIGIN */}
            <div className="flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                {isAtOrigin && (
                  <span className="absolute inline-flex w-4 h-4 rounded-full bg-blue-400 opacity-75 animate-ping"></span>
                )}
                <div className="relative w-2 h-2 rounded-full bg-blue-500"></div>
              </div>
              <span className="mt-1 text-blue-600">{vehicle?.sourceFactory?.name || "Out Source"}</span>
            </div>

            {/* GRADIENT LINE */}
            <div className="w-[1.5px] h-4 my-1 rounded-full" style={{ background: "linear-gradient(to bottom, #3b82f6, #10b981)" }}></div>

            {/* DESTINATION */}
            <div className="flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                {isAtInTransit && (
                  <span className="absolute inline-flex w-4 h-4 rounded-full bg-purple-500 opacity-75 animate-ping"></span>
                )}
                <div className={`relative w-2 h-2 rounded-full ${isAtInTransit ? "bg-purple-500" : "bg-purple-500"}`}></div>
              </div>
              <span className={`mt-1 ${isAtInTransit ? "text-purple-600" : "text-purple-500"}`}>
                {"On the way"}
              </span>
            </div>

                <div className="w-[1.5px] h-4 my-1 rounded-full" style={{ background: "linear-gradient(to bottom, #3b82f6, #10b981)" }}></div>

            {/* DESTINATION */}
            <div className="flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                {isAtDestination && (
                  <span className="absolute inline-flex w-4 h-4 rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
                )}
                <div className={`relative w-2 h-2 rounded-full ${isAtDestination ? "bg-emerald-500" :  "bg-gray-300"}`}></div>
              </div>
              <span className={`mt-1 ${isAtDestination ? "text-emerald-600" : "text-gray-400"}`}>
                {vehicle?.destinationFactory?.name || "DESTINATION"}
              </span>
            </div>

          </div>

        </div>
      </div>

    </>
  );
}