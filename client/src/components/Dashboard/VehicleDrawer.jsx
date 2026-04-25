import { useState, useMemo, useEffect, useCallback } from "react";
import { Drawer, DatePicker, Input, Segmented } from "antd";
import api from "../../../services/API/Api/api";
import { Truck, EvCharger, Search } from "lucide-react";
import * as XLSX from "xlsx";

const { RangePicker } = DatePicker;

/* ── Fuel badge styles ─────────────────────────────────────── */
const FUEL_STYLE = {
  Electric: { bg: "#dbeafe", color: "#1d4ed8" },
  Petrol:   { bg: "#ffedd5", color: "#c2410c" },
  Diesel:   { bg: "#dcfce7", color: "#166534" },
  Hybrid:   { bg: "#faf5ff", color: "#7e22ce" },
};

/* ═══════════════════════════════════════════════════════════════
   EXCEL EXPORT  (SheetJS)
   One row per material line.  If a trip has no materials, one
   row is still emitted with the trip-level fields only.
═══════════════════════════════════════════════════════════════ */
function fmt(date) {
  if (!date) return "";
  return new Date(date).toLocaleString("en-IN", { hour12: true });
}
function fmtDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN");
}

function exportClosedTripsXLSX(trips) {
  const wb = XLSX.utils.book_new();

  /* ── 1.  TRIP DETAILS sheet (one row per material) ── */
  const detailHeaders = [
    "Trip ID",
    "Trip Type",
    "Started At",
    "Closed At",
    // Vehicle
    "Vehicle Number",
    "Vehicle Category",
    "Vehicle Type (Internal/External)",
    "PUC Expiry",
    // Driver
    "Driver Name",
    "Driver Contact",
    "Driver ID Type",
    "Driver ID Number",
    "License Number",
    // Route
    "Source Factory",
    "Source Location",
    "Destination Factory",
    "Destination Location",
    // Material (one row per item)
    "Material Name",
    "Material Type",
    "Quantity",
    "Unit",
    "Invoice No",
    "Invoice Amount (₹)",
    "Seal",
    "Supplier",
    "Customer",
  ];

  const detailRows = [];

  trips.forEach(trip => {
    const base = [
      trip._id?.toString() || "",
      trip.type || "",
      fmt(trip.startedAt),
      fmt(trip.updatedAt),
      // Vehicle
      trip.vehicle?.vehicleNumber || "",
      trip.vehicle?.typeOfVehicle || "",
      trip.vehicle?.type === "internal" ? "Internal" : "External",
      fmtDate(trip.vehicle?.PUCExpiry),
      // Driver
      trip.driver?.driverName    || "",
      trip.driver?.driverContact || "",
      trip.driver?.driverIdType  || "",
      trip.driver?.driverIdNumber || "",
      trip.driver?.licenseNumber  || "",
      // Route
      trip.sourceFactory?.name      || "",
      trip.sourceFactory?.location  || "",
      trip.destinationFactory?.name     || "",
      trip.destinationFactory?.location || "",
    ];

    const materials = trip.materials?.length ? trip.materials : [null];

    materials.forEach(mat => {
      detailRows.push([
        ...base,
        mat?.name          || "",
        mat?.material      || "",
        mat?.quantity      ?? "",
        mat?.unit          || "",
        mat?.invoiceNo     || "",
        mat?.invoiceAmount ?? "",   // note: schema spells it "invoiceAmmount"
        mat?.seal          || "",
        mat?.supplier      || "",
        mat?.customer      || "",
      ]);
    });
  });

  const detailSheet = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);

  // Column widths
  detailSheet["!cols"] = [
    { wch: 26 }, // Trip ID
    { wch: 20 }, // Trip Type
    { wch: 20 }, // Started At
    { wch: 20 }, // Closed At
    { wch: 16 }, // Vehicle Number
    { wch: 18 }, // Vehicle Category
    { wch: 24 }, // Vehicle Type
    { wch: 14 }, // PUC Expiry
    { wch: 18 }, // Driver Name
    { wch: 16 }, // Driver Contact
    { wch: 14 }, // ID Type
    { wch: 16 }, // ID Number
    { wch: 16 }, // License
    { wch: 20 }, // Source Factory
    { wch: 18 }, // Source Location
    { wch: 20 }, // Dest Factory
    { wch: 18 }, // Dest Location
    { wch: 18 }, // Material Name
    { wch: 18 }, // Material Type
    { wch: 10 }, // Quantity
    { wch: 8  }, // Unit
    { wch: 16 }, // Invoice No
    { wch: 18 }, // Invoice Amount
    { wch: 12 }, // Seal
    { wch: 18 }, // Supplier
    { wch: 18 }, // Customer
  ];

  // Style header row bold (basic — SheetJS free tier supports cell props via !rows)
  detailSheet["!rows"] = [{ hpt: 18 }];

  XLSX.utils.book_append_sheet(wb, detailSheet, "Trip Details");

  /* ── 2.  SUMMARY sheet ── */
  const summaryRows = [
    ["Closed Trips Report"],
    ["Generated At", new Date().toLocaleString("en-IN")],
    ["Total Trips", trips.length],
    [],
    ["Vehicle", "Trips Completed"],
    ...Object.values(
      trips.reduce((acc, t) => {
        const vn = t.vehicle?.vehicleNumber || "Unknown";
        acc[vn] = acc[vn] || { v: vn, c: 0 };
        acc[vn].c++;
        return acc;
      }, {})
    )
      .sort((a, b) => b.c - a.c)
      .map(x => [x.v, x.c]),
    [],
    ["Driver", "Contact", "Trips Completed"],
    ...Object.values(
      trips.reduce((acc, t) => {
        const dn = t.driver?.driverName || "Unknown";
        acc[dn] = acc[dn] || { n: dn, c: t.driver?.driverContact || "", trips: 0 };
        acc[dn].trips++;
        return acc;
      }, {})
    )
      .sort((a, b) => b.trips - a.trips)
      .map(x => [x.n, x.c, x.trips]),
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  /* ── Write file ── */
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `closed-trips-${dateStr}.xlsx`);
}

/* Available vehicles CSV (unchanged behaviour) */
function exportAvailableCSV(rows) {
  const header = ["Vehicle Number", "Type", "Vehicle Type", "Driver"];
  const body = rows.map(v =>
    [v.vehicleNumber, v.type, v.typeOfVehicle, v.driverId?.name || ""].join(",")
  );
  const blob = new Blob([[header, ...body].join("\n")], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob), download: "available-vehicles.csv",
  });
  a.click(); URL.revokeObjectURL(a.href);
}

/* ── Skeleton Card ─────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={{
      background: "#fff", border: "1.5px solid #e5e7eb",
      borderRadius: 14, padding: "16px 14px 14px", overflow: "hidden",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={skEl(28, 28, 8)} /><div style={skEl(50, 16, 20)} />
      </div>
      <div style={{ ...skEl("70%", 13, 4), marginBottom: 6 }} />
      <div style={{ ...skEl("45%", 10, 4), marginBottom: 14 }} />
      <div style={{ display: "flex", gap: 5 }}>
        <div style={skEl(44, 20, 6)} /><div style={skEl(36, 20, 6)} /><div style={skEl(36, 20, 6)} />
      </div>
    </div>
  );
}
const skEl = (w, h, r) => ({
  width: w, height: h, borderRadius: r,
  background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
  backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
});

/* ── Available Vehicle Card ────────────────────────────────── */
function AvailableCard({ v }) {
  const [hov, setHov] = useState(false);
  const color = "#10b981";
  const fs = FUEL_STYLE[v.fuel] || FUEL_STYLE.Diesel;
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff", border: `1.5px solid ${hov ? color : "#e5e7eb"}`,
        borderRadius: 14, padding: "16px 14px 14px", cursor: "pointer",
        position: "relative", overflow: "hidden", transition: "all .22s ease",
        transform: hov ? "translateY(-3px)" : "none",
        boxShadow: hov ? `0 10px 30px ${color}28,0 2px 8px rgba(0,0,0,0.06)` : "0 1px 4px rgba(0,0,0,0.05)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: color, opacity: hov ? 1 : 0.35, transition: "opacity .22s", borderRadius: "14px 14px 0 0",
      }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ fontSize: 28 }}>🚘</span>
        <span style={{ fontSize: 9, fontWeight: 700, background: "#dcfce7", color: "#15803d", borderRadius: 20, padding: "2px 8px", letterSpacing: "0.06em" }}>✓ AVAILABLE</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginBottom: 2 }}>{v.vehicleNumber}</div>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 11 }}>{v.typeOfVehicle}</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
        {v.ownerFactoryId && (
          <span style={{ ...chipBase, background: fs.bg, color: fs.color }}>{v.ownerFactoryId.name}</span>
        )}
        <span style={{ ...chipBase, background: "#f3f4f6", color: "#6b7280" }}>
          {v.type === "internal" ? "🏭 Internal" : "🌐 External"}
        </span>
        {v.driverId?.name && (
          <span style={{ ...chipBase, background: "#f3f4f6", color: "#6b7280" }}>👤 {v.driverId.name}</span>
        )}
      </div>
      <div style={{
        fontSize: 10, fontWeight: 700, color: "#c8cdd7", background: "#f9fafb",
        borderRadius: 6, padding: "3px 8px", display: "inline-block", letterSpacing: "0.1em",
      }}>{v.vehicleNumber}</div>
    </div>
  );
}

/* ── Closed Trip Card ──────────────────────────────────────── */
function ClosedTripCard({ v }) {
  const [hov, setHov] = useState(false);
  const color = "#f97316";
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff", border: `1.5px solid ${hov ? color : "#e5e7eb"}`,
        borderRadius: 14, padding: "16px 14px 14px", cursor: "pointer",
        position: "relative", overflow: "hidden", transition: "all .22s ease",
        transform: hov ? "translateY(-3px)" : "none",
        boxShadow: hov ? `0 10px 30px ${color}28,0 2px 8px rgba(0,0,0,0.06)` : "0 1px 4px rgba(0,0,0,0.05)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: color, opacity: hov ? 1 : 0.35, transition: "opacity .22s", borderRadius: "14px 14px 0 0",
      }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ fontSize: 28 }}>🚛</span>
        <span style={{ fontSize: 9, fontWeight: 700, background: "#fff7ed", color: "#c2410c", borderRadius: 20, padding: "2px 8px", letterSpacing: "0.06em" }}> CLOSED</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginBottom: 2 }}>
        {v.vehicle?.vehicleNumber || "—"}
      </div>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 11 }}>
        {v.sourceFactory?.name || "?"} → {v.destinationFactory?.name || "?"}
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
        {v.driver?.driverName && (
          <span style={{ ...chipBase, background: "#f3f4f6", color: "#6b7280" }}>👤 {v.driver.driverName}</span>
        )}
        {v.driver?.driverContact && (
          <span style={{ ...chipBase, background: "#f3f4f6", color: "#6b7280" }}>📞 {v.driver.driverContact}</span>
        )}
      </div>
      {v.updatedAt && (
        <div style={{
          fontSize: 10, fontWeight: 700, color: "#88898a", background: "#f9fafb",
          borderRadius: 6, padding: "3px 8px", display: "inline-block", letterSpacing: "0.1em",
        }}>
          {new Date(v.updatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}

const chipBase = { fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "3px 8px", display: "inline-block" };

/* ── Stats Bar ─────────────────────────────────────────────── */
function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div style={{
      display: "flex", gap: 8, padding: "10px 20px",
      background: "#fff", borderBottom: "1px solid #f0f0f0",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {[
        { label: "Trips",    value: stats.totalTrips,         bg: "#eff6ff", color: "#3b82f6" },
        { label: "Vehicles", value: stats.uniqueVehicleCount, bg: "#f0fdf4", color: "#16a34a" },
        { label: "Drivers",  value: stats.uniqueDriverCount,  bg: "#fff7ed", color: "#c2410c" },
      ].map(s => (
        <div key={s.label} style={{ flex: 1, textAlign: "center", background: s.bg, borderRadius: 10, padding: "8px 4px" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: s.color }}>{s.value}</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   VehicleDrawer
════════════════════════════════════════════════════════════ */
export default function VehicleDrawer({ open = false, onClose = () => {} }) {
  const [segment, setSegment]     = useState("available");
  const [search, setSearch]       = useState("");
  const [dateRange, setDateRange] = useState([null, null]);
  const [dlFlash, setDlFlash]     = useState(false);

  /* ── Available vehicles state ── */
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [availLoading, setAvailLoading]           = useState(false);
  const [availError, setAvailError]               = useState(null);

  /* ── Closed trips state ── */
  const [closedTrips, setClosedTrips]       = useState([]);
  const [closedStats, setClosedStats]       = useState(null);
  const [closedLoading, setClosedLoading]   = useState(false);
  const [closedError, setClosedError]       = useState(null);
  const [isDefaultRange, setIsDefaultRange] = useState(true);

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

  /* ── Fetch closed trips ── */
  const fetchClosedTrips = useCallback(async (from, to) => {
    setClosedLoading(true); setClosedError(null);
    try {
      const params = {};
      if (from) params.from = from.format("YYYY-MM-DD");
      if (to)   params.to   = to.format("YYYY-MM-DD");
      const res = await api.get("/trip/closed", { params });
      setClosedTrips(res.data.data  || []);
      setClosedStats(res.data.stats || null);
      setIsDefaultRange(res.data.dateRange?.isDefault ?? true);
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

  /* ── Source list & client-side search ── */
  const sourceList = segment === "available" ? availableVehicles : closedTrips;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return sourceList;
    if (segment === "available") {
      return sourceList.filter(v =>
        (v.vehicleNumber   ?? "").toLowerCase().includes(q) ||
        (v.typeOfVehicle   ?? "").toLowerCase().includes(q) ||
        (v.type            ?? "").toLowerCase().includes(q) ||
        (v.driverId?.name  ?? "").toLowerCase().includes(q)
      );
    }
    return sourceList.filter(v =>
      (v.vehicle?.vehicleNumber    ?? "").toLowerCase().includes(q) ||
      (v.driver?.driverName        ?? "").toLowerCase().includes(q) ||
      (v.driver?.driverContact     ?? "").toLowerCase().includes(q)
    );
  }, [sourceList, search, segment]);

  /* ── Download handler ── */
  const handleDownload = () => {
    if (segment === "closed") {
      exportClosedTripsXLSX(filtered);          // ← Excel with full details
    } else {
      exportAvailableCSV(filtered);             // ← simple CSV
    }
    setDlFlash(true);
    setTimeout(() => setDlFlash(false), 1400);
  };

  const isLoading   = segment === "available" ? availLoading : closedLoading;
  const activeError = segment === "available" ? availError   : closedError;
  const accentColor = segment === "available" ? "#10b981"    : "#f97316";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .vd-root .ant-drawer-content-wrapper { box-shadow:-6px 0 40px rgba(0,0,0,0.12) !important; }
        .vd-root .ant-drawer-content { border-radius:0 !important; }
        .vd-root .ant-drawer-header { padding:16px 20px !important; border-bottom:1px solid #f0f0f0 !important; background:#fff !important; }
        .vd-root .ant-drawer-title { font-family:'Plus Jakarta Sans',sans-serif !important; }
        .vd-root .ant-drawer-body  { padding:0 !important; background:#f8fafc !important; }
        .vd-root .ant-drawer-close { color:#9ca3af !important; order:2 !important; }
        .vd-root .ant-picker { width:100%; border-radius:9px !important; font-family:'Plus Jakarta Sans',sans-serif !important; }
        .vd-root .ant-picker:hover,.vd-root .ant-picker-focused { border-color:#6366f1 !important; }
        .vd-root .ant-input-affix-wrapper { border-radius:9px !important; font-family:'Plus Jakarta Sans',sans-serif !important; font-size:13px !important; }
        .vd-root .ant-input-affix-wrapper:hover,
        .vd-root .ant-input-affix-wrapper-focused { border-color:#6366f1 !important; box-shadow:0 0 0 2px rgba(99,102,241,.1) !important; }
        .vd-root .ant-segmented { font-family:'Plus Jakarta Sans',sans-serif !important; border-radius:10px !important; }
        .vd-root .ant-segmented-item-label { font-weight:700 !important; font-size:12px !important; }
        .vd-daterange-hidden  { max-height:0;     opacity:0; overflow:hidden; pointer-events:none; }
        .vd-daterange-visible { max-height:120px; opacity:1; transition:max-height .28s ease,opacity .22s ease; overflow:hidden; }
        @keyframes shimmer  { to { background-position:-200% 0; } }
        @keyframes vdFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .vd-grid { animation:vdFadeUp .28s ease both; }
      `}</style>

      <Drawer
        rootClassName="vd-root"
        title={
          <div style={{ display:"flex", alignItems:"center", gap:10, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            <Truck color={accentColor} size={30} style={{ transition:"color .3s", flexShrink:0 }} />
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:"#2165f8", lineHeight:1.3 }}>Vehicles</div>
              <div style={{ fontSize:11, fontWeight:500, color:"#9ca3af" }}>Browse &amp; export fleet vehicles</div>
            </div>
          </div>
        }
        open={open} onClose={onClose} size={480} placement="right" destroyOnClose
      >

        {/* ══ 1 — Segment ═══════════════════════════════════════ */}
        <div style={{ ...layerStyle, paddingTop:16, paddingBottom:16 }}>
          <Segmented
            block value={segment}
            onChange={val => { setSegment(val); setSearch(""); }}
            options={[
              {
                label: (
                  <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"center" }}>
                    <Truck size={16} color="#10b981" />
                    <span style={{ color:"#15803d", fontWeight:700 }}>Available Vehicles</span>
                  </div>
                ),
                value: "available",
              },
              {
                label: (
                  <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"center" }}>
                    <EvCharger size={16} color="#f97316" />
                    <span style={{ color:"#f97316", fontWeight:700 }}>Closed Trips</span>
                  </div>
                ),
                value: "closed",
              },
            ]}
          />
        </div>

        {/* ══ 2 — Export ════════════════════════════════════════ */}
        <div style={layerStyle}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#374151" }}>Export Report</div>
              <div style={{ fontSize:11, color:"#9ca3af", marginTop:1 }}>
                {filtered.length} {segment === "available" ? "vehicle" : "trip"}{filtered.length !== 1 ? "s" : ""} •{" "}
                <span style={{ color: segment === "closed" ? "#16a34a" : "#9ca3af", fontWeight:600 }}>
                  {segment === "closed" ? "Excel (.xlsx)" : "CSV"}
                </span>
              </div>
            </div>
            <button
              onClick={handleDownload}
              style={{
                display:"flex", alignItems:"center", gap:7,
                background: dlFlash
                  ? "linear-gradient(135deg,#10b981,#059669)"
                  : "linear-gradient(135deg,#3b82f6,#6366f1)",
                border:"none", borderRadius:10, padding:"9px 20px", color:"#fff",
                fontWeight:700, fontSize:13, cursor:"pointer",
                fontFamily:"'Plus Jakarta Sans',sans-serif",
                boxShadow: dlFlash ? "0 2px 12px rgba(16,185,129,0.3)" : "0 2px 14px rgba(99,102,241,0.3)",
                transition:"all .25s", whiteSpace:"nowrap",
              }}
            >
              <span style={{ fontSize:15 }}>{dlFlash ? "✅" : "⬇"}</span>
              {dlFlash ? "Downloaded!" : segment === "closed" ? "Download Excel" : "Download CSV"}
            </button>
          </div>
        </div>

        {/* ══ 3 — Date Range (Closed only) ══════════════════════ */}
        <div
          className={segment === "closed" ? "vd-daterange-visible" : "vd-daterange-hidden"}
          style={{ background:"#fff", borderBottom: segment === "closed" ? "1px solid #f0f0f0" : "none" }}
        >
          <div style={{ padding:"14px 20px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:9 }}>
              <span style={labelStyle}>Filter by Date</span>
              {isDefaultRange && (
                <span style={{
                  fontSize:9, fontWeight:700, background:"#eff6ff", color:"#3b82f6",
                  borderRadius:20, padding:"2px 8px", letterSpacing:"0.05em",
                }}>⏱ Last 36 hrs</span>
              )}
            </div>
            <RangePicker
              style={{ width:"100%" }}
              onChange={vals => setDateRange(vals || [null, null])}
              placeholder={["Start date","End date"]}
              format="YYYY-MM-DD"
              allowClear size="middle"
            />
          </div>
        </div>

        {/* ══ 4 — Stats Bar (Closed only) ═══════════════════════ */}
        {segment === "closed" && !closedLoading && closedStats && (
          <StatsBar stats={closedStats} />
        )}

        {/* ══ 5 — Search ════════════════════════════════════════ */}
        <div style={layerStyle}>
          <div style={labelStyle}>
            {segment === "available" ? "Search Vehicles" : "Search by Vehicle / Driver"}
          </div>
          <Input
            placeholder={segment === "available" ? "Vehicle no., type…" : "Vehicle no., driver name or contact…"}
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear size="middle"
            prefix={<Search size={16} color="#d1d5db" />}
          />
        </div>

        {/* ══ 6 — Grid ══════════════════════════════════════════ */}
        <div style={{ padding:"18px 20px 32px", background:"#f8fafc" }}>
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            marginBottom:16, fontFamily:"'Plus Jakarta Sans',sans-serif",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:12, fontWeight:800, color:"#374151", textTransform:"uppercase", letterSpacing:"0.07em" }}>
                {segment === "available" ? "Available Vehicles" : "Closed Trips"}
              </span>
              <span style={{
                background: segment === "available" ? "#f0fdf4" : "#fff7ed",
                color:      segment === "available" ? "#16a34a" : "#c2410c",
                borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700,
              }}>{filtered.length}</span>
              {search && (
                <span style={{ background:"#fefce8", color:"#ca8a04", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 }}>Filtered</span>
              )}
            </div>
            <span style={{ fontSize:11, color:"#9ca3af", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
              {sourceList.length} total
            </span>
          </div>

          {isLoading && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))", gap:14 }}>
              {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
            </div>
          )}

          {!isLoading && activeError && (
            <div style={{ textAlign:"center", padding:"40px 20px", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
              <div style={{ fontSize:36, marginBottom:10 }}>⚠️</div>
              <div style={{ fontSize:14, fontWeight:700, color:"#dc2626", marginBottom:4 }}>Failed to load</div>
              <div style={{ fontSize:12, color:"#9ca3af" }}>{activeError}</div>
            </div>
          )}

          {!isLoading && !activeError && filtered.length > 0 && (
            <div className="vd-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))", gap:14 }}>
              {filtered.map((v, i) =>
                segment === "available"
                  ? <AvailableCard  key={v._id ?? i} v={v} />
                  : <ClosedTripCard key={v._id ?? i} v={v} />
              )}
            </div>
          )}

          {!isLoading && !activeError && filtered.length === 0 && (
            <div style={{ textAlign:"center", padding:"52px 20px", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
              <div style={{ fontSize:42, marginBottom:12, display:"flex", justifyContent:"center" }}>
                {segment === "available" ? <Truck size={42} color="#10b981" /> : <EvCharger size={42} color="#f97316" />}
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:"#374151", marginBottom:6 }}>
                No {segment === "available" ? "available vehicles" : "closed trips"}
              </div>
              <div style={{ fontSize:12, color:"#9ca3af" }}>
                {search ? "Clear search to see all" : segment === "closed" ? "No trips closed in this period" : "All vehicles are currently on trips"}
              </div>
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
}

/* ── Shared tokens ─────────────────────────────────────────── */
const layerStyle = { padding:"14px 20px", borderBottom:"1px solid #f0f0f0", background:"#fff" };
const labelStyle = {
  fontFamily:"'Plus Jakarta Sans',sans-serif",
  fontSize:11, fontWeight:700, letterSpacing:"0.08em",
  textTransform:"uppercase", color:"#9ca3af", marginBottom:9,
};