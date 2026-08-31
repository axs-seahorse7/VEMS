import React, { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { Table, Tag, Typography, Button, Space, Drawer, Empty, Avatar, Spin, message } from "antd";
import {
  BankOutlined,
  CarOutlined,
  UserOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  ArrowRightOutlined,
  InboxOutlined,
  FileTextOutlined,
  SyncOutlined,
} from "@ant-design/icons";

import api  from "../../../../../services/API/Api/api";
import {useDashboard} from "../../../../Global/Dashboard-Context/DashboardProvider";

import AdminNavbar from "../../Nav/AdminNavbar";
import {DEFAULT_DATE_RANGE, DEFAULT_LOCATION } from "../../Nav/AdminNavbar.jsx";

const { Title, Text } = Typography;

const METRIC_LABELS = {
  insideNow: "Inside Now",
  activeTrips: "Active Trips",
  fgVehicles: "FG Vehicles",
  rmVehicles: "RM Vehicles",
  internalShifts: "Internal Shift",
  delay4hrs: "Waiting > 4 Hrs",
  delay12hrs: "Waiting > 12 Hrs",
  thisMonth: "This Month",
  overstay: "Overstay",
  ready: "Ready",
};

const ACTION_LABELS = {
  begin: "Trip Started",
  arrived: "Arrived",
  checkin: "Checked In",
  intra_plant_checkin: "Checked In (Intra-Plant)",
  checkout: "Checked Out",
  load: "Loaded",
  unload: "Unloaded",
  dispatched: "Dispatched",
  route_change: "Route Changed",
  complete: "Completed",
  closed: "Closed",
  cancelled: "Cancelled",
};

const WORK_LOCATION_LABELS = {
  storeSite: "Store Site",
  atGate: "Security Gate",
  dispatchSite: "Dispatch Site",
};

const PAGE_SIZE = 20;


const actionColor = (action) => {
  if (action === "cancelled") return "#ff4d4f";
  if (action === "complete" || action === "closed") return "#52c41a";
  if (action === "load" || action === "unload") return "#1677ff";
  return "#fa8c16"; // arrived, checkin, checkout, dispatched, route_change, begin
};

const statusColor = (metricKey) => {
  if (metricKey === "overstay" || metricKey === "delay12hrs") return "red";
  if (metricKey === "delay4hrs") return "orange";
  if (metricKey === "ready") return "gold";
  if (metricKey === "internalShifts") return "purple";
  return "green";
};

const loadStatusColor = (loadStatus) => {
  if (loadStatus === "loaded") return "blue";
  if (loadStatus === "unloaded") return "green";
  return "orange";
};

const tripStateColor = (tripState) => {
  if (tripState === "ACTIVE") return "green";
  if (tripState === "COMPLETED") return "blue";
  if (tripState === "CANCELLED") return "red";
  return "default";
};
const tripSegmentStatusColor = (segmentStatus) => {
  if (segmentStatus === "ACTIVE") return "green";
  if (segmentStatus === "COMPLETED") return "blue";
  if (segmentStatus === "CANCELLED") return "red";
  return "default";
};

const formatDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

// Card-style wrapper used inside every cell. Clickable cells open the vehicle drawer.
// Sizing tightened: smaller minHeight, tighter padding, smaller radius/shadow —
// this is the shape every column reuses, so shrinking it here shrinks the whole table.
// CardCell: add an `align` prop, default "center" so nothing else changes
const CardCell = ({ children, bg = "#fff", border, onClick, clickable, align = "center" }) => (
  <div
    onClick={onClick}
    className={clickable ? "exec-cell-clickable" : undefined}
    style={{
      background: bg,
      borderRadius: 8,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      border: border ? `1px solid ${border}22` : "1px solid #f0f0f0",
      padding: "5px 6px",
      minHeight: 40,
      display: "flex",
      alignItems: "center",
      justifyContent: align === "left" ? "flex-start" : "center",
      textAlign: align,
      cursor: clickable ? "pointer" : "default",
      transition: "transform .12s ease, box-shadow .12s ease",
    }}
  >
    {children}
  </div>
);

export default function ExecutiveDashboardTable({onDownloadAll, userName = "", stickyOffset = 70, }) {
  const [rows, setRows] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);

  const { setDateRange, setDates, setTableData, setIsFetching, setOnDateRangeChange, dateRange,  location, setFactory, factory, setOnFactoryChange, setDashboardRefetch } = useDashboard();

  useEffect(() => {
      if (!dateRange) {
        setDateRange(DEFAULT_DATE_RANGE);
      }
    }, [dateRange, setDateRange]);

  const loadSummary = useCallback(async () => {
    setTableLoading(true);
    try {
      const { data } = await api.get(
        `/analytics/executive-dashboard/${location || "all"}`
      );
      setRows(data?.data || []);
    } catch (error) {
      console.error(error);
      message.error("Cannot sync executive dashboard data.");
    } finally {
      setTableLoading(false);
    }
  }, [location]);

  useEffect(() => {
    loadSummary();
    const interval = setInterval(loadSummary, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadSummary]);


// ...inside component...
const [drawer, setDrawer] = useState({
  open: false,
  loading: false,
  loadingMore: false,
  title: "",
  subtitle: "",
  vehicles: [],
  page: 1,
  hasMore: false,
  factoryKey: null,
  metricKey: null,
});

const openDrawer = async (record, metricKey) => {
  const label = METRIC_LABELS[metricKey] || metricKey;
  setDrawer({
    open: true,
    loading: true,
    loadingMore: false,
    title: `${record.factory} — ${label}`,
    subtitle: "Loading…",
    vehicles: [],
    page: 1,
    hasMore: false,
    factoryKey: record.key,
    metricKey,
  });

  try {
    const res = await api.get(`/analytics/executive-dashboard/${record.key}/${metricKey}${location ? `?location=${location}` : ""}`,
      { params: { page: 1, limit: PAGE_SIZE } }
    );
    const body = res?.data || {};
    const vehicles = body.data || [];
    setDrawer((d) => ({
      ...d,
      loading: false,
      subtitle: `${body.total ?? vehicles.length} vehicle${(body.total ?? vehicles.length) === 1 ? "" : "s"}`,
      vehicles,
      page: 1,
      hasMore: !!body.hasMore,
    }));
  } catch (err) {
    message.error("Failed to load vehicle details");
    setDrawer((d) => ({ ...d, loading: false, subtitle: "Failed to load" }));
  }
};

const loadMoreVehicles = useCallback(async () => {
  setDrawer((d) => {
    if (d.loadingMore || !d.hasMore || !d.open) return d;
    return { ...d, loadingMore: true };
  });

  setDrawer((current) => {
    if (!current.loadingMore) return current; // guard above already blocked it
    const nextPage = current.page + 1;

    api
      .get(
        `/analytics/executive-dashboard/${current.factoryKey}/${current.metricKey}${location ? `?location=${location}` : ""}`,
        { params: { page: nextPage, limit: PAGE_SIZE } }
      )
      .then((res) => {
        const body = res?.data || {};
        setDrawer((d) => ({
          ...d,
          loadingMore: false,
          vehicles: [...d.vehicles, ...(body.data || [])],
          page: nextPage,
          hasMore: !!body.hasMore,
        }));
      })
      .catch(() => {
        message.error("Failed to load more vehicles");
        setDrawer((d) => ({ ...d, loadingMore: false }));
      });

    return current;
  });
}, [location]);


const [downloading, setDownloading] = useState(false);

const handleDownload = useCallback(async () => {
  setDownloading(true);
  try {
    const res = await api.get(`/analytics/executive-dashboard/download${location ? `?location=${location}` : ""}`,
      { responseType: "blob" }
    );

    // pull the filename the server set, fall back to a sane default
    const disposition = res.headers["content-disposition"] || "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename =
      match?.[1] || `executive-dashboard-${new Date().toISOString().slice(0, 10)}.xlsx`;

    const blob = new Blob([res.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    message.error("Failed to download executive dashboard.");
  } finally {
    setDownloading(false);
  }
}, [location]);


const scrollRef = useRef(null);
const sentinelRef = useRef(null);

useEffect(() => {
  if (!drawer.open) return;
  const root = scrollRef.current;
  const target = sentinelRef.current;
  if (!root || !target) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && drawer.hasMore && !drawer.loadingMore && !drawer.loading) {
        loadMoreVehicles();
      }
    },
    { root, rootMargin: "150px" }
  );

  observer.observe(target);
  return () => observer.disconnect();
}, [drawer.open, drawer.hasMore, drawer.loadingMore, drawer.loading]);

  // font size dropped 16 -> 13 to match the tighter CardCell
  const numericCell = (key) => (value, record) => (
    <CardCell border={record.color} clickable onClick={() => openDrawer(record, key)}>
      <Text strong style={{ fontSize: 13, color: record.color }}>
        {value ?? 0}
      </Text>
    </CardCell>
  );

  const delayCell = (key) => (value, record) => (
    <CardCell border={value > 0 ? "#ff4d4f" : record.color} clickable onClick={() => openDrawer(record, key)}>
      <Text strong style={{ fontSize: 13, color: value > 0 ? "#cf1322" : record.color }}>
        {value ?? 0}
      </Text>
    </CardCell>
  );

  // Column widths tightened across the board — Factory kept readable at 160,

  const columns = [
    // Factory column render — pass align="left", add a little left padding
    // so the icon isn't flush against the pill's rounded edge
    {
      title: "Factory",
      dataIndex: "factory",
      key: "factory",
      fixed: "left",
      width: 160,
      render: (text, record) => (
        <CardCell bg={`${record.color}10`} border={record.color} align="left">
          <Space size={6} align="center" style={{ paddingLeft: 4 }}>
            <BankOutlined style={{ color: record.color, fontSize: 18, flexShrink: 0 }} />
            <div style={{ textAlign: "left", minWidth: 0 }}>
              <Text
                strong
                style={{
                  color: record.color,
                  fontSize: 13,
                  display: "block",
                  lineHeight: 1.25,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {text}
              </Text>
              {record.location && record.location !== "N/A" && (
                <Text
                  style={{
                    fontSize: 10,
                    color: "#8c8c8c",
                    display: "block",
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {record.location}
                </Text>
              )}
            </div>
          </Space>
        </CardCell>
      ),
    },
    { title: "Inside Now", dataIndex: "insideNow", key: "insideNow", width: 90, align: "center", render: numericCell("insideNow"), sorter: (a, b) => a.insideNow - b.insideNow },
    { title: "Active Trips", dataIndex: "activeTrips", key: "activeTrips", width: 90, align: "center", render: numericCell("activeTrips"), sorter: (a, b) => a.activeTrips - b.activeTrips },
    { title: "FG Vehicles", dataIndex: "fgVehicles", key: "fgVehicles", width: 90, align: "center", render: numericCell("fgVehicles"), sorter: (a, b) => a.fgVehicles - b.fgVehicles },
    { title: "RM Vehicles", dataIndex: "rmVehicles", key: "rmVehicles", width: 90, align: "center", render: numericCell("rmVehicles"), sorter: (a, b) => a.rmVehicles - b.rmVehicles },
    { title: "Internal Shift", dataIndex: "internalShifts", key: "internalShifts", width: 94, align: "center", render: numericCell("internalShifts"), sorter: (a, b) => a.internalShifts - b.internalShifts },
    { title: "Waiting > 4 Hrs", dataIndex: "delay4hrs", key: "delay4hrs", width: 96, align: "center", render: delayCell("delay4hrs"), sorter: (a, b) => a.delay4hrs - b.delay4hrs },
    { title: "Waiting > 12 Hrs", dataIndex: "delay12hrs", key: "delay12hrs", width: 100, align: "center", render: delayCell("delay12hrs"), sorter: (a, b) => a.delay12hrs - b.delay12hrs },
    { title: "This Month", dataIndex: "thisMonth", key: "thisMonth", width: 90, align: "center", render: numericCell("thisMonth") },
    {
      title: "Waiting > 24 Hrs",
      dataIndex: "overstay",
      key: "overstay",
      width: 100,
      align: "center",
      render: (value, record) => (
        <CardCell
          bg={value > 0 ? "#fff1f0" : "#fafafa"}
          border={value > 0 ? "#ff4d4f" : "#d9d9d9"}
          clickable
          onClick={() => openDrawer(record, "overstay")}
        >
          <Tag color={value > 0 ? "red" : "default"} style={{ margin: 0, borderRadius: 6, fontSize: 11, padding: "0 6px", lineHeight: "18px" }}>
            {value ?? 0} 
          </Tag>
        </CardCell>
      ),
      sorter: (a, b) => a.overstay - b.overstay,
    },
    {
      title: "Ready",
      dataIndex: "ready",
      key: "ready",
      width: 92,
      align: "center",
      render: (value, record) => (
        <CardCell
          bg={value > 0 ? "#fffbe6" : "#fafafa"}
          border={value > 0 ? "#faad14" : "#d9d9d9"}
          clickable
          onClick={() => openDrawer(record, "ready")}
        >
          <Tag color={value > 0 ? "gold" : "default"} style={{ margin: 0, borderRadius: 6, fontSize: 11, padding: "0 6px", lineHeight: "18px" }}>
            {value ?? 0} Ready
          </Tag>
        </CardCell>
      ),
      sorter: (a, b) => a.ready - b.ready,
    },
  ];

  const totals = useMemo(() => {
    const keys = ["insideNow", "activeTrips", "fgVehicles", "rmVehicles", "internalShifts", "delay4hrs", "delay12hrs", "thisMonth", "overstay", "ready"];
    return keys.reduce((acc, k) => {
      acc[k] = rows.reduce((sum, row) => sum + (row[k] || 0), 0);
      return acc;
    }, {});
  }, [rows]);

  return (
    <div style={{ padding: 10, background: "#f5f5f5", minHeight: "calc(100vh - 200px)", overflowX: "hidden" }}>
      <style>{`
        .exec-table .ant-table {
          background: transparent;
        }
        .exec-table .ant-table-container table {
          border-collapse: separate;
          border-spacing: 6px 6px;
        }
        .exec-table .ant-table-thead > tr > th {
          background: #fff !important;
          border-radius: 8px !important;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          border: none !important;
          font-weight: 600;
          font-size: 12px;
          text-align: center;
          padding: 8px 6px !important;
          white-space: nowrap;
        }
        .exec-table .ant-table-thead > tr > th::before {
          display: none !important;
        }
        .exec-table .ant-table-sticky-holder {
          z-index: 30;
          background: #f5f5f5 !important;
        }
        .exec-table .ant-table-tbody > tr > td {
          background: transparent !important;
          border: none !important;
          padding: 3px !important;
        }
        .exec-table .ant-table-tbody > tr:hover > td {
          background: transparent !important;
        }
        .exec-table .ant-table-summary > tr > td {
          background: transparent !important;
          border: none !important;
          padding: 3px !important;
        }
        .exec-cell-clickable:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(0,0,0,0.12);
        }
        .exec-cell-clickable:active {
          transform: translateY(0px);
        }
      `}</style>

      <div
          style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
          }}
      >
        <AdminNavbar
            vehicleNumber={""}
            refetchDashboard={loadSummary}
            onShare={() => {}}
            onDownload={handleDownload}
        />
      </div>

      <div style={{ overflowX: "auto", height: "calc(100vh - 200px)" }}>
        <Table
            className="exec-table"
            columns={columns}
            dataSource={rows}
            loading={tableLoading}
            bordered={false}
            pagination={false}
            sticky={{ offsetHeader: 0 }}
            scroll={{ x: 1100 }}
            size="small"
            summary={() => (
                <Table.Summary fixed="top">
                    <Table.Summary.Row>
                        {[
                          ["All Plants", null],
                          [totals.insideNow, null],
                          [totals.activeTrips, null],
                          [totals.fgVehicles, null],
                          [totals.rmVehicles, null],
                          [totals.internalShifts, null],
                          [totals.delay4hrs, totals.delay4hrs > 0],
                          [totals.delay12hrs, totals.delay12hrs > 0],
                          [totals.thisMonth, null],
                          [totals.overstay, null],
                          [totals.ready, null],
                        ].map(([val, warn], idx) => (
                            <Table.Summary.Cell index={idx} align={idx === 0 ? "left" : "center"} key={idx}>
                                <CardCell bg="#001529" border="#001529">
                                    <Text strong style={{ color: warn ? "#ff7875" : "#fff", fontSize: 13 }}>
                                      {val}
                                    </Text>
                                </CardCell>
                            </Table.Summary.Cell>
                        ))}
                    </Table.Summary.Row>
                </Table.Summary>
            )}
        />
      </div>

      {/* Drawer unchanged below — sizing there wasn't part of the complaint */}
      <Drawer
        title={
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: 16 }}>{drawer.title}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{drawer.subtitle}</Text>
          </Space>
        }
        placement="right"
        width={420}
        open={drawer.open}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        bodyStyle={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}
      >
        <div
          ref={scrollRef}
          style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16 }}
          onScroll={(e) => {
            const el = e.currentTarget;
            const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
            if (nearBottom && drawer.hasMore && !drawer.loadingMore && !drawer.loading) {
              loadMoreVehicles();
            }
          }}
        >
        {drawer.vehicles.map((v, i) => {
            const trip = v.tripDetails || {};
            const source = trip.sourceFactory;
            const current = trip.currentFactory;
            const destination = trip.destinationFactory;

            const InfoRow = ({ icon, label, value, color = "#595959" }) => (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "5px 0" }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 7,
                        background: `${color}14`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {React.cloneElement(icon, { style: { fontSize: 12, color } })}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <Text
                            style={{
                                fontSize: 10.5,
                                fontWeight: 600,
                                color: "#8c8c8c",
                                textTransform: "uppercase",
                                letterSpacing: 0.4,
                                display: "block",
                                lineHeight: 1.5,
                            }}
                        >
                            {label}
                        </Text>
                        <Text style={{ fontSize: 13, color: "#262626", fontWeight: 500 }}>{value}</Text>
                    </div>
                </div>
              );

              return (
                <div
                    key={v.tripId + v.vehicleNo || i}
                    style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 14, marginTop: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
                >
                    <Space align="center" style={{ marginBottom: 10 }} wrap>
                        <Avatar icon={<CarOutlined />} size="small" style={{ background: "#1677ff" }} />
                        <Text strong style={{ fontSize: 14 }}>{v.vehicleNo}</Text>
                        <Tag color={statusColor(v.status)}>{METRIC_LABELS[v.status] || v.status}</Tag>
                        <Tag>{v.typeOfVehicle ? v.typeOfVehicle.charAt(0).toUpperCase() + v.typeOfVehicle.slice(1) : "—"}</Tag>
                        {v.type && v.type !== "—" && <Tag color="cyan">{v.type}</Tag>}
                    </Space>

                    <div style={{ borderTop: "1px dashed #f0f0f0", paddingTop: 4 }}>
                        <InfoRow icon={<UserOutlined />} label="Driver" value={v.driverName || "—"} color="#0d9488" />
                        <InfoRow icon={<PhoneOutlined />} label="Contact" value={v.driverPhone || "—"} color="#0d9488" />
                        <InfoRow
                            icon={<ClockCircleOutlined />}
                            label="Entry / Waiting"
                            value={`${formatDateTime(v.entryTime)} ${v.duration ? ` · ${v.duration}` : ""}`}
                            color="#1677ff"
                        />
                        {(source || destination) && (
                            <InfoRow
                                icon={<ArrowRightOutlined />}
                                label="Route"
                                value={
                                  <>
                                    {source?.name || "—"}
                                    {source?.location ? ` (${source.location})` : ""}
                                    {" → "}
                                    {destination?.name || ""}
                                    {destination?.location ? ` (${destination.location})` : ""}
                                  </>
                                }
                                color="#722ed1"
                            />
                        )}
                        {current && (
                          <InfoRow
                            icon={<EnvironmentOutlined />}
                            label="Currently At"
                            value={`${current.name || "—"}${current.location ? ` (${current.location})` : ""}`}
                            color="#722ed1"
                          />
                        )}
                        {v.purpose && (
                          <InfoRow icon={<FileTextOutlined />} label="Purpose" value={v.purpose} color="#fa8c16" />
                        )}
                    </div>

                    {v.lastAction && (
                      <InfoRow
                        icon={<SyncOutlined />}
                        label="Last Action"
                        value={
                          <>
                            {ACTION_LABELS[v.lastAction.action] || v.lastAction.action}
                            {v.lastAction.timestamp ? ` · ${formatDateTime(v.lastAction.timestamp)}` : ""}
                            {v.lastAction.actionLocation && (
                              <span style={{ color: "#8c8c8c", fontWeight: 400 }}>
                                {" "}· {WORK_LOCATION_LABELS[v.lastAction.actionLocation] || v.lastAction.actionLocation}
                              </span>
                            )}
                            {v.lastAction.actionBy && (
                              <span style={{ display: "block", fontSize: 11, color: "#8c8c8c", fontWeight: 400, marginTop: 1 }}>
                                by <span style={{ fontWeight: 600, color: "#1890ff" }}>{v.lastAction.actionBy}</span>
                              </span>
                            )}
                          </>
                        }
                        color={actionColor(v.lastAction.action)}
                      />
                    )}

                    {(trip.loadStatus || trip.tripState || trip.tripType) && (
                        <div style={{ marginTop: 8, gap: 8, display: "flex", flexWrap: "wrap", paddingTop: 8, borderTop: "1px dashed #f0f0f0" }}>
                            {trip.loadStatus && (
                                <Tag icon={<InboxOutlined />} color={loadStatusColor(trip.loadStatus)} style={{ marginBottom: 4 }}>
                                    {trip.loadStatus}
                                </Tag>
                            )}
                            {trip.tripState && (
                                <Tag icon={<SyncOutlined />} color={tripStateColor(trip.tripState)} style={{ marginBottom: 4 }}>
                                    {trip.tripState}
                                </Tag>
                            )}
                            {trip?.tripType && (
                                <Tag style={{ marginBottom: 4 }}>
                                  {(trip.tripType === "external_delivery" || trip.tripType === "EXTERNAL") ? "External Trip" : "Internal Trip"}
                                </Tag>
                            )}

                            {trip?.segmentStatus && (
                                  <Tag style={{ marginBottom: 4 }} color={tripSegmentStatusColor(trip.segmentStatus)}>
                                    {trip.segmentStatus}
                                  </Tag>
                              )}
                        </div>
                    )}
                </div>
              );
          })}

        {drawer.loadingMore && (
          <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
            <Spin size="small" />
          </div>
        )}

        {!drawer.loading && !drawer.hasMore && drawer.vehicles.length > 0 && (
          <div style={{ textAlign: "center", padding: "12px 0", fontSize: 11, color: "#bfbfbf" }}>
            — end of list —
          </div>
        )}
        </div>
      </Drawer>
    </div>
  );
}