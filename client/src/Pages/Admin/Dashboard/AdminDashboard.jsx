import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../../services/API/Api/api";
import { Select, Card, message, Modal, Spin } from "antd";
import { debounce } from "lodash";
import { useQuery, useQueries } from "@tanstack/react-query";
// Side-effect import: registers Chart.js components for the chart wrappers below.
import "chart.js/auto";
import dayjs from "dayjs";

import AdminNavbar from "../Nav/AdminNavbar.jsx";
import { DEFAULT_DATE_RANGE } from "../Nav/AdminNavbar.jsx";
import { useDashboard } from "../../../Global/Dashboard-Context/DashboardProvider.jsx";

import Donut from "../components/Analytics/Donut.jsx";
import FlowChart from "../components/Analytics/FlowChart.jsx";
import BarChart from "../components/Analytics/BarChart.jsx";
import WaitingAnalysisCard from "../components/Analytics/WaitingAnalysisCard.jsx";
import TripExecutionDonut from "../components/Analytics/TripExecutionDonut.jsx";
import DriverAnalyticsCard from "../components/Analytics/DriverAnalyticsCard.jsx";
import PGBreakdownCard from "../components/Analytics/PGBreakdownCard.jsx";
import TripHeatmap from "../components/Trends/HeatMaps.jsx";
import DailyTripLine from "../components/Analytics/DailyTripLine.jsx";

import Skeleton from "../components/Loader/Skeleton.jsx";
import StatCell from "../components/Cards/StatCell.jsx";
import Delta from "../components/Cards/Delta.jsx";
import CardLabel from "../components/Cards/CardLabel.jsx";
import BigNumber from "../components/Cards/BigNumber.jsx";

const TRANSPORTERS = [
  { v: "ATUL PLAST", l: "ATUL PLAST" },
  { v: "CRAFTED", l: "CRAFTED" },
  { v: "DSP", l: "DSP" },
  { v: "DVS", l: "DVS" },
  { v: "INDIAN LOGISTIC", l: "INDIAN LOGISTIC" },
  { v: "KRISHNA", l: "KRISHNA" },
  { v: "N/A", l: "N/A" },
  { v: "PGEL", l: "PGEL" },
  { v: "PGTL", l: "PGTL" },
  { v: "RAJYOG", l: "RAJYOG" },
  { v: "SHIVTARA", l: "SHIVTARA" },
  { v: "SHIVTARA TRANSPORT", l: "SHIVTARA TRANSPORT" },
  { v: "SVR LOGISTICS", l: "SVR LOGISTICS" },
  { v: "Shivtara Transport", l: "Shivtara Transport" },
  { v: "Shri Ram Transport", l: "Shri Ram Transport" },
  { v: "shivtara", l: "shivtara" },
  { v: "vishwash", l: "vishwash" },
];

const VEHICLE_ICONS = {
  truck: "🚛", miniTruck: "🚚", containerTruck: "🚛", mixerTruck: "🚜",
  waterTanker: "🚒", tractor: "🚜", car: "🚗", bus: "🚌",
  ambulance: "🚑", van: "🚐", trailer: "🚋",
};

const C = {
  teal: "#0d9488", blue: "#24B1B1", tealLight: "#ccfbf1", tealMid: "#5eead4",
  slate: "#94a3b8", slateLight: "#e2e8f0", red: "#fca5a5", redDark: "#ef4444",
  bg: "#f8fafc", card: "#ffffff", border: "#e5e7eb", text: "#0f172a",
  muted: "#64748b", micro: "#94a3b8",
};

const EMPTY_TOP_VEHICLES = {
  all: { vehicles: [], maxTrips: 1 },
  internal: { vehicles: [], maxTrips: 1 },
  external: { vehicles: [], maxTrips: 1 },
};

// One endpoint per backend controller. `needsFactory: true` endpoints are
// skipped (never fired) until a factory is actually selected, since the
// waiting-analysis controller 400s without one.
const ENDPOINTS = [
  { key: "summary", url: "/analytics/vehicle-dashboard/summary" },
  { key: "usage", url: "/analytics/vehicle-dashboard/usage" },
  { key: "tripTypeSplit", url: "/analytics/vehicle-dashboard/trip-type-split" },
  { key: "topVehicles", url: "/analytics/vehicle-dashboard/top-vehicles" },
  { key: "waiting", url: "/analytics/vehicle-dashboard/waiting", needsFactory: true },
  { key: "drivers", url: "/analytics/vehicle-dashboard/drivers" },
  { key: "pgToPg", url: "/analytics/vehicle-dashboard/pg-to-pg" },
];

export default function VehiclePerformanceDashboard({ vehicleId: propVehicleId, activePage }) {
  const [period] = useState("month");
  const [vehicleType, setVehicleType] = useState("all");
  const [selectTransporter, setSelectTransporter] = useState("");
  const [trendsByTransporter, setTrendsByTransporter] = useState(null);
  const { setDateRange, dateRange, location, factory } = useDashboard();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);

  useEffect(() => {
    if (!dateRange) setDateRange(DEFAULT_DATE_RANGE);
  }, [dateRange, setDateRange]);

  // Stable primitives for query keys / params (dayjs objects are not stable keys).
  const startISO = dateRange?.[0]?.toISOString();
  const endISO = dateRange?.[1]?.toISOString();

  /* ---------------------------------------------------------------------
   * Top vehicle
   * Only feeds the "High Performed Vehicle" card + navbar label. It follows
   * the selected date range, and it NEVER blocks the rest of the dashboard:
   * if it fails or finds nothing, every other card still loads fleet-wide.
   * ------------------------------------------------------------------- */
  const { data: resolvedVehicleId, isLoading: isTopLoading } = useQuery({
    queryKey: ["topVehicle", startISO, endISO],
    queryFn: async () => {
      const { data } = await api.get("/analytics/vehicle-dashboard/top", {
        params: { startDate: startISO, endDate: endISO },
      });
      return data?.vehicleId ?? null;
    },
    enabled: !propVehicleId && activePage === "overview" && !!dateRange,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const vehicleId = propVehicleId ?? resolvedVehicleId ?? null;

  const handleDownload = async () => {
    if (isDownloading) {
      message.warning("A download is already in progress. Please wait.", 1.5);
      return;
    }
    try {
      setIsDownloading(true);
      setDownloadModalVisible(true);
      message.success("Preparing your download...", 1.5);
      const res = await api.get("/trip/download", {
        params: {
          factory,
          from: dateRange?.[0]?.format("YYYY-MM-DD"),
          to: dateRange?.[1]?.format("YYYY-MM-DD"),
          export: "xlsx",
        },
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(blob),
        download: `closed-trips-${new Date().toISOString().slice(0, 10)}.xlsx`,
      });
      a.click();
      URL.revokeObjectURL(a.href);
      message.success("Download Completed!", 2);
    } catch (err) {
      console.error("Error downloading report:", err?.response?.data?.message || err.message || err);
      Modal.error({ title: "Download Failed", content: "An error occurred while downloading the report. Please try again." });
    } finally {
      setIsDownloading(false);
      setDownloadModalVisible(false);
    }
  };

  const handleSearch = useMemo(
    () => debounce((val) => { if (val) setSelectTransporter(val); }, 500),
    []
  );
  useEffect(() => () => handleSearch.cancel(), [handleSearch]);

  useEffect(() => {
    if (!selectTransporter || activePage !== "overview") return;
    let cancelled = false;
    (async () => {
      try {
        const response = await api.get("/analytics/transporter-customer-trend", { params: { transporterName: selectTransporter } });
        if (!cancelled) setTrendsByTransporter(response.data);
      } catch (error) {
        console.error("Error fetching trends:", error);
      }
    })();
    return () => { cancelled = true; };
  }, [selectTransporter, activePage]);

  // `vehicleId` is optional: when null, the backend returns fleet-wide data
  // (axios drops undefined params).
  const commonParams = {
    vehicleId: vehicleId ?? undefined,
    period,
    startDate: startISO,
    endDate: endISO,
    location,
    factory,
    vehicleType,
  };

  // Fire all endpoints in parallel. Each tracks its own loading/error state,
  // so a slow card never blocks a fast one. They wait for the top-vehicle
  // lookup to settle (so we don't fire twice), but run even if it found nothing.
  const queries = useQueries({
    queries: ENDPOINTS.map(({ key, url, needsFactory }) => ({
      queryKey: ["vehicleDashboard", key, vehicleId ?? "fleet", period, startISO, endISO, factory, location, vehicleType],
      queryFn: () => api.get(url, { params: commonParams }).then(r => r.data),
      enabled: !isTopLoading && !!dateRange && (!needsFactory || !!factory),
      staleTime: 2 * 60 * 1000,
    })),
  });

  const byKey = Object.fromEntries(ENDPOINTS.map(({ key }, i) => [key, queries[i]]));
  const { summary, usage, topVehicles: topVehiclesQ, waiting, drivers, pgToPg } = byKey;

  // Only the summary call is required to render the page shell.
  const isPageLoading = isTopLoading || summary.isLoading || (!summary.data && !summary.isError);
  const isPageError = summary.isError;

  if (isPageLoading) return (
    <div style={s.page}>
      <style>{keyframes}</style>
      <div style={s.topBar}>
        <Skeleton w={200} h={20} />
        <Skeleton w={160} h={32} r={8} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "20px 0 18px", fontFamily: "'DM Sans', sans-serif" }}>
        Overall Performance Dashboard
      </div>
      <div style={s.grid}>
        <Skeleton h={460} r={14} style={{ gridColumn: "span 1" }} />
        <div style={{ gridColumn: "span 3", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          {[...Array(6)].map((_, i) => <Skeleton key={i} h={210} r={14} />)}
        </div>
      </div>
    </div>
  );

  if (isPageError) return (
    <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <div style={{ textAlign: "center", color: C.redDark, fontSize: 14 }}>
        Failed to load dashboard data.
      </div>
    </div>
  );

  /* ---------------- Null-safe data extraction ---------------- */
  const {
    vehicle = null,
    weeklyStats = {},
    sameDayColouser = null,
    tripExecution = null,
  } = summary.data ?? {};

  const vehicleUsage = usage.data?.vehicleUsage ?? { factoryChart: {} };
  const idleAnalysis = usage.data?.idleAnalysis;
  const topVehiclesAndTransporters = topVehiclesQ.data?.topVehiclesAndTransporters ?? {};
  const topVehiclesByType = topVehiclesQ.data?.topVehicles ?? EMPTY_TOP_VEHICLES;
  const waitingAnalysis = waiting.data?.waitingAnalysis;
  const driverAnalytics = drivers.data?.driverAnalytics;
  const pgToPgData = pgToPg.data?.pgToPg;

  const top5Vehicles = topVehiclesAndTransporters.top5Vehicles ?? [];
  const top5Transporters = topVehiclesAndTransporters.top5Transporters ?? [];
  const dailyTripsTrend = topVehiclesAndTransporters.dailyTripsTrend ?? [];
  const top25Vehicles = topVehiclesAndTransporters.top25Vehicles ?? [];
  const monthlyTrends = topVehiclesAndTransporters.monthlyTrends ?? [];
  const busiestDays = topVehiclesAndTransporters.busiestDays ?? [];
  const top5AvgPerDay = topVehiclesAndTransporters.top5AvgPerDay ?? [];

  const visibleVehicles = topVehiclesByType[vehicleType] ?? { vehicles: [], maxTrips: 1 };

  const sohPct = sameDayColouser?.sohPct;
  const sohDelta = typeof sohPct === "number" ? +(sohPct - 80).toFixed(1) : 0;

  return (
    <div style={s.page}>
      <style>{keyframes}</style>

      <AdminNavbar
        vehicleNumber={vehicle?.vehicleNumber ?? "All Vehicles"}
        onShare={() => {}}
        onDownload={handleDownload}
      />

      <Modal open={downloadModalVisible} footer={null} closable={false} maskClosable={false} centered>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 20 }}>
          <Spin size="large" />
          <h3 style={{ margin: 0 }}>Preparing Download...</h3>
          <p style={{ margin: 0, color: "#666" }}>Generating Excel report. Please wait.</p>
        </div>
      </Modal>

      <div style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "18px 0 16px", fontFamily: "'DM Sans', sans-serif" }}>
        Overall Performance Dashboard
      </div>

      <div style={s.grid}>
        <div style={{ gridColumn: "span 3", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>

          {/* High performed vehicle — the only card that needs a vehicle */}
          <Card style={{ gridColumn: "span 1", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
              <span className="block">Weekly Stats</span>
              <span className="text-yellow-500 mt-2">High Performed Vehicle</span>
            </div>

            {vehicle ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 14, background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ width: 72, height: 52, background: C.slateLight, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, flexShrink: 0 }}>
                    {VEHICLE_ICONS[vehicle.typeOfVehicle] ?? "🚛"}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{vehicle.vehicleNumber}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.text, fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
                      {vehicle.model ?? vehicle.vehicleNumber}
                    </div>
                    <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>
                      {vehicle.typeOfVehicle ?? "Vehicle"} · {vehicle.type === "internal" ? "PG Vehicle" : "External"}
                    </div>
                    <div style={{ fontSize: 10, color: C.micro, marginTop: 2 }}>
                      Updated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <StatCell label="Active Since" value={weeklyStats.activeSince ?? "—"} />
                  <StatCell label="Total Trips" value={(weeklyStats.totalClosedTrips ?? 0).toLocaleString("en-IN")} />
                  <StatCell label="Period Trips" value={weeklyStats.periodTrips ?? 0} accent />
                  <StatCell label="Completed" value={weeklyStats.periodClosed ?? 0} accent />
                  <StatCell label="Avg / Day" value={`${weeklyStats.avgTripsPerDay ?? 0} trips`} />
                  <StatCell label="Est. Trip Hours" value={`${weeklyStats.totalTripHours ?? 0}h`} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: vehicle.isActive ? "#f0fdf4" : "#fef2f2", border: `1px solid ${vehicle.isActive ? "#bbf7d0" : "#fecaca"}`, borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: vehicle.isActive ? "#22c55e" : C.redDark, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: vehicle.isActive ? "#15803d" : C.redDark }}>
                    {vehicle.isActive ? "Vehicle Active" : "Vehicle Inactive"}
                  </span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: C.muted, padding: "24px 4px" }}>
                No completed trips in this date range.
              </div>
            )}
          </Card>

          <div style={{ gridColumn: "span 2" }}>
            {usage.isLoading ? (
              <Skeleton h={280} r={14} />
            ) : (
              <FlowChart
                title={<div>Vehicle — Factory Flow, <span className="font-bold text-blue-700">From {dayjs(dateRange?.[0]).format("D MMM")} to {dayjs(dateRange?.[1]).format("D MMM")}</span></div>}
                dropDown={true}
                defaultMode="active"
                modes={[
                  { value: "active", label: "✓ Active Trips", color: C.blue, countLabel: "active", footerLabel: "Distribution of active trips across factories", data: vehicleUsage.factoryChart?.active ?? [] },
                  { value: "closed", label: "⟳  Completed Trips", color: C.teal, countLabel: "completed", footerLabel: "Distribution of completed trips across factories", data: vehicleUsage.factoryChart?.closed ?? [] },
                  { value: "cancelled", label: "✕  Cancelled Trips", color: "#EA5252", countLabel: "cancelled", footerLabel: "Distribution of cancelled trips across factories", data: vehicleUsage.factoryChart?.cancelled ?? [] },
                ]}
              />
            )}
          </div>
        </div>

        <div style={{ gridColumn: "span 3", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "auto auto", gap: 14 }}>

          <Card>
            <CardLabel>Same Day Closure Rate</CardLabel>
            <BigNumber style={{ color: (sohPct ?? 0) > 60 ? C.teal : C.redDark, fontSize: 24, margin: "6px 0" }}>
              {sohPct ?? 0}%
            </BigNumber>
            <div style={{ fontSize: 11, color: C.muted, margin: "2px 0 14px" }}>
              This period
              <Delta val={sohDelta} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", gap: 16 }}>
              <Donut
                size={110}
                stroke={14}
                label={`${sameDayColouser?.total ?? 0}`}
                sublabel="Total Trips"
                segments={sameDayColouser?.segments?.map(seg => ({ pct: seg.pct, color: seg.color })) ?? []}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sameDayColouser?.segments?.map(seg => (
                  <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{seg.label}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{seg.value} trips ({seg.pct}%)</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardLabel>Trip Execution (Internal vs External)</CardLabel>
            <div style={{ display: "flex", height: 190, justifyContent: "center", alignItems: "center" }}>
              <TripExecutionDonut segments={tripExecution?.bars ?? []} />
            </div>
          </Card>

          {topVehiclesQ.isLoading ? (
            <Skeleton h={190} r={14} />
          ) : (
            <BarChart
              title="Daily Trends"
              subtitle=" Daily trips trends "
              isLegendVisible={false}
              labels={dailyTripsTrend.map(d => d.label)}
              datasets={[{ label: "Trips", data: dailyTripsTrend.map(d => d.count), backgroundColor: "#4f8ef7cc", borderColor: "#4f8ef7", borderWidth: 1.5, borderRadius: 5 }]}
            />
          )}

          <div style={{ gridColumn: "span 3", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            {topVehiclesQ.isLoading ? (
              <>
                <Skeleton h={210} r={14} />
                <Skeleton h={210} r={14} style={{ gridColumn: "span 2" }} />
              </>
            ) : (
              <>
                <div style={{ gridColumn: "span 1", display: "flex", flexDirection: "column", gap: 14 }}>
                  <BarChart
                    title="Top 5 Vehicles"
                    labels={top5Vehicles.map(v => v.vehicleNumber)}
                    isLegendVisible={false}
                    datasets={[{ label: "Trips", data: top5Vehicles.map(v => v.tripCount), backgroundColor: "#4f8ef7cc", borderColor: "#4f8ef7", borderWidth: 1.5, borderRadius: 5 }]}
                  />
                </div>
                <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: 14 }}>
                  <BarChart
                    title="Top 5 Transporters"
                    labels={top5Transporters.map(t => t.transporterName)}
                    datasets={[
                      { label: "Trips", data: top5Transporters.map(t => t.tripCount), backgroundColor: "#4f8ef7cc", borderColor: "#4f8ef7", borderWidth: 1.5, borderRadius: 5 },
                      { label: "Vehicles", data: top5Transporters.map(t => t.vehicleCount), backgroundColor: "#09637E", borderColor: "#09637E", borderWidth: 1.5, borderRadius: 5 },
                    ]}
                  />
                </div>
              </>
            )}
          </div>

          <div style={{ gridColumn: "span 3", gridTemplateColumns: "1fr 1fr 1fr", display: "grid", gap: 14 }}>
            {topVehiclesQ.isLoading ? (
              <>
                <Skeleton h={210} r={14} />
                <Skeleton h={210} r={14} />
                <Skeleton h={210} r={14} />
              </>
            ) : (
              <>
                <BarChart
                  title="Monthly Trips Trend"
                  subtitle="Trips by month across selected range"
                  labels={monthlyTrends.map(m => m.label)}
                  isLegendVisible={true}
                  datasets={[
                    { label: "Completed", data: monthlyTrends.map(m => m.closed), backgroundColor: C.teal, _baseColor: C.teal },
                    { label: "Cancelled", data: monthlyTrends.map(m => m.cancelled), backgroundColor: C.red, _baseColor: C.red },
                    { label: "Active", data: monthlyTrends.map(m => m.active), backgroundColor: C.slate, _baseColor: C.slate },
                  ]}
                />
                <BarChart
                  title="Busiest Days"
                  subtitle="Top days by trip volume (descending)"
                  labels={busiestDays.map(d => dayjs(d.date).format("D MMM"))}
                  isLegendVisible={false}
                  datasets={[{ label: "Trips", data: busiestDays.map(d => d.count), backgroundColor: C.teal, _baseColor: C.teal }]}
                />
                <BarChart
                  title="Avg Trips / Day — Top 5 Vehicles"
                  subtitle="Based on active days only (days with ≥1 trip)"
                  labels={top5AvgPerDay.map(v => v.vehicleNumber)}
                  isLegendVisible={false}
                  datasets={[{ label: "Avg Trips/Day", data: top5AvgPerDay.map(v => v.avgTripsPerDay), backgroundColor: C.teal, _baseColor: C.teal }]}
                />
              </>
            )}
          </div>
        </div>

        <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto auto", gap: 14 }}>

          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
              <CardLabel>Top 10 Vehicles by Trips</CardLabel>
              <select
                value={vehicleType}
                onChange={e => setVehicleType(e.target.value)}
                style={{ fontSize: 11, fontWeight: 600, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", outline: "none" }}
              >
                <option value="all">All</option>
                <option value="internal">Internal</option>
                <option value="external">External</option>
              </select>
            </div>
            <div style={{ fontSize: 11, color: C.muted, margin: "2px 0 16px" }}>
              Ranked by completed segments · {period}
            </div>
            {topVehiclesQ.isLoading ? (
              <Skeleton h={200} r={10} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {visibleVehicles.vehicles?.map((v, i) => (
                  <div key={v.vehicleId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 18, fontSize: 10, fontWeight: 700, color: i < 3 ? C.teal : C.muted, textAlign: "right", flexShrink: 0 }}>#{i + 1}</span>
                    <span style={{ width: 80, fontSize: 12, fontWeight: 600, color: C.text, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.vehicleNumber}</span>
                    <div style={{ flex: 1, height: 8, background: C.border, borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${v.pct}%`, background: i === 0 ? C.teal : i < 3 ? `${C.teal}99` : "#94a3b8", borderRadius: 99, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
                    </div>
                    <span style={{ width: 32, fontSize: 12, fontWeight: 700, color: C.text, textAlign: "right", flexShrink: 0 }}>{v.tripCount}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            {usage.isLoading ? (
              <Skeleton h={200} r={10} />
            ) : (
              <DailyTripLine
                dailyTrend={idleAnalysis?.dailyTrend ?? []}
                labels={idleAnalysis?.dailyTrend?.map(d => d.label) ?? []}
                activeDays={idleAnalysis?.activeDays}
                idleDays={idleAnalysis?.idleDays}
                period={period}
              />
            )}
          </Card>

          <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto", gap: 14 }}>
            {waiting.isLoading || !factory ? (
              <Skeleton h={180} r={14} />
            ) : (
              <WaitingAnalysisCard waitingAnalysis={waitingAnalysis} />
            )}
            {pgToPg.isLoading ? (
              <Skeleton h={180} r={14} />
            ) : (
              <PGBreakdownCard
                delivery={pgToPgData?.delivery ?? { p2p: { count: 0 }, customerDelivery: { count: 0 } }}
                pickup={pgToPgData?.pickup ?? { p2p: { count: 0 }, external: { count: 0 } }}
              />
            )}
          </div>
        </div>
      </div>

      <Card style={{ marginTop: 14, marginBottom: 14, minHeight: 300, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "end", padding: "0 40px", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Transporter:</span>
          <Select
            showSearch
            value={selectTransporter || undefined}
            placeholder="Type transporter name..."
            defaultActiveFirstOption={false}
            filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
            style={{ width: 240 }}
            onChange={(val) => setSelectTransporter(val)}
            onSearch={handleSearch}
            options={TRANSPORTERS.map(t => ({ value: t.v, label: t.l }))}
          />
        </div>

        {trendsByTransporter ? (
          <FlowChart
            title={`${selectTransporter} — Customer Flow`}
            dropDown={false}
            defaultMode="data"
            modes={[{
              value: "data",
              label: selectTransporter,
              color: "#39B1D1",
              countLabel: "total",
              footerLabel: `${trendsByTransporter.totalTrips} trips · ${trendsByTransporter.customers?.length ?? 0} customers`,
              data: Array.isArray(trendsByTransporter.customers)
                ? trendsByTransporter.customers.map(c => ({ factoryName: c.customerName, count: c.totalTrips }))
                : [],
            }]}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0" }}>
            <span style={{ fontSize: 12, color: C.muted }}>Select a transporter to view customer trends.</span>
          </div>
        )}
      </Card>

      {topVehiclesQ.isLoading ? (
        <Skeleton h={320} r={14} style={{ marginTop: 14 }} />
      ) : top25Vehicles.length > 0 && (
        <div style={{ flex: "1 1 600px", minWidth: 0 }}>
          <TripHeatmap
            vehicles={top25Vehicles}
            dates={top25Vehicles[0]?.dailyTrips?.map(d => ({ date: d.date, label: d.label }))}
            matrix={top25Vehicles.map(v =>
              top25Vehicles[0]?.dailyTrips?.map(dateRef => v.dailyTrips?.find(d => d.date === dateRef.date)?.tripCount ?? 0)
            )}
            title="Top 25 Vehicles Trip Heatmap"
            subtitle="Trips per vehicle per day"
          />
        </div>
      )}

      <Card style={{ marginTop: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          <div style={{ flex: "1 1 300px", minWidth: 0 }}>
            {drivers.isLoading ? (
              <Skeleton h={220} r={14} />
            ) : (
              <DriverAnalyticsCard driverAnalytics={driverAnalytics} />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

const s = {
  page: { position: "relative", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: C.bg, minHeight: "100vh", padding: "5px 15px", boxSizing: "border-box", borderRadius: 14 },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", width: "100%", gap: 10 },
  grid: { display: "grid", gridTemplateColumns: "280px 1fr", gap: 14, alignItems: "start" },
};

const keyframes = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
`;