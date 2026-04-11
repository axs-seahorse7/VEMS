import { useState, useEffect, useCallback } from "react";
import api from "../../../../services/API/Api/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, message } from "antd";
import VehicleDetailModal from "./VehicleDetailsModal.jsx";
import CreateVehicleModal from "./CreateVehicalModal.jsx";
import {Tag,  Avatar, Popover } from "antd";
import VehicleCard from "./VehicleCard.jsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isPUCExpired = (d) => new Date(d) < new Date();
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN") : "—";
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";

const getLocationLabel = (loc) => {
  switch (loc) {
    case "atGate": return "Security Gate";
    case "storeSite": return "Store Site";
    default: return "Dispatch";
  }
};


const getVehicleLocation = (vehicle) => {
  if (!vehicle?.state) return "unknown";
  return vehicle.state.status;
};

const getPhase = (vehicle, userFactoryId) => {
  if (!vehicle?.currentTrip || !userFactoryId) return null;
  const sourceId = vehicle.currentTrip.sourceFactoryId;
  const destId = vehicle.currentTrip.destinationFactoryId;
  
  if (String(sourceId) === String(userFactoryId)) return "ORIGIN";
  if (String(destId) === String(userFactoryId)) return "DESTINATION";
  return null;
};

const getWorkflowStage = (vehicle) => {
  const location = getVehicleLocation(vehicle);
  
  if (location === "waiting_outside") return "waiting";
  if (location === "inside_factory") return "inside";
  if (location === "in_transit") return "enroute";
  
  return "unknown";
};

// ─── Stage Metadata ───────────────────────────────────────────────────────────
const STAGE_META = {
  waiting:  { label: "Waiting",  bg: "#fef9c3", color: "#92400e" },
  inside:   { label: "Inside Factory",   bg: "#dcfce7", color: "#15803d" },
  enroute:  { label: "In Transit", bg: "#dbeafe", color: "#1d4ed8" },
  unknown:  { label: "Unknown",  bg: "#f3f4f6", color: "#6b7280" },
};

const vehicleTypeLabel = {
  truck: "Truck", miniTruck: "Mini Truck", containerTruck: "Container Truck",
  mixerTruck: "Mixer Truck", waterTanker: "Water Tanker", tractor: "Tractor",
  car: "Car", bus: "Bus", ambulance: "Ambulance",
};

// ─── Icons ────────────────────────────────────────────────────────────────────
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

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, color, icon }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)", minWidth: 0 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
        <span style={{ width: 16, height: 16, display: "flex" }}>{icon}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#111", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, marginTop: 1, whiteSpace: "nowrap" }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
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

// ─── Vehicle Card (Grid) ──────────────────────────────────────────────────────
// function VehicleCard({ vehicle, onClick}) {
//   const vehicleData = vehicle.vehicleId || {};
//   const location = vehicle.location;
//   const phase = vehicle.phase;
//   const pucAlert = isPUCExpired(vehicleData?.PUCExpiry);
//   console.log("vehicles", vehicle);

//   return (
//     <div onClick={onClick}
//       style={{display: "flex", flexDirection: "column", gap: 12, border: "1px solid #e5e7eb", background: "#fff", borderRadius: 11, padding: "12px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)", cursor: "pointer", transition: "all .15s", position: "relative" }}
//       onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(99,102,241,0.12), 0 0 0 1.5px #6366f1"; e.currentTarget.style.transform = "translateY(-1px)"; }}
//       onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = ""; }}
//     >
//       {pucAlert && <div style={{ position: "absolute", top: 10, right: 10, color: "#dc2626", width: 14, height: 14 }} title="PUC Expired">{Icon.alert}</div>}
      
//       <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
//         <div style={{ width: 32, height: 32, borderRadius: 8, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#6366f1", flexShrink: 0 }}>
//           <span style={{ width: 17, height: 17 }}>{Icon.truck}</span>
//         </div>
//         <div style={{ minWidth: 0 }}>
//           <div style={{ fontWeight: 800, fontSize: 13.5, color: "#111", letterSpacing: .2 }}>{vehicleData?.vehicleNumber}</div>
//           <div style={{ fontSize: 10.5, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vehicleData?.transporterName}</div>
//         </div>
//         {phase && (
//           <Tag style={{ marginLeft: "auto", fontSize: 9, fontWeight: 800, letterSpacing: .6, textTransform: "uppercase", padding: "1px 6px",  flexShrink: 0, background: phase === "ORIGIN" ? "#ede9fe" : "#dcfce7", color: phase === "ORIGIN" ? "#6366f1" : "#15803d" }}>
//            <i className="ri-map-pin-line text-[11px]"></i> {phase}
//           </Tag>
//         )}
//         <Tag   color={vehicle.type === "external_delivery" ? "red" : "cyan"} style={{fontWeight:700, letterSpacing: .6}}  > {vehicle.type === "external_delivery" ? "External" : "Internal"} </Tag>
//       </div>

//       <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
//         <TypeBadge type={vehicleData?.typeOfVehicle} />
//         <Badge stage={location === "outside_factory" ? "waiting" : location === "inside_factory" ? "inside" : "enroute"} />
//       </div>

//       <div style={{ fontSize: 11.5, color: "#374151", display: "flex", alignItems: "flex-start", flexDirection: "column", gap: 3 }}>
//         <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
//           <span style={{ width: 11, height: 11, color: "#9ca3af", flexShrink: 0 }}><i class="ri-map-pin-user-line"></i></span>
//           <span>Driver - <span className="text-blue-800 font-semibold" >{vehicleData?.driverName} </span></span>
//         </div>
//         <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
//           <span style={{ width: 11, height: 11, color: "#9ca3af", flexShrink: 0 }}><i class="ri-truck-fill"></i></span>
//           <span> Type - <span className="text-blue-800 font-semibold" >{vehicle?.purpose === "pickup" ? "Pickup" : "Delivery"}</span></span>
//         </div>
//         <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
//           <span style={{ width: 11, height: 11, color: "#9ca3af", flexShrink: 0 }}><i class="ri-route-line"></i></span>
//           <span> Route - <span className="text-blue-800 font-semibold" >{vehicleData.type === "external_delivery" ? `${vehicle.sourceFactoryId?.sourceFactoryId?.name} → ${vehicle?.destinationFactoryId?.name}` : `External → ${vehicle?.destinationFactoryId?.name}`}</span></span>
//         </div>
//         <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
//           <span style={{ width: 11, height: 11, color: "#9ca3af", flexShrink: 0 }}><i class="ri-restart-fill"></i></span>
//           <span>Load - <span className="text-blue-800 font-semibold">{vehicle?.loadStatus || "pending"} </span> </span>
//         </div>
//       </div>
//     </div>
//   );
// }

// ─── Segment Filter ───────────────────────────────────────────────────────────
function SegmentFilter({ filter, setFilter, counts }) {
  const opts = [
    { v: "all", l: "All", count: counts.all },
    { v: "waiting", l: "Waiting", count: counts.waiting },
    { v: "inside", l: "Inside", count: counts.inside },
    { v: "enroute", l: "In Transit", count: counts.enroute },
  ];

  return (
    <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 9, padding: 3, gap: 2 }}>
      {opts.map(o => (
        <button key={o.v} onClick={() => setFilter(o.v)} style={{ border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: filter === o.v ? 700 : 500, background: filter === o.v ? "#fff" : "transparent", color: filter === o.v ? "#6366f1" : "#6b7280", cursor: "pointer", transition: "all .15s" }}>
          {o.l} <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 4, background: filter === o.v ? "#ede9fe" : "#e5e7eb", color: filter === o.v ? "#6366f1" : "#9ca3af", borderRadius: 4, padding: "0 5px" }}>{o.count}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function VehicleDashboard() {
  const [filter, setFilter] = useState("all");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const user = (() => { try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; } })();
  const userFactoryId = user?.factory?._id || user?.factory;
  const userRole = user?.workLocation || "atGate";
  const factory = user?.factory?.name
  console.log("factory name:", factory);
  useEffect(() => {
    const t = setInterval(() => {}, 60000);
    return () => clearInterval(t);
  }, []);

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, [queryClient]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => api.get(`/vehicle/trips`).then(r => r.data),
    refetchOnWindowFocus: true,
  });

  if (isLoading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fb", fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ color: "#6366f1", fontSize: 14, fontWeight: 600 }}>Loading vehicles…</div>
    </div>
  );

  const filteredData = data?.filter(
  v => v.tripState !== "CLOSED"
) || [];

// 🚧 Vehicles coming TO this factory (not yet inside)
const upcomingVehicles = filteredData.filter(v =>
  v.destinationFactory?._id === userFactoryId &&
  v.location !== "inside_factory"
);

// ⏳ Waiting outside THIS factory (ready to enter)
const waitingVehicles = filteredData.filter(v =>
  v.destinationFactory?._id === userFactoryId &&
  v.location === "outside_factory"
);

// 🏭 Inside THIS factory (both incoming + outgoing)
const insideVehicles = data.filter(v =>
  v.location === "inside_factory" &&
  (
    (v.phase === "ORIGIN" &&
     v.sourceFactory?._id?.toString() === userFactoryId.toString())

    ||

    (v.phase === "DESTINATION" &&
     v.destinationFactory?._id?.toString() === userFactoryId.toString())
  )
);

// 🚚 Enroute = strictly moving (not waiting)
const enrouteVehicles = filteredData.filter(v =>
  v.destinationFactory?._id === userFactoryId &&
  v.location === "enroute"
);

  // ❗ IMPORTANT: avoid duplicates
  const uniqueVehiclesMap = new Map();

  [...waitingVehicles, ...insideVehicles, ...enrouteVehicles].forEach(v => {
    uniqueVehiclesMap.set(v._id, v);
  });

  const allVehicles = Array.from(uniqueVehiclesMap.values());


  // ── KPI ─────────────────────────────────────────────
  const alerts = allVehicles.filter(v =>
    isPUCExpired(v.vehicle?.PUCExpiry)
  );

  const pickupVehicles = allVehicles.filter(v =>
    v.currentTrip?.purpose === "pickup"
  );

  const deliveryVehicles = allVehicles.filter(v =>
    v.currentTrip?.purpose === "delivery"
  );


  // ── Counts ──────────────────────────────────────────
  const segCounts = {
    all: allVehicles.length,
    waiting: waitingVehicles.length,
    inside: insideVehicles.length,
    enroute: enrouteVehicles.length,
    upcoming: upcomingVehicles.length
  };

  // ── Filter logic ────────────────────────────────────────────────────────────────
  const filteredVehicles = (() => {
    if (filter === "waiting") return waitingVehicles;
    if (filter === "inside") return insideVehicles;
    if (filter === "enroute") return enrouteVehicles;
    return allVehicles;
  })();

  const handleSignOut = async () => {
    try {
      await api.post("/auth/logout");
      localStorage.removeItem("user");
      window.location.href = "/login";
    } catch (e) {
      message.error("Logout failed");
      console.error(e);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fb", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#111" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <span style={{ width: 17, height: 17 }}>{Icon.truck}</span>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#111" }}>PG Group</div>
            <div style={{ fontSize: 9.5, color: "#9ca3af" }}>{user?.factory?.name} · VEMS</div>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <SegmentFilter filter={filter} setFilter={setFilter} counts={segCounts} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button primary onClick={refetch} style={{ border: "1.5px solid #e5e7eb", display: "flex", alignItems: "center", gap: 5, background: "#fff", borderRadius: 8, padding: "5px 9px", cursor: "pointer" }}>
            <span style={{ height: 17, width: 17, display: "flex", ...(refreshing ? { animation: "spin .7s linear infinite" } : {}) }}>{Icon.refresh} </span> Refresh
          </Button>
          {user.workLocation === "atGate" && (
            <button onClick={() => setEntryOpen(true)} style={{ display: "flex", alignItems: "center", gap: 5, border: "none", background: "#6366f1", borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: 12.5, cursor: "pointer", color: "#fff" }}>
              <span style={{ width: 13, height: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.plus}</span> New Entry
            </button>
          )}
          <Popover
            trigger="click"
            placement="bottomRight"
            content={
              <div style={{ fontSize: 11 }}>
                <div style={{ fontWeight: 600 }}>{user.email}</div>
                <div style={{ color: "#9ca3af" }}>{getLocationLabel(user.workLocation)}</div>

                <div
                  onClick={handleSignOut}
                  style={{
                    marginTop: 8,
                    padding: "4px 0",
                    color: "#dc2626",
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  Sign Out
                </div>
              </div>
            }
          >
            <Avatar style={{ backgroundColor: "#6366F1", cursor: "pointer" }}>
              {user.email?.[0]?.toUpperCase()}
            </Avatar>
          </Popover>
        </div>
      </nav>

      {/* ── KPIs ── */}
      <div style={{ padding: "12px 20px 0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
        <KpiCard label="Waiting" value={waitingVehicles.length} color="#f59e0b" icon={Icon.clock} />
        <KpiCard label="Inside" value={insideVehicles.length} color="#10b981" icon={Icon.truck} />
        <KpiCard label="En Route" value={enrouteVehicles.length} color="#3b82f6" icon={Icon.map} />
        <KpiCard label="PUC Alerts" value={alerts.length} color="#dc2626" icon={Icon.alert} />
        <KpiCard label="Pickups" value={pickupVehicles.length} color="#8b5cf6" icon={Icon.package} />
        <KpiCard label="Deliveries" value={deliveryVehicles.length} color="#ec4899" icon={Icon.location} />
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "10px 20px 32px" }}>
        {filteredVehicles.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "#9ca3af", background: "#fff", borderRadius: 12, border: "1.5px dashed #e5e7eb" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🚛</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No vehicles found</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
            {filteredVehicles.map(v => <VehicleCard key={v._id} vehicle={v} onClick={() => setSelectedVehicle(v)} userFactoryId={userFactoryId} factory={factory} />)}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <VehicleDetailModal vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} onRefresh={refetch} userFactoryId={userFactoryId} factory={factory} userRole={userRole} />
      <CreateVehicleModal open={entryOpen} onClose={() => setEntryOpen(false)} onRefresh={refetch} />
    </div>
  );
}