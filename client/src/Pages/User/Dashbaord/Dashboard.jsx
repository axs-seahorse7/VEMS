import { useState, useEffect, useCallback } from "react";
import api from "../../../../services/API/Api/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, message, Table, Tag as AntTag, Avatar, Popover } from "antd";
import VehicleDetailModal from "./VehicleDetailsModal.jsx";
import CreateVehicleModal from "./CreateVehicalModal.jsx";
import VehicleCard from "./VehicleCard.jsx";
import LiveButton from "../../../components/buttons/LiveButtons.jsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isPUCExpired = (d) => new Date(d) < new Date();
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");
const fmtTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const getLocationLabel = (loc) => {
  switch (loc) {
    case "atGate":
      return "Security Gate";
    case "storeSite":
      return "Store Site";
    default:
      return "Dispatch";
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
  if (location === "inside_factory" && vehicle.tripState !== "CLOSED") return "inside";
  if (location === "in_transit") return "enroute";

  return "unknown";
};

// ─── Stage Metadata ───────────────────────────────────────────────────────────
const STAGE_META = {
  waiting: { label: "Waiting", bg: "#fef9c3", color: "#92400e" },
  inside: { label: "Inside Factory", bg: "#dcfce7", color: "#15803d" },
  enroute: { label: "In Transit", bg: "#dbeafe", color: "#1d4ed8" },
  unknown: { label: "Unknown", bg: "#f3f4f6", color: "#6b7280" },
};

const vehicleTypeLabel = {
  truck: "Truck",
  miniTruck: "Mini Truck",
  containerTruck: "Container Truck",
  mixerTruck: "Mixer Truck",
  waterTanker: "Water Tanker",
  tractor: "Tractor",
  car: "Car",
  bus: "Bus",
  ambulance: "Ambulance",
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  truck: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  grid: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  list: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  refresh: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  plus: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  alert: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  signout: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  clock: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  map: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  ),
  package: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  location: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  search: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  dispatch: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  ),
  close: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  table: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="9" x2="9" y2="21" />
    </svg>
  ),
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, color, icon, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? color + "12" : "#fff",
        borderRadius: 10,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow: active
          ? `0 0 0 2px ${color}`
          : "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
        minWidth: 0,
        cursor: onClick ? "pointer" : "default",
        transition: "all .15s",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: color + "15",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
          flexShrink: 0,
        }}
      >
        <span style={{ width: 16, height: 16, display: "flex" }}>{icon}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "#111",
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#6b7280",
            fontWeight: 500,
            marginTop: 1,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function Badge({ stage }) {
  const s = STAGE_META[stage] || STAGE_META.unknown;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        fontSize: 10.5,
        fontWeight: 700,
        borderRadius: 5,
        padding: "2px 7px",
        letterSpacing: 0.3,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

function TypeBadge({ type }) {
  return (
    <span
      style={{
        background: "#f3f4f6",
        color: "#374151",
        fontSize: 10.5,
        fontWeight: 600,
        borderRadius: 5,
        border: "1px solid #d1d5db",
        padding: "2px 7px",
        whiteSpace: "nowrap",
      }}
    >
      {vehicleTypeLabel[type] || type}
    </span>
  );
}

// ─── Segment Filter ───────────────────────────────────────────────────────────
function SegmentFilter({ filter, setFilter, counts }) {
  const opts = [
    { v: "all", l: "All", count: counts.all },
    { v: "waiting", l: "Waiting", count: counts.waiting },
    { v: "inside", l: "Inside", count: counts.inside },
    { v: "enroute", l: "Upcoming", count: counts.enroute },
    { v: "dispatched", l: "Dispatched", count: counts.dispatched },
    // { v: "closed", l: "Closed", count: counts.closed },
  ];

  return (
    <div
      style={{
        display: "flex",
        background: "#f3f4f6",
        borderRadius: 9,
        padding: 3,
        gap: 2,
        flexWrap: "wrap",
      }}
    >
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => setFilter(o.v)}
          style={{
            border: "none",
            borderRadius: 7,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: filter === o.v ? 700 : 500,
            background: filter === o.v ? "#fff" : "transparent",
            color:
              o.v === "closed" && filter === o.v
                ? "#dc2626"
                : o.v === "dispatched" && filter === o.v
                ? "#059669"
                : filter === o.v
                ? "#6366f1"
                : "#6b7280",
            cursor: "pointer",
            transition: "all .15s",
          }}
        >
          {o.l}{" "}
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              marginLeft: 4,
              background:
                o.v === "closed" && filter === o.v
                  ? "#fee2e2"
                  : o.v === "dispatched" && filter === o.v
                  ? "#d1fae5"
                  : filter === o.v
                  ? "#ede9fe"
                  : "#e5e7eb",
              color:
                o.v === "closed" && filter === o.v
                  ? "#dc2626"
                  : o.v === "dispatched" && filter === o.v
                  ? "#059669"
                  : filter === o.v
                  ? "#6366f1"
                  : "#9ca3af",
              borderRadius: 4,
              padding: "0 5px",
            }}
          >
            {o.count}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Ant Design Table Columns ─────────────────────────────────────────────────
const vehicleColumns = [
  {
    title: "Vehicle No.",
    key: "vehicleNumber",
    fixed: "left",
    width: 150,
    render: (_, record) => {
      const vehicleData = record.vehicle || record.vehicleId || {};
      const pucAlert = isPUCExpired(vehicleData?.PUCExpiry);
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {pucAlert && (
            <span
              style={{ color: "#dc2626", width: 14, height: 14, display: "flex", flexShrink: 0 }}
              title="PUC Expired"
            >
              {Icon.alert}
            </span>
          )}
          <span style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>
            {vehicleData?.vehicleNumber || "—"}
          </span>
        </div>
      );
    },
  },
  {
    title: "Transporter",
    key: "transporterName",
    width: 160,
    render: (_, record) => {
      const vehicleData = record.vehicle || record.vehicleId || {};
      return (
        <span style={{ fontSize: 12, color: "#6b7280" }}>
          {vehicleData?.transporterName || "—"}
        </span>
      );
    },
  },
  {
    title: "Type",
    key: "typeOfVehicle",
    width: 150,
    render: (_, record) => {
      const vehicleData = record.vehicle || record.vehicleId || {};
      return <TypeBadge type={vehicleData?.typeOfVehicle} />;
    },
  },
  {
    title: "Status",
    key: "location",
    width: 140,
    render: (_, record) => {
      const stage =
        record.location === "outside_factory"
          ? "waiting"
          : record.location === "inside_factory"
          ? "inside"
          : record.location === "enroute"
          ? "enroute"
          : "unknown";
      return <Badge stage={stage} />;
    },
  },
  {
    title: "Driver",
    key: "driverName",
    width: 140,
    render: (_, record) => {
      const vehicleData = record.vehicle || record.vehicleId || {};
      return (
        <span style={{ fontSize: 12, color: "#374151" }}>
          {vehicleData?.driverName || "—"}
        </span>
      );
    },
  },
  {
    title: "Purpose",
    key: "purpose",
    width: 110,
    render: (_, record) => {
      const isPickup = record.currentTrip?.purpose === "pickup";
      return (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 5,
            background: isPickup ? "#ede9fe" : "#fce7f3",
            color: isPickup ? "#6366f1" : "#db2777",
          }}
        >
          {isPickup ? "Pickup" : "Delivery"}
        </span>
      );
    },
  },
  {
    title: "Load",
    key: "loadStatus",
    width: 110,
    render: (_, record) => {
      const color =
        record.loadStatus === "loaded"
          ? "#15803d"
          : record.loadStatus === "unloaded"
          ? "#b45309"
          : "#6b7280";
      return (
        <span style={{ fontSize: 12, fontWeight: 600, color }}>
          {record.loadStatus || "pending"}
        </span>
      );
    },
  },
  {
    title: "Trip State",
    key: "tripState",
    width: 120,
    render: (_, record) => (
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 5,
          background: record.tripState === "CLOSED" ? "#fee2e2" : "#f3f4f6",
          color: record.tripState === "CLOSED" ? "#dc2626" : "#374151",
        }}
      >
        {record.tripState || "—"}
      </span>
    ),
  },
  {
    title: "Route",
    key: "route",
    width: 220,
    render: (_, record) => {
      const src = record.sourceFactory?.name || "Out Source";
      const dst = record.destinationFactory?.name || "—";
      return (
        <span style={{ fontSize: 11, color: "#6b7280" }}>
          <span style={{ fontWeight: 600, color: "#374151" }}>{src}</span>
          {" → "}
          <span style={{ fontWeight: 600, color: "#374151" }}>{dst}</span>
        </span>
      );
    },
  },
];

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function VehicleDashboard() {
  const [filter, setFilter] = useState("all");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const queryClient = useQueryClient();

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  })();
  const userFactoryId = user?.factory?._id || user?.factory;
  const userRole = user?.workLocation || "atGate";
  const factory = user?.factory?.name;

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
    queryFn: () => api.get(`/vehicle/trips`).then((r) => r.data),
    refetchOnWindowFocus: true,
  });

  if (isLoading)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8f9fb",
          fontFamily: "'DM Sans',sans-serif",
        }}
      >
        <div style={{ color: "#6366f1", fontSize: 14, fontWeight: 600 }}>
          Loading vehicles…
        </div>
      </div>
    );

  // ── Open trips ──────────────────────────────────────────────────────────────
  const filteredData = data?.filter((v) => v.tripState !== "CLOSED") || [];
  const closedTrips = data?.filter((v) => v.tripState === "CLOSED") || [];
  const upcomingVehicles = filteredData.filter(
    (v) =>
      v.destinationFactory?._id === userFactoryId &&
      v.location !== "inside_factory"
  );

  const waitingVehicles = filteredData.filter(
    (v) =>
      v.destinationFactory?._id === userFactoryId &&
      v.location === "outside_factory"
  );

  const insideVehicles = (data || []).filter(
    (v) =>
      v.location === "inside_factory" && v.tripState !== "CLOSED" &&
      ((v.phase === "ORIGIN" &&
        v.sourceFactory?._id?.toString() === userFactoryId?.toString()) ||
        (v.phase === "DESTINATION" &&
          v.destinationFactory?._id?.toString() === userFactoryId?.toString()))
  );

  const enrouteVehicles = filteredData.filter(
    (v) =>
      v.destinationFactory?._id === userFactoryId &&
      v.location === "enroute"
  );

  // ── Dispatched: vehicles sourced FROM this factory that are enroute ─────────
  const dispatchedVehicles = filteredData.filter(
    (v) =>
      v.sourceFactory?._id?.toString() === userFactoryId?.toString() &&
      v.location === "enroute"
  );

  const uniqueVehiclesMap = new Map();
  [...waitingVehicles, ...insideVehicles, ...enrouteVehicles].forEach((v) => {
    uniqueVehiclesMap.set(v._id, v);
  });
  const allVehicles = Array.from(uniqueVehiclesMap.values());

  // ── KPI ─────────────────────────────────────────────────────────────────────

  const pickupVehicles = allVehicles.filter(
    (v) => v.purpose === "Pickup"
  );

  const deliveryVehicles = allVehicles.filter(
    (v) => v.purpose === "Delivery"
  );

 const FGVehicles = allVehicles.filter((v) =>
  Array.isArray(v.materials) && v.materials
    .filter((m) => m && (m.material || m.material?.name))
    .some((m) =>
      typeof m.material === "string"
        ? m.material === "FG"
        : m.material?.name === "FG"
    )
);

const RMVehicles = allVehicles.filter((v) =>
  Array.isArray(v.materials) && v.materials
    .filter((m) => m && (m.material || m.material?.name))
    .some((m) =>
      typeof m.material === "string"
        ? m.material === "RM"
        : m.material?.name === "RM"
    )
);

// const matrialType = allVehicles.filter((v) => v );
// matrialType.map((v) => {
//   if(Array.isArray(v.materials)){
//     v.materials.map((m) => {
//       if(m && (m.material || m.material?.name)){
//         console.log("Material Name:",  m.material , m.name);
//       }
//     })
//   }});
  


  const pickupCount = pickupVehicles.length;
  const deliveryCount = deliveryVehicles.length;
  const fgCount = FGVehicles.length;
  const rmCount = RMVehicles.length;
  

  // ── Counts ───────────────────────────────────────────────────────────────────
  const segCounts = {
    all: allVehicles.length,
    waiting: waitingVehicles.length,
    pickup: pickupVehicles.length,
    delivery: deliveryVehicles.length,
    FG: FGVehicles.length,
    RM: RMVehicles.length,
    inside: insideVehicles.length,
    enroute: enrouteVehicles.length,
    dispatched: dispatchedVehicles.length,
    closed: closedTrips.length,
  };

  // ── Filter logic ─────────────────────────────────────────────────────────────
  const baseFiltered = (() => {
    if (filter === "waiting") return waitingVehicles;
    if (filter === "inside") return insideVehicles;
    if (filter === "enroute") return enrouteVehicles;
    if (filter === "pickup") return pickupVehicles;
    if (filter === "delivery") return deliveryVehicles;
    if (filter === "FG") return FGVehicles;
    if (filter === "RM") return RMVehicles;
    if (filter === "dispatched") return dispatchedVehicles;
    if (filter === "closed") return closedTrips;
    return allVehicles;
  })();

  // ── Search filter ─────────────────────────────────────────────────────────────
  const filteredVehicles = searchQuery.trim()
    ? baseFiltered.filter((v) => {
        const vehicleData = v.vehicle || v.vehicleId || {};
        const num = (vehicleData?.vehicleNumber || "").toLowerCase();
        return num.includes(searchQuery.trim().toLowerCase());
      })
    : baseFiltered;

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
    <div
      style={{
        minHeight: "100vh",
        background: "#f8f9fb",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        color: "#111",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        .search-input::placeholder { color: #9ca3af; }
        .search-input:focus { outline: none; }
        .vehicle-table-row:hover td { background: #f5f3ff !important; }
        .view-toggle-btn { border: none; background: transparent; cursor: pointer; padding: 5px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: all .15s; }
        .view-toggle-btn:hover { background: #f3f4f6; }
        .view-toggle-btn.active { background: #ede9fe; color: #6366f1; }
      `}</style>

      {/* ── Navbar ── */}
      <nav
        style={{
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          padding: "0 20px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Left: Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <img src="https://cms-complaint-avidence.s3.eu-north-1.amazonaws.com/pg-logo-Photoroom.png" alt="" />
          </div>
          <div className="border-l-2 border-red-500 px-2" >
            <div 
            style={{ fontWeight: 800, fontSize: 14, color: "#111" }}
            
            >
              VEMS
            </div>
            <div style={{ fontSize: 9.5, color: "blue", letterSpacing: 0.8, marginTop: -2 }}>
              {user?.factory?.name} · {user.workLocation === "atGate" ? "Security Gate" : user.workLocation === "storeSite" ? "Store" : "Dispatch"}
            </div>
          </div>
        </div>

        {/* Center: Segment Filter */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", overflow: "auto" }}>
          <SegmentFilter
            filter={filter}
            setFilter={setFilter}
            counts={segCounts}
          />
        </div>

        {/* Live Button */}
        <LiveButton />

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>

          {/* Search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              background: searchOpen ? "#f5f3ff" : "#f3f4f6",
              border: searchOpen ? "1.5px solid #6366f1" : "1.5px solid transparent",
              borderRadius: 8,
              padding: "4px 8px",
              transition: "all .2s",
              width: searchOpen ? 180 : 34,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => {
                setSearchOpen((o) => !o);
                if (searchOpen) setSearchQuery("");
              }}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                color: searchOpen ? "#6366f1" : "#6b7280",
                flexShrink: 0,
                width: 18,
                height: 18,
              }}
            >
              {Icon.search}
            </button>
            {searchOpen && (
              <input
                autoFocus
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Vehicle number..."
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 12,
                  color: "#111",
                  fontFamily: "inherit",
                  marginLeft: 6,
                  width: "100%",
                  fontWeight: 500,
                }}
              />
            )}
          </div>

          {/* Grid / Table toggle */}
          <div
            style={{
              display: "flex",
              background: "#f3f4f6",
              borderRadius: 8,
              padding: 3,
              gap: 2,
            }}
          >
            <button
              className={`view-toggle-btn${viewMode === "grid" ? " active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid View"
              style={{
                color: viewMode === "grid" ? "#6366f1" : "#6b7280",
                width: 28,
                height: 28,
              }}
            >
              <span style={{ width: 15, height: 15, display: "flex" }}>
                {Icon.grid}
              </span>
            </button>
            <button
              className={`view-toggle-btn${viewMode === "table" ? " active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Table View"
              style={{
                color: viewMode === "table" ? "#6366f1" : "#6b7280",
                width: 28,
                height: 28,
              }}
            >
              <span style={{ width: 15, height: 15, display: "flex" }}>
                {Icon.table}
              </span>
            </button>
          </div>

          {/* Refresh */}
          <Button
            onClick={refetch}
            style={{
              border: "1.5px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "#fff",
              borderRadius: 8,
              padding: "5px 9px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              color: "#374151",
            }}
          >
            <span
              style={{
                height: 17,
                width: 17,
                display: "flex",
                ...(refreshing
                  ? { animation: "spin .7s linear infinite" }
                  : {}),
              }}
            >
              {Icon.refresh}
            </span>
            
          </Button>

          {/* New Entry */}
          {user.workLocation === "atGate" && (
            <button
              onClick={() => setEntryOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                border: "none",
                background: "#6366f1",
                borderRadius: 8,
                padding: "6px 14px",
                fontWeight: 700,
                fontSize: 12.5,
                cursor: "pointer",
                color: "#fff",
              }}
            >
              <span
                style={{
                  width: 13,
                  height: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {Icon.plus}
              </span>
             <span className=" max-2xl:hidden " > New Entry</span> 
            </button>
          )}

          {/* Avatar / User menu */}
          <Popover
            trigger="click"
            placement="bottomRight"
            content={
              <div style={{ fontSize: 11 }}>
                <div style={{ fontWeight: 600 }}>{user.email}</div>
                <div style={{ color: "#9ca3af" }}>
                  {getLocationLabel(user.workLocation)}
                </div>
                <div
                  onClick={handleSignOut}
                  style={{
                    marginTop: 8,
                    padding: "4px 0",
                    color: "#dc2626",
                    cursor: "pointer",
                    fontWeight: 600,
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
      <div
        style={{
          padding: "12px 20px 0",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10,
        }}
      >
        <KpiCard
          label="Waiting"
          value={waitingVehicles.length}
          color="#f59e0b"
          icon={Icon.clock}
          active={filter === "waiting"}
          onClick={() => setFilter('waiting')}
        />
        <KpiCard
          label="Inside"
          value={insideVehicles.length}
          color="#10b981"
          icon={Icon.truck}
          active={filter === "inside"}
          onClick={() => setFilter('inside')}
        />
        <KpiCard
          label="Upcoming"
          value={enrouteVehicles.length}
          color="#3b82f6"
          icon={Icon.map}
          active={filter === "enroute"}
          onClick={() => setFilter('enroute')}
        />
        <KpiCard
          label="FG Vehicles"
          value={FGVehicles.length}
          color="#79AE6F"
          icon={Icon.alert}
          active={filter === "fg"}
          onClick={() => setFilter('fg')}
        />
        <KpiCard
          label="RM Vehicles"
          value={RMVehicles.length}
          color="#66D0BC"
          icon={Icon.alert}
          active={filter === "rm"}
          onClick={() => setFilter('rm')}
        />
        <KpiCard
          label="Pickups"
          value={pickupVehicles.length}
          color="purple"
          icon={Icon.package}
          active={filter === "pickup"}
          onClick={() => setFilter("pickup")}
        />
        <KpiCard
          label="Deliveries"
          value={deliveryVehicles.length}
          color="#ec4899"
          icon={Icon.location}
          active={filter === "delivery"}
          onClick={() => setFilter("delivery")}
        />
        {/* Dispatched KPI — clickable to switch filter */}
        <KpiCard
          label="Dispatched"
          value={dispatchedVehicles.length}
          color="#059669"
          icon={Icon.dispatch}
          active={filter === "dispatched"}
          onClick={() =>
            setFilter((f) => (f === "dispatched" ? "all" : "dispatched"))
          }
        />
        {/* Closed Trips KPI — clickable to switch filter */}
        <KpiCard
          label="Closed Trips"
          value={closedTrips.length}
          color="#2C687B"
          icon={Icon.close}
          active={filter === "closed"}
          onClick={() =>
            setFilter((f) => (f === "closed" ? "all" : "closed"))
          }
        />
      </div>

      {/* ── Search hint + result count ── */}
      {(searchQuery || filter !== "all") && (
        <div
          style={{
            padding: "8px 20px 0",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "#6b7280",
          }}
        >
          <span>
            Showing{" "}
            <strong style={{ color: "#111" }}>{filteredVehicles.length}</strong>{" "}
            vehicle{filteredVehicles.length !== 1 ? "s" : ""}
            {searchQuery && (
              <>
                {" "}
                matching{" "}
                <strong style={{ color: "#6366f1" }}>
                  &quot;{searchQuery}&quot;
                </strong>
              </>
            )}
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                border: "none",
                background: "#f3f4f6",
                borderRadius: 5,
                padding: "1px 8px",
                fontSize: 11,
                cursor: "pointer",
                color: "#6b7280",
                fontWeight: 600,
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ padding: "10px 20px 32px" }}>
        {viewMode === "grid" ? (
          filteredVehicles.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 20px",
                color: "#9ca3af",
                background: "#fff",
                borderRadius: 12,
                border: "1.5px dashed #e5e7eb",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>🚛</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                No vehicles found
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 12,
              }}
            >
              {filteredVehicles.map((v) => (
                <VehicleCard
                  key={v._id}
                  vehicle={v}
                  onClick={() => setSelectedVehicle(v)}
                  userFactoryId={userFactoryId}
                  factory={factory}
                />
              ))}
            </div>
          )
        ) : (
          <Table
            columns={vehicleColumns}
            dataSource={filteredVehicles}
            rowKey={(r) => r._id}
            size="small"
            scroll={{ x: 1200 }}
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} vehicles` }}
            onRow={(record) => ({
              onClick: () => setSelectedVehicle(record),
              style: { cursor: "pointer" },
            })}
            rowClassName={() => "vehicle-table-row"}
            locale={{
              emptyText: (
                <div style={{ padding: "40px 0", color: "#9ca3af" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🚛</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>No vehicles found</div>
                </div>
              ),
            }}
          />
        )}
      </div>

      {/* ── Modals ── */}
      <VehicleDetailModal
        vehicle={selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
        onRefresh={refetch}
        userFactoryId={userFactoryId}
        factory={factory}
        userRole={userRole}
      />
      <CreateVehicleModal
        open={entryOpen}
        onClose={() => setEntryOpen(false)}
        onRefresh={refetch}
      />
    </div>
  );
}