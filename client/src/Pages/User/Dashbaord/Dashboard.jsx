import { useState, useEffect, useCallback, useRef } from "react";

// helper functions and constants
import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

// customer services 
import api from "../../../../services/API/Api/api";

// third party components
import { Button, message, Table, Tag as AntTag, Avatar, Popover, Segmented, Modal, Spin  } from "antd";
import { TruckElectric } from "lucide-react";

// local components
import VehicleDetailModal from "./VehicleDetailsModal.jsx";
import CreateVehicleModal from "./CreateVehicalModal.jsx";
import VehicleCard from "./VehicleCard.jsx";
import LiveButton from "../../../components/buttons/LiveButtons.jsx";
import FloatingActions from "../../../components/buttons/FloatingAction.jsx";
import VehicleDrawer from "../../../components/Dashboard/VehicleDrawer.jsx";
import VehicleStatusDrawer from "../../../components/Vehicle-Status/VehicleStatusDrawer.jsx";
import NetworkStatusBanner from "../../../components/Interne-Status/NetworkStatusBanner.jsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isPUCExpired = (d) => new Date(d) < new Date();
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("en-IN", {hour: "2-digit", minute: "2-digit"}) : "—";

const getLocationLabel = (loc) => {
  switch (loc) {
    case "atGate":      return "Security Gate";
    case "storeSite":   return "Store Site";
    default:            return "Dispatch";
  }
};

const getVehicleLocation = (vehicle) => {
  if (!vehicle?.state) return "unknown";
  return vehicle.state.status;
};

const getPhase = (vehicle, userFactoryId) => {
  if (!vehicle?.currentTrip || !userFactoryId) return null;
  const sourceId = vehicle.currentTrip.sourceFactoryId;
  const destId   = vehicle.currentTrip.destinationFactoryId;
  if (String(sourceId) === String(userFactoryId)) return "ORIGIN";
  if (String(destId)   === String(userFactoryId)) return "DESTINATION";
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
  waiting: { label: "Waiting",        bg: "#fef9c3", color: "#92400e" },
  inside:  { label: "Inside Factory", bg: "#dcfce7", color: "#15803d" },
  enroute: { label: "In Transit",     bg: "#dbeafe", color: "#1d4ed8" },
  exited:  { label: "Exited",         bg: "#fee2e2", color: "#dc2626" },
  unknown: { label: "Unknown",        bg: "#f3f4f6", color: "#6b7280" },
};

const vehicleTypeLabel = {
  truck: "Truck", miniTruck: "Mini Truck", containerTruck: "Container Truck",
  mixerTruck: "Mixer Truck", waterTanker: "Water Tanker", tractor: "Tractor",
  car: "Car", bus: "Bus", ambulance: "Ambulance",
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  truck: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>),
  grid: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>),
  list: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>),
  refresh: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>),
  plus: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>),
  alert: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>),
  signout: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>),
  clock: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>),
  map: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>),
  package: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>),
  location: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>),
  search: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>),
  dispatch: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>),
  close: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>),
  table: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="9" x2="9" y2="21" /></svg>),
  wifi: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23" /><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" /><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" /><path d="M10.71 5.05A16 16 0 0 1 22.56 9" /><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" /></svg>),
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, color, icon, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? color + "12" : "#fff",
        borderRadius: 10, padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 10,
        boxShadow: active ? `0 0 0 2px ${color}` : "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
        minWidth: 100, cursor: onClick ? "pointer" : "default", transition: "all .15s",
      }}
    >
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
    <span style={{ background: s.bg, color: s.color, fontSize: 10.5, fontWeight: 700, borderRadius: 5, padding: "2px 7px", letterSpacing: 0.3, whiteSpace: "nowrap" }}>
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

// ─── Segment Filter ───────────────────────────────────────────────────────────
function SegmentFilter({ filter, setFilter, counts }) {
  const opts = [
    { v: "all",        l: "All",        count: counts.all },
    { v: "waiting",    l: "Waiting",    count: counts.waiting },
    { v: "inside",     l: "Inside",     count: counts.inside },
    { v: "enroute",    l: "Upcoming",   count: counts.enroute },
    { v: "dispatched", l: "Dispatched", count: counts.dispatched },
  ];
  return (
    <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 9, padding: 3, gap: 2, flexWrap: "wrap" }}>
      {opts.map((o) => (
        <button key={o.v} onClick={() => setFilter(o.v)} style={{ border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: filter === o.v ? 700 : 500, background: filter === o.v ? "#fff" : "transparent", color: o.v === "dispatched" && filter === o.v ? "#059669" : filter === o.v ? "#6366f1" : "#6b7280", cursor: "pointer", transition: "all .15s" }}>
          {o.l}{" "}
          <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 4, background: o.v === "dispatched" && filter === o.v ? "#d1fae5" : filter === o.v ? "#ede9fe" : "#e5e7eb", color: o.v === "dispatched" && filter === o.v ? "#059669" : filter === o.v ? "#6366f1" : "#9ca3af", borderRadius: 4, padding: "0 5px" }}>
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
    title: "Vehicle",
    key: "vehicleNumber",
    fixed: "left",
    width: 160,
    render: (_, r) => {
      const v = r.vehicle || {};
      const pucAlert = isPUCExpired(v?.PUCExpiry);
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {pucAlert && (
              <span style={{ color: "#dc2626", width: 13, height: 13, display: "flex", flexShrink: 0 }} title="PUC Expired">
                {Icon.alert}
              </span>
            )}
            <span style={{ fontWeight: 800, fontSize: 13, color: "#111" }}>{v?.vehicleNumber || "—"}</span>
          </div>
          <span style={{ fontSize: 10, color: "#9ca3af" }}>{v?.transporterName || "—"}</span>
        </div>
      );
    },
  },

  {
    title: "Status",
    key: "status",
    width: 160,
    render: (_, r) => {
      const stageKey =
        r.location === "inside_factory" ? "inside"
        : r.location === "enroute"      ? "enroute"
        : r.location === "outside_factory" && r.tripState !== "CLOSED" && r.tripState !== "CANCELLED" ? "waiting"
        : r.location === "outside_factory" ? "exited"
        : "unknown";

      const tripColor = r.tripState === "CANCELLED" ? "#dc2626"
        : r.tripState === "CLOSED" ? "#64748b"
        : "#059669";
      const tripBg = r.tripState === "CANCELLED" ? "#fee2e2"
        : r.tripState === "CLOSED" ? "#f1f5f9"
        : "#dcfce7";

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Badge stage={stageKey} />
          <span style={{
            fontSize: 9.5, fontWeight: 700, padding: "1px 6px",
            borderRadius: 4, background: tripBg, color: tripColor,
            width: "fit-content", letterSpacing: 0.3,
          }}>
            {r.tripState || "—"}
          </span>
        </div>
      );
    },
  },

  {
    title: "Live",
    key: "live",
    width: 60,
    render: (_, r) => {
      const isLive = r.tripState !== "CLOSED" && r.tripState !== "CANCELLED";
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: isLive ? "#22c55e" : "#d1d5db",
            boxShadow: isLive ? "0 0 0 3px #bbf7d055" : "none",
            animation: isLive ? "livePulse 1.8s ease-in-out infinite" : "none",
            display: "inline-block",
          }} />
        </div>
      );
    },
  },

  {
    title: "Driver",
    key: "driver",
    width: 160,
    render: (_, r) => (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>{r.driver?.name || "—"}</span>
        <span style={{ fontSize: 10, color: "#6b7280" }}>{r.driver?.phone || ""}</span>
      </div>
    ),
  },

  {
    title: "Type / Purpose",
    key: "typePurpose",
    width: 150,
    render: (_, r) => {
      const isExternal = r.type === "external_delivery";
      const isPickup   = r.purpose === "Pickup";
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{
            fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
            background: isExternal ? "#fee2e2" : "#cffafe",
            color: isExternal ? "#dc2626" : "#0e7490",
            width: "fit-content",
          }}>
            {isExternal ? "External" : "Internal"}
          </span>
          <span style={{
            fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
            background: isPickup ? "#ede9fe" : "#fce7f3",
            color: isPickup ? "#6366f1" : "#db2777",
            width: "fit-content",
          }}>
            {r.purpose || "—"}
          </span>
        </div>
      );
    },
  },

  {
    title: "Route",
    key: "route",
    width: 220,
    render: (_, r) => {
      const src = r.sourceFactory?.name || r.externalSource || "External";
      const dst = r.destinationFactory?.name || r.externalDestination || "—";
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
            {/* Origin dot */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", flexShrink: 0 }} />
              <span style={{ fontWeight: 600, color: "#374151", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{src}</span>
            </div>
            <div style={{ width: 1, height: 10, background: "linear-gradient(to bottom,#3b82f6,#10b981)", marginLeft: 2.5 }} />
            {/* Destination dot */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
              <span style={{ fontWeight: 600, color: "#374151", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dst}</span>
            </div>
          </div>
        </div>
      );
    },
  },

  {
    title: "Phase",
    key: "phase",
    width: 120,
    render: (_, r) => {
      if (!r.phase) return <span style={{ color: "#9ca3af", fontSize: 11 }}>—</span>;
      const isOrigin = r.phase === "ORIGIN";
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: isOrigin ? "#6366f1" : "#10b981",
            animation: "livePulse 1.8s ease-in-out infinite",
          }} />
          <span style={{
            fontSize: 10.5, fontWeight: 700,
            color: isOrigin ? "#6366f1" : "#10b981",
          }}>
            {isOrigin ? r.sourceFactory?.name : r.destinationFactory?.name}
          </span>
        </div>
      );
    },
  },

  {
    title: "Material",
    key: "material",
    width: 150,
    render: (_, r) => {
      const mat = r.material;
      if (!mat) return <span style={{ color: "#9ca3af", fontSize: 11 }}>—</span>;
      const isSealed = mat.seal === "sealed";
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>{mat.name || mat.material || "—"}</span>
          {isSealed && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4,
              background: "#fef3c7", color: "#92400e", width: "fit-content",
            }}>
              🔒 Sealed
            </span>
          )}
        </div>
      );
    },
  },

  {
    title: "Load",
    key: "loadStatus",
    width: 100,
    render: (_, r) => {
      const color = r.loadStatus === "loaded" ? "#15803d"
        : r.loadStatus === "unloaded" ? "#b45309" : "#6b7280";
      const bg = r.loadStatus === "loaded" ? "#dcfce7"
        : r.loadStatus === "unloaded" ? "#fef3c7" : "#f3f4f6";
      return (
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "2px 8px",
          borderRadius: 5, background: bg, color,
        }}>
          {r.loadStatus
            ? r.loadStatus.charAt(0).toUpperCase() + r.loadStatus.slice(1)
            : "Pending"}
        </span>
      );
    },
  },

  {
    title: "Vehicle Type",
    key: "vehicleType",
    width: 130,
    render: (_, r) => {
      const v = r.vehicle || {};
      return (
        <span style={{
          background: "#f3f4f6", color: "#374151", fontSize: 10.5,
          fontWeight: 600, borderRadius: 5, border: "1px solid #e5e7eb",
          padding: "2px 7px", whiteSpace: "nowrap",
        }}>
          {vehicleTypeLabel[v?.typeOfVehicle] || v?.typeOfVehicle || "—"}
        </span>
      );
    },
  },

  {
    title: "Started",
    key: "startedAt",
    width: 130,
    render: (_, r) => (
      <span style={{ fontSize: 11, color: "#6b7280" }}>{fmtTime(r.createdAt)}</span>
    ),
  },
];

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function VehicleDashboard() {
  const [selectedVehicle, setSelectedVehicle]   = useState(null);
  const [entryOpen, setEntryOpen]               = useState(false);
  const [refreshing, setRefreshing]             = useState(false);
  const [viewMode, setViewMode]                 = useState("grid");
  const [searchQuery, setSearchQuery]           = useState("");
  const [searchOpen, setSearchOpen]             = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [vehicleDrawer, setVehicleDrawer]       = useState(false);
  const [isVehicleDetailsModalLoading, setisVehicleDetailsModalLoading] = useState(false);
  const observerRef = useRef(null);

  // ── Network state ──────────────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online",  handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online",  handleOnline);
    };
  }, []);

  

  // ── User ──────────────────────────────────────────────────────────────────
  const user = (() => { try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; } })();
  const userFactoryId = user?.factory?._id || user?.factory;
  const userRole      = user?.workLocation || "atGate";
  const factory       = user?.factory?.name;
  const [filter, setFilter] = useState(userRole === "atGate" ? "all" : "inside");

  const queryClient = useQueryClient();

  useEffect(() => { const t = setInterval(() => {}, 60000); return () => clearInterval(t); }, []);

  const manualRefetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, [queryClient]);

  const {data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["vehicles"],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.get(`/vehicle/trips/live?page=${pageParam}&limit=20`);
      return res.data;
    },

    getNextPageParam: (lastPage) => {
      return lastPage.nextPage || undefined;
    },

    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });


  const {data: closedAndCancelledTripsData, isError: closedTripsError, isLoading: closedTripsLoading, fetchNextPage: fetchClosedTripsNextPage, hasNextPage: hasMoreClosedTrips, isFetchingNextPage: isFetchingClosedTripsNextPage} = useInfiniteQuery({
    queryKey: ["vehicles-closed-and-cancelled"],
    initialPageParam: 1,

    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.get(`/vehicle/trips/closed-and-cancelled?page=${pageParam}&limit=20`);
      return res.data;
    },

    getNextPageParam: (lastPage) => {
      return lastPage?.nextPage || undefined;
    },

    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });

  const trips = data?.pages.flatMap((page) => page.trips ) || [];
  const closedAndCancelledTrips = closedAndCancelledTripsData?.pages.flatMap((page) => page.trips ) || [];
  const selectedVehicleId = selectedVehicle?._id;

  const abortControllerRef = useRef(null);

  const {data: selectedTrip, isLoading: selectedTripLoading } = useQuery({
    queryKey: ["vehicle-trip", selectedVehicleId],
    queryFn: async () => {
      // if (!selectedVehicleId) return null;
      const res = await api.get(`/vehicle/trips/${selectedVehicleId}`,);
      return res.data;
    },

    enabled: !!selectedVehicleId,
    refetchInterval: selectedVehicleId? 10000: false,
    
  });

  const handleCloseLoadingDetailModal = () => {
    setisVehicleDetailsModalLoading(false);
    setSelectedVehicle(null);
  };

  // ── Data slices ────────────────────────────────────────────────────────────
  const filteredData     = trips.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) || [];
  const closedTrips      = closedAndCancelledTrips.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)) || [];
  const waitingVehicles  = filteredData.filter((v) => v.destinationFactory?._id === userFactoryId && v.location === "outside_factory" && (v.tripState !== "CLOSED" || v.tripState !== "CANCELLED"));
  const insideVehicles   = trips?.filter((v) => v.location === "inside_factory" && v.tripState !== "CLOSED" && v.tripState !== "CANCELLED" && ((v.phase === "ORIGIN" && v.sourceFactory?._id?.toString() === userFactoryId?.toString()) || (v.phase === "DESTINATION" && v.destinationFactory?._id?.toString() === userFactoryId?.toString())));
  const enrouteVehicles  = filteredData.filter((v) => v.destinationFactory?._id === userFactoryId && v.location === "enroute");
  const dispatchedVehicles = filteredData.filter((v) => v.sourceFactory?._id?.toString() === userFactoryId?.toString() && v.location === "enroute");

  const uniqueVehiclesMap = new Map();
  [...waitingVehicles, ...insideVehicles, ...enrouteVehicles].forEach((v) => uniqueVehiclesMap.set(v._id, v));
  const allVehicles = Array.from(uniqueVehiclesMap.values());

  const pickupVehicles   = allVehicles.filter((v) => v.purpose === "Pickup");
  const deliveryVehicles = allVehicles.filter((v) => v.purpose === "Delivery");
  const FGVehicles = allVehicles.filter((v) => Array.isArray(v.materials) && v.materials.filter((m) => m && (m.material || m.material?.name)).some((m) => typeof m.material === "string" ? m.material === "FG" : m.material?.name === "FG"));
  const RMVehicles = allVehicles.filter((v) => Array.isArray(v.materials) && v.materials.filter((m) => m && (m.material || m.material?.name)).some((m) => typeof m.material === "string" ? m.material === "RM" : m.material?.name === "RM"));

  const segCounts = { all: allVehicles.length, waiting: waitingVehicles.length, pickup: pickupVehicles.length, delivery: deliveryVehicles.length, FG: FGVehicles.length, RM: RMVehicles.length, inside: insideVehicles.length, enroute: enrouteVehicles.length, dispatched: dispatchedVehicles.length, closed: closedTrips.length };

  const baseFiltered = (() => {
    if (filter === "waiting")    return waitingVehicles;
    if (filter === "inside")     return insideVehicles;
    if (filter === "enroute")    return enrouteVehicles;
    if (filter === "pickup")     return pickupVehicles;
    if (filter === "delivery")   return deliveryVehicles;
    if (filter === "FG")         return FGVehicles;
    if (filter === "RM")         return RMVehicles;
    if (filter === "dispatched") return dispatchedVehicles;
    if (filter === "closed")     return closedTrips;
    return allVehicles;
  })();
  
  const filteredVehicles = searchQuery.trim()
    ? baseFiltered.filter((v) => { const vehicleData = v.vehicle || v.vehicleId || {}; return (vehicleData?.vehicleNumber || "").toLowerCase().includes(searchQuery.trim().toLowerCase()); })
    : baseFiltered;

  const handleSignOut = async () => {
    try {
      await api.post("/auth/logout");
      localStorage.removeItem("user");
      window.location.href = "/login";
    } catch (e) {
      message.error("Logout failed");
    }
  };

  const lastLiveRef   = useRef(null);
  const lastClosedRef = useRef(null);

  useEffect(() => {
    const isClosedFilter = filter === "closed";
    const node           = isClosedFilter ? lastClosedRef.current : lastLiveRef.current;
    const canFetch       = isClosedFilter ? hasMoreClosedTrips    : hasNextPage;
    const fetching       = isClosedFilter ? isFetchingClosedTripsNextPage : isFetchingNextPage;
    const loadMore       = isClosedFilter ? fetchClosedTripsNextPage      : fetchNextPage;
    if (!node || !canFetch || fetching) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    },{ rootMargin: "20px" });

    observer.observe(node);
    return () => observer.disconnect();
  }, [filter, filteredVehicles, closedTrips, hasNextPage, hasMoreClosedTrips, isFetchingNextPage, isFetchingClosedTripsNextPage, fetchNextPage, fetchClosedTripsNextPage,]);


  const tableBottomRef = useRef(null);
  useEffect(() => {
    if (viewMode === "grid") return;

    const node = tableBottomRef.current;
    const isClosedFilter = filter === "closed";
    const canFetch = isClosedFilter ? hasMoreClosedTrips : hasNextPage;
    const fetching = isClosedFilter ? isFetchingClosedTripsNextPage : isFetchingNextPage;
    const loadMore = isClosedFilter ? fetchClosedTripsNextPage : fetchNextPage;

    if (!node || !canFetch || fetching) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "100px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [
    viewMode,
    filter,
    filteredVehicles.length,
    hasNextPage,
    hasMoreClosedTrips,
    isFetchingNextPage,
    isFetchingClosedTripsNextPage,
    fetchNextPage,
    fetchClosedTripsNextPage,
  ]);

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fb", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#111", scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 #f8f9fb" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        * { box-sizing: border-box; }
        .search-input::placeholder { color: #9ca3af; }
        .search-input:focus { outline: none; }
        .vehicle-table-row:hover td { background: #f5f3ff !important; }
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ width: 72, height: 72, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="https://cms-complaint-avidence.s3.eu-north-1.amazonaws.com/pg-logo-Photoroom.png" alt="" />
          </div>
          <div className="border-l-2 border-red-500 px-2">
            <div style={{ fontWeight: 800, fontSize: 14, color: "#111" }}>VEMS</div>
            <div style={{ display: "flex", flexDirection: "column", fontSize: 9.5, color: "blue", letterSpacing: 0.8, marginTop: -2 }}>
              <span className="font-semibold text-emerald-700 text-[10px]">{user?.factory?.name} ({user?.factory?.location})</span>
              <span>{user.workLocation === "atGate" ? "Security Gate" : user.workLocation === "storeSite" ? "Store" : "Dispatch"}</span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", justifyContent: "center", overflow: "auto" }}>
          <SegmentFilter filter={filter} setFilter={setFilter} counts={segCounts} />
        </div>

        <LiveButton />

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 0, background: searchOpen ? "#f5f3ff" : "#f3f4f6", border: searchOpen ? "1.5px solid #6366f1" : "1.5px solid transparent", borderRadius: 8, padding: "4px 8px", transition: "all .2s", width: searchOpen ? 180 : 34, overflow: "hidden" }}>
            <button onClick={() => { setSearchOpen((o) => !o); if (searchOpen) setSearchQuery(""); }} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", color: searchOpen ? "#6366f1" : "#6b7280", flexShrink: 0, width: 18, height: 18 }}>
              {Icon.search}
            </button>
            {searchOpen && (
              <input autoFocus className="search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Vehicle number..." style={{ border: "none", background: "transparent", fontSize: 12, color: "#111", fontFamily: "inherit", marginLeft: 6, width: "100%", fontWeight: 500 }} />
            )}
          </div>

          <Button onClick={manualRefetch} shape="round" type="primary" style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            <span style={{ height: 15, width: 15, display: "flex", ...(refreshing ? { animation: "spin .7s linear infinite" } : {}) }}>{Icon.refresh}</span>
            <span>Refresh</span>
          </Button>

          <button onClick={() => setEntryOpen(true)} style={{ display: "flex", alignItems: "center", gap: 5, border: "none", background: "#6366f1", borderRadius: 50, padding: "6px 14px", fontWeight: 700, fontSize: 12.5, cursor: "pointer", color: "#fff" }}>
            <span style={{ width: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.plus}</span>
            <span className="max-md:hidden">New Entry</span>
          </button>

          <Popover trigger="click" placement="bottomRight" content={
            <div style={{ fontSize: 11 }}>
              <div style={{ fontWeight: 600 }}>{user.email}</div>
              <div style={{ color: "#9ca3af" }}>{getLocationLabel(user.workLocation)}</div>
              <div onClick={handleSignOut} style={{ marginTop: 8, padding: "4px 0", color: "#dc2626", cursor: "pointer", fontWeight: 600 }}>Sign Out</div>
            </div>
          }>
            <Avatar size="medium" style={{ backgroundColor: "#6366F1", cursor: "pointer" }}>{user.email?.[0]?.toUpperCase()}</Avatar>
          </Popover>
        </div>
      </nav>

      {/* ── KPIs ── */}
      <div style={{ padding: "12px 20px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, borderBottom: "1px solid #e5e7eb" }}>
        <KpiCard label="Waiting"      value={waitingVehicles.length}    color="#f59e0b" icon={Icon.clock}    active={filter === "waiting"}    onClick={() => setFilter("waiting")} />
        <KpiCard label="Inside"       value={insideVehicles.length}     color="#10b981" icon={Icon.truck}    active={filter === "inside"}     onClick={() => setFilter("inside")} />
        <KpiCard label="Upcoming"     value={enrouteVehicles.length}    color="#3b82f6" icon={Icon.map}      active={filter === "enroute"}    onClick={() => setFilter("enroute")} />
        <KpiCard label="FG Vehicles"  value={FGVehicles.length}         color="#79AE6F" icon={Icon.alert}    active={filter === "fg"}         onClick={() => setFilter("fg")} />
        <KpiCard label="RM Vehicles"  value={RMVehicles.length}         color="#66D0BC" icon={Icon.alert}    active={filter === "rm"}         onClick={() => setFilter("rm")} />
        <KpiCard label="Pickups"      value={pickupVehicles.length}     color="purple"  icon={Icon.package}  active={filter === "pickup"}     onClick={() => setFilter("pickup")} />
        <KpiCard label="Deliveries"   value={deliveryVehicles.length}   color="#ec4899" icon={Icon.location} active={filter === "delivery"}   onClick={() => setFilter("delivery")} />
        <KpiCard label="Dispatched"   value={dispatchedVehicles.length} color="#059669" icon={Icon.dispatch} active={filter === "dispatched"} onClick={() => setFilter((f) => f === "dispatched" ? "all" : "dispatched")} />
        <KpiCard label="Closed Trips" value={closedTrips.length}        color="#2C687B" icon={Icon.close}    active={filter === "closed"}     onClick={() => setFilter((f) => f === "closed" ? "all" : "closed")} />
      </div>

      {/* ── Offline Banner ── */}
      {!isOnline && (
        <div style={{ justifyContent:"center", width: "100%", animation: "slideDown 0.2s ease both", background: "#fafafa", borderBottom: "1px solid #e5e7eb", padding: "7px 20px", display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 500, color: "#374151" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#9ca3af", flexShrink: 0, animation: "blink 1.5s ease-in-out infinite" }} />
          No internet connection
          <span style={{ color: "#9ca3af", fontWeight: 400 }}>·</span>
        </div>
      )}


      {/* ── Back Online Banner ── */}
      {isOnline && showReconnected && (
        <div style={{ animation: "slideDown 0.2s ease both", background: "#f0fdf4", borderBottom: "1px solid #bbf7d0", padding: "7px 20px", display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 500, color: "#166534" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
          Back online
        </div>
      )}

      

      {/* ── Search result hint ── */}
      {(searchQuery || filter !== "all") && (
        <div style={{ padding: "8px 20px 0", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6b7280" }}>
          <span>Showing <strong style={{ color: "#111" }}>{filteredVehicles.length}</strong> vehicle{filteredVehicles.length !== 1 ? "s" : ""}{searchQuery && (<> matching <strong style={{ color: "#6366f1" }}>&quot;{searchQuery}&quot;</strong></>)}</span>
          {searchQuery && (<button onClick={() => setSearchQuery("")} style={{ border: "none", background: "#f3f4f6", borderRadius: 5, padding: "1px 8px", fontSize: 11, cursor: "pointer", color: "#6b7280", fontWeight: 600 }}>Clear</button>)}
        </div>
      )}

      {/* ── Content ── */}
      <div >
        {viewMode === "grid" ? (
          isLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
              <div style={{ color: "#6366f1", fontSize: 14, fontWeight: 600 }}>Loading vehicles…</div>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "#9ca3af", background: "#fff", borderRadius: 12, border: "1.5px dashed #e5e7eb", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <TruckElectric color="gray" size={40} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>No vehicles found</div>
            </div>
          ) : (
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(350px, 1fr))",
                  gap: 12
                }}
              > 

              {filteredVehicles.map((v, index) => {
                const isLast = index === filteredVehicles.length - 1;
                return (
                  <div
                    ref={isLast ? (filter === "closed" ? lastClosedRef : lastLiveRef) : null}
                    key={v._id}
                  >
                    <VehicleCard vehicle={v} onClick={() => setSelectedVehicle(v)} />
                    
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <> 
            <Table
              columns={vehicleColumns}
              dataSource={filteredVehicles}
              rowKey={(r) => r._id}
              size="small"
              scroll={{ x: 1200}}
              pagination={false}
              onRow={(record) => ({ onClick: () => setSelectedVehicle(record), style: { cursor: "pointer" } })}
              rowClassName={() => "vehicle-table-row"}
              locale={{
                emptyText: (
                  <div style={{ padding: "40px 0", border: "1.5px dashed #e5e7eb", color: "#9ca3af", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <TruckElectric color="blue" size={40} />
                    <div style={{ fontSize: 14, fontWeight: 600 }}>No vehicles found</div>
                  </div>
                ),
              }}
            />
            <div ref={tableBottomRef} style={{ height: 1,}} />

            {(isFetchingNextPage || isFetchingClosedTripsNextPage) && (
              <div style={{ textAlign: "center", padding: "12px 0", fontSize: 12, color: "#6366f1", fontWeight: 600 }}>
                Loading more…
              </div>
            )}
          </>

        )}
          

        {
          hasNextPage && (

            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {
                isFetchingNextPage
                  ? "Loading..."
                  : "Load More"
              }
            </button>
          )
        }
      </div>


      {/* ── Modals & Drawers ── */}

        {selectedTripLoading ? (
          <Modal
            onClose={handleCloseLoadingDetailModal}
            title="Vehicle Details is Loading..."
            open={selectedTripLoading}
            footer={null}
            closable={true}
            centered
            bodyStyle={{ padding: 0, minWidth: 300 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0" }}>
              <Spin />
            </div>
          </Modal>
        ) : (
          <VehicleDetailModal
            vehicle={selectedTrip}
            selectedTripLoading={selectedTripLoading}
            onClose={() => setSelectedVehicle(null)}
            onRefresh={manualRefetch}
            userFactoryId={userFactoryId}
            factory={factory}
            userRole={userRole}
          />
        )}

      <CreateVehicleModal open={entryOpen} onClose={() => setEntryOpen(false)} onRefresh={manualRefetch} />
      <VehicleStatusDrawer open={vehicleDrawer} onClose={() => setVehicleDrawer(false)} />
      <VehicleDrawer refetch={manualRefetch} open={isFilterDrawerOpen} onClose={() => setIsFilterDrawerOpen((prev) => !prev)} />
      <FloatingActions viewMode={viewMode} setViewMode={setViewMode} setIsFilterDrawerOpen={setIsFilterDrawerOpen} setIsVehicleDrawerOpen={setVehicleDrawer} />
      <NetworkStatusBanner/>
    </div>
  );
}