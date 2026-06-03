import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Drawer, DatePicker, Input, Tabs, Modal, Spin, message, Button } from "antd";
import {
  CarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  DownloadOutlined,
  CheckOutlined,
  WarningOutlined,
  UserOutlined,
  PhoneOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  CalendarOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import api from "../../../services/API/Api/api";
import * as XLSX from "xlsx";
import VehicleDetailModal from "../../Pages/User/Dashbaord/VehicleDetailsModal";


const { RangePicker } = DatePicker;

/* ══════════════════════════════════════════════════════════════
   EXCEL EXPORT
══════════════════════════════════════════════════════════════ */
function fmt(date)     { return date ? new Date(date).toLocaleString("en-IN", { hour12: true }) : ""; }
function fmtDate(date) { return date ? new Date(date).toLocaleDateString("en-IN") : ""; }

function exportClosedTripsXLSX(trips) {
  const wb = XLSX.utils.book_new();

  const detailHeaders = [
    "Trip ID","Trip Type","Started At","Closed At",
    "Vehicle Number","Vehicle Category","Vehicle Type","PUC Expiry",
    "Driver Name","Driver Contact","Driver ID Type","Driver ID Number","License Number",
    "Source Factory","Source Location","Destination Factory","Destination Location",
    "Material Name","Material Type","Quantity","Unit","Invoice No","Invoice Amount (₹)","Seal","Supplier","Customer",
  ];

  const detailRows = [];
  trips.forEach(trip => {
    const base = [
      trip._id?.toString() || "", 
      trip.type === "internal_transfer" ? "Internal Transfer" : "External Delivery", 
      fmt(trip.startedAt) || "", 
      fmt(trip.updatedAt) || "",
      trip.vehicle?.vehicleNumber || "", 
      trip.vehicle?.typeOfVehicle || "", 
      trip.vehicle?.type === "internal" ? "Internal Movement" : "External Movement", 
      fmtDate(trip.vehicle?.PUCExpiry) || "",
      trip.driver?.driverName || "", 
      trip.driver?.driverContact || "", 
      trip.driver?.driverIdType || "", 
      trip.driver?.driverIdNumber || "", 
      trip.driver?.licenseNumber || "", 
      trip.sourceFactory?.name || "", 
      trip.sourceFactory?.location || trip?.externalSource || "",
      trip.destinationFactory?.name || "", 
      trip.destinationFactory?.location || trip?.externalDestination || "",
    ];

    const materials = trip.materials?.length ? trip.materials : [null];
    materials.forEach(mat => {
      detailRows.push([
        ...base,
        mat?.name || "", 
        mat?.material || "", 
        mat?.quantity ?? "", 
        mat?.unit || "",
        mat?.invoiceNo || "", 
        mat?.invoiceAmount ?? "", 
        mat?.seal || "", 
        mat?.supplier || "", 
        mat?.customer || "", 
      ]);
    });
  });

  const detailSheet = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
  detailSheet["!cols"] = [
    {wch:26},{wch:20},{wch:20},{wch:20},{wch:16},{wch:18},{wch:24},{wch:14},
    {wch:18},{wch:16},{wch:14},{wch:16},{wch:16},{wch:20},{wch:18},{wch:20},{wch:18},
    {wch:18},{wch:18},{wch:10},{wch:8},{wch:16},{wch:18},{wch:12},{wch:18},{wch:18},
  ];
  XLSX.utils.book_append_sheet(wb, detailSheet, "Trip Details");

  const summaryRows = [
    ["Closed Trips Report"], 
    ["Generated At", new Date().toLocaleString("en-IN")],
    ["Total Trips", trips.length], [],
    ["Vehicle","Trips Completed"],
    ...Object.values(trips.reduce((acc, t) => {
      const vn = t.vehicle?.vehicleNumber || "Unknown";
      acc[vn] = acc[vn] || { v: vn, c: 0 }; acc[vn].c++; return acc;
    }, {})).sort((a, b) => b.c - a.c).map(x => [x.v, x.c]),
    [],

    ["Driver", "Contact", "Trips Completed"],
    ...Object.values(trips.reduce((acc, t) => {
      const dn = t.driver?.driverName || "Unknown";
      acc[dn] = acc[dn] || { n: dn, c: t.driver?.driverContact || "", trips: 0 };
      acc[dn].trips++; return acc;
    }, {})).sort((a, b) => b.trips - a.trips).map(x => [x.n, x.c, x.trips]),
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{wch:28},{wch:18},{wch:16}];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  XLSX.writeFile(wb, `closed-trips-${new Date().toISOString().slice(0,10)}.xlsx`);
}

function exportAvailableCSV(rows) {
  const header = ["Vehicle Number", "Type", "Vehicle Type", "Driver"];
  const body = rows.map(v => [v.vehicleNumber, v.type, v.typeOfVehicle, v.driverId?.name || ""].join(","));
  const blob = new Blob([[header, ...body].join("\n")], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "available-vehicles.csv" });
  a.click(); URL.revokeObjectURL(a.href);
}

/* ══════════════════════════════════════════════════════════════
   SKELETON
══════════════════════════════════════════════════════════════ */
function SkeletonCard() {
  return (
    <div style={{ background:"#fff", border:"1px solid #e8eaed", borderRadius:10, padding:"14px 12px", overflow:"hidden" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={sk(32, 32, 8)} />
        <div style={sk(48, 16, 20)} />
      </div>
      <div style={{ ...sk("65%", 12, 4), marginBottom:6 }} />
      <div style={{ ...sk("40%", 10, 4), marginBottom:12 }} />
      <div style={{ display:"flex", gap:5 }}>
        <div style={sk(40, 18, 5)} />
        <div style={sk(32, 18, 5)} />
      </div>
    </div>
  );
}
const sk = (w, h, r) => ({
  width:w, height:h, borderRadius:r,
  background:"linear-gradient(90deg,#f4f4f5 25%,#e8e8ec 50%,#f4f4f5 75%)",
  backgroundSize:"200% 100%", animation:"vdShimmer 1.5s infinite",
});

/* ══════════════════════════════════════════════════════════════
   CHIPS / TAGS
══════════════════════════════════════════════════════════════ */
function Tag({ label, color = "#52525b", bg = "#f4f4f5" }) {
  return (
    <span style={{
      fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:5,
      background:bg, color, border:`1px solid ${color}18`, whiteSpace:"nowrap",
    }}>{label}</span>
  );
}

/* ══════════════════════════════════════════════════════════════
   AVAILABLE VEHICLE CARD
══════════════════════════════════════════════════════════════ */
function AvailableCard({ v }) {
  return (
    <div style={{
      background:"#fff", border:"1px solid #e8eaed", borderRadius:10,
      padding:"14px 12px", transition:"border-color .18s, box-shadow .18s",
      cursor:"default",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor="#22c55e"; e.currentTarget.style.boxShadow="0 4px 16px rgba(34,197,94,.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor="#e8eaed"; e.currentTarget.style.boxShadow="none"; }}
    >
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div style={{
          width:32, height:32, borderRadius:8, background:"#f0fdf4",
          display:"flex", alignItems:"center", justifyContent:"center",
          border:"1px solid #bbf7d0",
        }}>
          <CarOutlined style={{ fontSize:15, color:"#16a34a" }} />
        </div>
        <Tag label="AVAILABLE" color="#16a34a" bg="#f0fdf4" />
      </div>

      {/* Vehicle Number */}
      <div style={{ fontSize:13, fontWeight:700, color:"#18181b", marginBottom:2, letterSpacing:0.3, fontFamily:"monospace" }}>
        {v.vehicleNumber}
      </div>
      <div style={{ fontSize:11, color:"#a1a1aa", marginBottom:10 }}>
        {v.typeOfVehicle || "—"}
      </div>

      {/* Tags */}
      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
        <Tag label={v.type === "internal" ? "Internal" : "External"} />
        {v.driverId?.name && <Tag label={v.driverId.name} />}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CLOSED TRIP CARD
══════════════════════════════════════════════════════════════ */
function ClosedTripCard({ v, setSelectedTripId }) {
  const closedAt = v.updatedAt
    ? new Date(v.updatedAt).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })
    : null;

  return (
    <div style={{
      background:"#fff", border:"1px solid #e8eaed", borderRadius:10,
      padding:"14px 12px", transition:"border-color .18s, box-shadow .18s",
      cursor:"default",
      onClick: () => setSelectedTripId(v._id),
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor="#f97316"; e.currentTarget.style.boxShadow="0 4px 16px rgba(249,115,22,.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor="#e8eaed"; e.currentTarget.style.boxShadow="none"; }}
    >
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div style={{
          width:32, height:32, borderRadius:8, background:"#fff7ed",
          display:"flex", alignItems:"center", justifyContent:"center",
          border:"1px solid #fed7aa",
        }}>
          <CarOutlined style={{ fontSize:15, color:"#ea580c" }} />
        </div>
        <Tag label="CLOSED" color="#ea580c" bg="#fff7ed" />
      </div>

      {/* Vehicle */}
      <div style={{ fontSize:13, fontWeight:700, color:"#18181b", letterSpacing:0.3, fontFamily:"monospace", marginBottom:6 }}>
        {v.vehicle?.vehicleNumber || "—"}
      </div>

      {/* Route */}
      {(v.sourceFactory?.name || v.destinationFactory?.name) && (
        <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:8 }}>
          <span style={{ fontSize:10.5, color:"#71717a", fontWeight:500, maxWidth:70, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {v.sourceFactory? v.sourceFactory.name : v.externalSource?? "-" }
          </span>
          <ArrowRightOutlined style={{ fontSize:9, color:"#d4d4d8", flexShrink:0 }} />
          <span style={{ fontSize:10.5, color:"#71717a", fontWeight:500, maxWidth:70, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {v.destinationFactory? v.destinationFactory.name : v.externalDestination?? "-" }
          </span>
        </div>
      )}

      {/* Driver */}
      {v.driver?.driverName && (
        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:8 }}>
          <UserOutlined style={{ fontSize:10, color:"#a1a1aa" }} />
          <span style={{ fontSize:11, color:"#52525b", fontWeight:500 }}>{v.driver.driverName}</span>
          {v.driver?.driverContact && (
            <>
              <PhoneOutlined style={{ fontSize:10, color:"#a1a1aa", marginLeft:4 }} />
              <span style={{ fontSize:11, color:"#52525b" }}>{v.driver.driverContact}</span>
            </>
          )}
        </div>
      )}

      {/* Closed at */}
      {closedAt && (
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <ClockCircleOutlined style={{ fontSize:9, color:"#d4d4d8" }} />
          <span style={{ fontSize:10, color:"#a1a1aa" }}>{closedAt}</span>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STATS ROW
══════════════════════════════════════════════════════════════ */
function StatsRow({ stats }) {
  if (!stats) return null;
  const items = [
    { label:"Trips",    value:stats.totalTrips,         color:"#2563eb", bg:"#eff6ff" },
    { label:"Vehicles", value:stats.uniqueVehicleCount, color:"#16a34a", bg:"#f0fdf4" },
    { label:"Drivers",  value:stats.uniqueDriverCount,  color:"#ea580c", bg:"#fff7ed" },
  ];
  return (
    <div style={{ display:"flex", gap:6, padding:"10px 16px", background:"#fafafa", borderBottom:"1px solid #f0f0f0" }}>
      {items.map(s => (
        <div key={s.label} style={{
          flex:1, textAlign:"center", padding:"8px 4px",
          background:s.bg, borderRadius:8, border:`1px solid ${s.color}18`,
        }}>
          <div style={{ fontSize:16, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value ?? "—"}</div>
          <div style={{ fontSize:9, fontWeight:700, color:"#a1a1aa", textTransform:"uppercase", letterSpacing:"0.06em", marginTop:3 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LOAD MORE SENTINEL  (IntersectionObserver target)
══════════════════════════════════════════════════════════════ */
function LoadMoreSentinel({ onIntersect, loading }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onIntersect(); },
      { threshold: 0.1 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [onIntersect]);

  return (
    <div ref={ref} style={{ display:"flex", justifyContent:"center", alignItems:"center", padding:"20px 0", gap:8 }}>
      {loading && (
        <>
          <LoadingOutlined style={{ fontSize:14, color:"#a1a1aa" }} />
          <span style={{ fontSize:12, color:"#a1a1aa" }}>Loading more…</span>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   EMPTY STATE
══════════════════════════════════════════════════════════════ */
function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"52px 24px", gap:10 }}>
      <div style={{
        width:52, height:52, borderRadius:14, background:"#f4f4f5",
        display:"flex", alignItems:"center", justifyContent:"center", marginBottom:4,
      }}>
        {icon}
      </div>
      <div style={{ fontSize:13.5, fontWeight:700, color:"#3f3f46" }}>{title}</div>
      <div style={{ fontSize:12, color:"#a1a1aa", textAlign:"center", lineHeight:1.6, maxWidth:220 }}>{sub}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function VehicleDrawer({ open = false, onClose = () => {} }) {
  const [tab, setTab]             = useState("closed");
  const [search, setSearch]       = useState("");
  const [dateRange, setDateRange] = useState([null, null]);
  const [dlFlash, setDlFlash]     = useState(false);

  /* ── Available vehicles ── */
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [availLoading, setAvailLoading]           = useState(false);
  const [availError, setAvailError]               = useState(null);

  /* ── Closed trips with pagination ── */
  const [closedTrips, setClosedTrips]     = useState([]);
  const [closedStats, setClosedStats]     = useState(null);
  const [closedLoading, setClosedLoading] = useState(false);
  const [closedError, setClosedError]     = useState(null);
  const [isDefaultRange, setIsDefaultRange] = useState(true);
  const [nextCursor, setNextCursor]       = useState(null);
  const [hasMore, setHasMore]             = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const [selectedTripId, setSelectedTripId] = useState(null);
  const [isDownloadLoading, setisDownloadLoading] = useState(false);

  /* ── Fetch available vehicles ── */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setAvailLoading(true); setAvailError(null);
      try {
        const res = await api.get("/vehicles/get-available");
        if (!cancelled) setAvailableVehicles(res.data.data || []);
      } catch (err) {
        if (!cancelled) setAvailError(err.message);
      } finally {
        if (!cancelled) setAvailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  /* ── Fetch closed trips (first page / reset) ── */
  const fetchClosedTrips = useCallback(async (from, to) => {
    setClosedLoading(true); setClosedError(null);
    setClosedTrips([]); setNextCursor(null); setHasMore(false);
    try {
      const params = {};
      if (from) params.from = from.format("YYYY-MM-DD");
      if (to)   params.to   = to.format("YYYY-MM-DD");
      const res = await api.get("/trip/closed", { params });
      setClosedTrips(res.data.data  || []);
      setClosedStats(res.data.stats || null);
      setIsDefaultRange(res.data.dateRange?.isDefault ?? true);
      setNextCursor(res.data.pagination?.nextCursor ?? null);
      setHasMore(res.data.pagination?.hasMore ?? false);
    } catch (err) {
      setClosedError(err.message);
    } finally {
      setClosedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchClosedTrips(dateRange[0], dateRange[1]);
  }, [open, dateRange, fetchClosedTrips]);

  /* ── Fetch next page (infinite scroll) ── */
  const fetchMoreClosedTrips = useCallback(async () => {
    if (!hasMore || isFetchingMore || closedLoading || !nextCursor) return;
    setIsFetchingMore(true);
    try {
      const params = { cursor: nextCursor };
      if (dateRange[0]) params.from = dateRange[0].format("YYYY-MM-DD");
      if (dateRange[1]) params.to   = dateRange[1].format("YYYY-MM-DD");
      const res = await api.get("/trip/closed", { params });
      setClosedTrips(prev => [...prev, ...(res.data.data || [])]);
      setNextCursor(res.data.pagination?.nextCursor ?? null);
      setHasMore(res.data.pagination?.hasMore ?? false);
    } 
    finally {
      setIsFetchingMore(false);
    }
  }, [hasMore, isFetchingMore, closedLoading, nextCursor, dateRange]);

  /* ── Client-side search filter ── */
  const sourceList = tab === "available" ? availableVehicles : closedTrips;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return sourceList;
    if (tab === "available") {
      return sourceList.filter(v =>
        (v.vehicleNumber  ?? "").toLowerCase().includes(q) ||
        (v.typeOfVehicle  ?? "").toLowerCase().includes(q) ||
        (v.type           ?? "").toLowerCase().includes(q) ||
        (v.driverId?.name ?? "").toLowerCase().includes(q)
      );
    }
    return sourceList.filter(v =>
      (v.vehicle?.vehicleNumber  ?? "").toLowerCase().includes(q) ||
      (v.driver?.driverName      ?? "").toLowerCase().includes(q) ||
      (v.driver?.driverContact   ?? "").toLowerCase().includes(q)
    );
  }, [sourceList, search, tab]);

  /* ── Download ── */
  // const handleDownload = () => {
  //   if (tab === "closed") exportClosedTripsXLSX(filtered);
  //   else exportAvailableCSV(filtered);
  //   setDlFlash(true);
  //   setTimeout(() => setDlFlash(false), 1400);
  // };

  const isLoading   = tab === "available" ? availLoading  : closedLoading;
  const activeError = tab === "available" ? availError    : closedError;

  const handleDownload = async () => {
    if(isDownloadLoading) {
      message.warning("A download is already in progress. Please wait.", 1.5)
      return;
    };
  try {
    setisDownloadLoading(true);
    message.success("Preparing your download...", 1.5);
    const res = await api.get("/trip/download", { params: { from: dateRange[0]?.format("YYYY-MM-DD"), to: dateRange[1]?.format("YYYY-MM-DD"), export: "xlsx" }, responseType: "blob" });
    const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `closed-trips-${new Date().toISOString().slice(0,10)}.xlsx` });
    a.click(); URL.revokeObjectURL(a.href);
    message.success("Download Completed!", 2);
  } catch (err) {
    Modal.error({ title: "Download Failed", content: "An error occurred while downloading the report. Please try again." });
  } finally {
    setisDownloadLoading(false);
    }
  }


  return (
    <>
      <style>{`
        @keyframes vdShimmer { to { background-position:-200% 0; } }
        @keyframes vdFadeUp  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        .vd-card-grid { animation:vdFadeUp .22s ease both; }
        /* Drawer overrides */
        .vd-drawer .ant-drawer-body { padding:0 !important; background:#f8fafc !important; }
        .vd-drawer .ant-drawer-header { padding:14px 16px !important; border-bottom:1px solid #f0f0f0 !important; background:#fff !important; }
        .vd-drawer .ant-drawer-content-wrapper { box-shadow:-4px 0 24px rgba(15,23,42,.08) !important; }
        /* Tabs */
        .vd-drawer .ant-tabs-nav { margin:0 !important; background:#fff; padding:0 16px; border-bottom:1px solid #f0f0f0 !important; }
        .vd-drawer .ant-tabs-tab { font-size:12px !important; font-weight:600 !important; padding:10px 0 !important; }
        .vd-drawer .ant-tabs-tab-active .ant-tabs-tab-btn { color:#18181b !important; }
        .vd-drawer .ant-tabs-ink-bar { background:#18181b !important; }
        /* Inputs */
        .vd-drawer .ant-input-affix-wrapper { border-radius:8px !important; border-color:#e8eaed !important; font-size:12.5px !important; }
        .vd-drawer .ant-input-affix-wrapper:hover,
        .vd-drawer .ant-input-affix-wrapper-focused { border-color:#52525b !important; box-shadow:0 0 0 2px rgba(82,82,91,.08) !important; }
        .vd-drawer .ant-picker { border-radius:8px !important; border-color:#e8eaed !important; font-size:12.5px !important; }
        .vd-drawer .ant-picker:hover,
        .vd-drawer .ant-picker-focused { border-color:#52525b !important; box-shadow:0 0 0 2px rgba(82,82,91,.08) !important; }
        /* Force drawer below the modal */
        .vd-drawer .ant-drawer-content-wrapper { z-index: 1000 !important; }
        .vd-drawer.ant-drawer { z-index: 1000 !important; }
      `}</style>

      <Drawer
        zIndex={900}
        // rootClassName="vd-drawer"
        open={open}
        onClose={onClose}
        width={460}
        placement="right"
        destroyOnClose
        title={
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              width:32, height:32, borderRadius:8, background:"#f4f4f5",
              display:"flex", alignItems:"center", justifyContent:"center",
              border:"1px solid #e8eaed",
            }}>
              <CarOutlined style={{ fontSize:16, color:"#52525b" }} />
            </div>
            <div>
              <div style={{ fontSize:13.5, fontWeight:700, color:"#18181b", lineHeight:1.2 }}>PG VEMS Vehicles</div>
              <div style={{ fontSize:10.5, color:"#a1a1aa", fontWeight:400 }}>Browse &amp; export</div>
            </div>
          </div>
        }
      >
        {/* ══ Tabs ══ */}
        <Tabs
          activeKey={tab}
          onChange={key => { setTab(key); setSearch(""); }}
          items={[
            {
              key: "closed",
              label: (
                <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <CloseCircleOutlined style={{ color: tab === "closed" ? "#ea580c" : "#a1a1aa" }} />
                  Closed Trips
                  {closedTrips.length > 0 && (
                    <span style={{
                      fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:20,
                      background: tab === "closed" ? "#fff7ed" : "#f4f4f5",
                      color:      tab === "closed" ? "#ea580c" : "#a1a1aa",
                    }}>{closedTrips.length}{hasMore ? "+" : ""}</span>
                  )}
                </span>
              ),
            },
            {
              key: "available",
              label: (
                <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <CheckCircleOutlined style={{ color: tab === "available" ? "#16a34a" : "#a1a1aa" }} />
                  Available
                  {availableVehicles.length > 0 && (
                    <span style={{
                      fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:20,
                      background: tab === "available" ? "#f0fdf4" : "#f4f4f5",
                      color:      tab === "available" ? "#16a34a" : "#a1a1aa",
                    }}>{availableVehicles.length}</span>
                  )}
                </span>
              ),
            },
            
          ]}
        />

        {/* ══ Filters row ══ */}
        <div style={{ padding:"12px 16px", background:"#fff", borderBottom:"1px solid #f0f0f0", display:"flex", flexDirection:"column", gap:8 }}>

          {/* Date range — closed only */}
          {tab === "closed" && (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <RangePicker
                style={{ flex:1 }}
                onChange={vals => setDateRange(vals || [null, null])}
                placeholder={["Start date", "End date"]}
                format="YYYY-MM-DD"
                allowClear
                size="small"
              />
              {isDefaultRange && (
                <span style={{ fontSize:9.5, fontWeight:600, color:"#2563eb", background:"#eff6ff", padding:"5px 12px", borderRadius:6, whiteSpace:"nowrap" }}>
                  Last 36h
                </span>
              )}
            </div>
          )}

          {/* Search */}
          <Input
            placeholder={tab === "available" ? "Search by vehicle no., type…" : "Search by vehicle no., driver name or contact…"}
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
            size="medium"
            prefix={<SearchOutlined style={{ color:"#d4d4d8", fontSize:15 }} />}
          />
        </div>

        {/* ══ Stats — closed only ══ */}
        {tab === "closed" && !closedLoading && closedStats && (
          <StatsRow stats={closedStats} />
        )}

        {/* ══ Toolbar: count + download ══ */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"8px 16px", background:"#fafafa", borderBottom:"1px solid #f0f0f0",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:11, fontWeight:700, color:"#52525b" }}>
              {filtered.length} {tab === "available" ? "vehicles" : "trips"}
            </span>
            {search && (
              <span style={{ fontSize:9.5, fontWeight:600, background:"#fefce8", color:"#ca8a04", padding:"1px 7px", borderRadius:20 }}>
                Filtered
              </span>
            )}
            {tab === "closed" && hasMore && (
              <span style={{ fontSize:9.5, color:"#a1a1aa" }}>· more below</span>
            )}
          </div>
          {tab === "closed" &&
            <Button
              loading={isDownloadLoading}
              onClick={handleDownload}
              disabled={isLoading || isDownloadLoading}
              style={{
                display:"flex", alignItems:"center", gap:5,
                background: dlFlash ? "#f0fdf4" : "#306D29",
              border: dlFlash ? "1px solid #bbf7d0" : "1px solid #306D29",
              borderRadius:7, padding:"5px 12px", cursor:"pointer",
              color: dlFlash ? "#16a34a" : "#fff",
              fontSize:11, fontWeight:600, transition:"all .2s",
            }}
          >
            {dlFlash ? <CheckOutlined style={{ fontSize:11 }} /> : <DownloadOutlined style={{ fontSize:11 }} />}
            {dlFlash ? "Saved!" : "Download Excel"}
          </Button>
          }
        </div>

        {/* ══ Content ══ */}
        <div style={{ padding:"14px 16px 32px", overflowY:"auto", height:"calc(100vh - 240px)" }}>

          {/* Loading skeleton */}
          {isLoading && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))", gap:10 }}>
              {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Error */}
          {!isLoading && activeError && (
            <EmptyState
              icon={<WarningOutlined style={{ fontSize:22, color:"#fca5a5" }} />}
              title="Failed to load"
              sub={activeError}
            />
          )}

          {/* Empty */}
          {!isLoading && !activeError && filtered.length === 0 && (
            <EmptyState
              icon={<InboxOutlined style={{ fontSize:22, color:"#d4d4d8" }} />}
              title={tab === "available" ? "No available vehicles" : "No closed trips"}
              sub={
                search
                  ? "Clear the search to see all results"
                  : tab === "closed"
                    ? "No trips closed in this date range"
                    : "All vehicles are currently on trips"
              }
            />
          )}

          {/* Grid */}
          {!isLoading && !activeError && filtered.length > 0 && (
            <div className="vd-card-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))", gap:10 }}>
              {filtered.map((v, i) =>
                tab === "available"
                  ? <AvailableCard  key={v._id ?? i} v={v} />
                  : <div onClick={() => setSelectedTripId(v._id)}> <ClosedTripCard key={v._id ?? i} v={v} setSelectedTripId={setSelectedTripId} /> </div>
              )}
            </div>
          )}

          {/* ── Infinite scroll sentinel (closed trips only) ── */}
          {tab === "closed" && !isLoading && !activeError && hasMore && (
            <LoadMoreSentinel onIntersect={fetchMoreClosedTrips} loading={isFetchingMore} />
          )}

          {/* End of list indicator */}
          {tab === "closed" && !isLoading && !hasMore && closedTrips.length > 0 && (
            <div style={{ textAlign:"center", padding:"16px 0 0", fontSize:11, color:"#d4d4d8" }}>
              All {closedTrips.length} trips loaded
            </div>
          )}
        </div>
      </Drawer>

      <VehicleDetailModal
        selectedVehicleId={selectedTripId}
        onClose={() => setSelectedTripId(null)}
      />

    </>
  );
}