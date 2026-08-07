import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Table, Tag, Typography, Button, Space, Drawer, Empty, Avatar, Spin, message } from "antd";
import {
  ReloadOutlined,
  DownloadOutlined,
  LogoutOutlined,
  BankOutlined,
  CarOutlined,
  UserOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

import api  from "../../../../../services/API/Api/api"; // adjust to your real path
import {useDashboard} from "../../../../Global/Dashboard-Context/DashboardProvider";


import AdminNavbar from "../../Nav/AdminNavbar";
import {DEFAULT_DATE_RANGE, DEFAULT_LOCATION } from "../../Nav/AdminNavbar.jsx";


const { Title, Text } = Typography;

/**
 * Backed by:
 *   GET /analytics/executive-dashboard                     -> summary rows (one per factory)
 *   GET /analytics/executive-dashboard/:factoryId/:metricKey -> vehicle list for one cell
 * (see controllers/analyticsController.js)
 *
 * Summary row shape returned by the API:
 * {
 *   key: '64f...',              // factory _id (string) — also used as :factoryId in the drill-down call
 *   factory: 'PGTL',
 *   color: '#1677ff',
 *   insideNow, fgVehicles, rmVehicles, internalShifts,
 *   delay4hrs, delay12hrs, thisMonth, overstay, ready
 * }
 *
 * Vehicle detail row shape (drawer):
 * {
 *   tripId, vehicleNo, type, driverName, driverPhone,
 *   entryTime, waitingSince, durationMinutes, duration, purpose,
 *   status   // == the metricKey that was requested, e.g. "overstay"
 * }
 */

// Human-readable labels + tag colors, keyed by the same metricKey the backend
// uses for both the column and the vehicle-detail "status" field.
const METRIC_LABELS = {
  insideNow: "Inside Now",
  fgVehicles: "FG Vehicles",
  rmVehicles: "RM Vehicles",
  internalShifts: "Internal Shift",
  delay4hrs: "Waiting > 4 Hrs",
  delay12hrs: "Waiting > 12 Hrs",
  thisMonth: "This Month",
  overstay: "Overstay",
  ready: "Ready",
};

const statusColor = (metricKey) => {
  if (metricKey === "overstay" || metricKey === "delay12hrs") return "red";
  if (metricKey === "delay4hrs") return "orange";
  if (metricKey === "ready") return "gold";
  if (metricKey === "internalShifts") return "purple";
  return "green";
};

const formatDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

// Card-style wrapper used inside every cell. Clickable cells open the vehicle drawer.
const CardCell = ({ children, bg = "#fff", border, onClick, clickable }) => (
  <div
    onClick={onClick}
    className={clickable ? "exec-cell-clickable" : undefined}
    style={{
      background: bg,
      borderRadius: 12,
      boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
      border: border ? `1px solid ${border}22` : "1px solid #f0f0f0",
      padding: "10px 8px",
      minHeight: 48,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      cursor: clickable ? "pointer" : "default",
      transition: "transform .12s ease, box-shadow .12s ease",
    }}
  >
    {children}
  </div>
);

export default function ExecutiveDashboardTable({onDownloadAll, userName = "", stickyOffset = 0, }) {
  const [rows, setRows] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);

  const { setDateRange, setDates, setTableData, setIsFetching, setOnDateRangeChange, dateRange,  location, setFactory, factory, setOnFactoryChange, setDashboardRefetch } = useDashboard();

  const [drawer, setDrawer] = useState({
    open: false,
    loading: false,
    title: "",
    subtitle: "",
    vehicles: [],
  });

  useEffect(() => {
      if (!dateRange) {
        setDateRange(DEFAULT_DATE_RANGE);
      }
    }, [dateRange, setDateRange]);
    
  // GET /analytics/executive-dashboard
  const loadSummary = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await api.get("/analytics/executive-dashboard");
      setRows(res?.data?.data || []);
    } catch (err) {
      message.error("Failed to load the executive dashboard");
    } finally {
      setTableLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // GET /analytics/executive-dashboard/:factoryId/:metricKey
  const openDrawer = async (record, metricKey) => {
    const label = METRIC_LABELS[metricKey] || metricKey;
    setDrawer({
      open: true,
      loading: true,
      title: `${record.factory} — ${label}`,
      subtitle: "Loading…",
      vehicles: [],
    });

    try {
      const res = await api.get(`/analytics/executive-dashboard/${record.key}/${metricKey}`);
      const vehicles = res?.data?.data || [];
      setDrawer({
        open: true,
        loading: false,
        title: `${record.factory} — ${label}`,
        subtitle: `${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"}`,
        vehicles,
      });
    } catch (err) {
      message.error("Failed to load vehicle details");
      setDrawer((d) => ({ ...d, loading: false, subtitle: "Failed to load" }));
    }
  };

  const numericCell = (key) => (value, record) => (
    <CardCell border={record.color} clickable onClick={() => openDrawer(record, key)}>
      <Text strong style={{ fontSize: 16, color: record.color }}>
        {value ?? 0}
      </Text>
    </CardCell>
  );

  const delayCell = (key) => (value, record) => (
    <CardCell border={value > 0 ? "#ff4d4f" : record.color} clickable onClick={() => openDrawer(record, key)}>
      <Text strong style={{ fontSize: 16, color: value > 0 ? "#cf1322" : record.color }}>
        {value ?? 0}
      </Text>
    </CardCell>
  );

  const columns = [
    {
      title: "Factory",
      dataIndex: "factory",
      key: "factory",
      fixed: "left",
      width: 210,
      render: (text, record) => (
        <CardCell bg={`${record.color}10`} border={record.color}>
          <Space>
            <BankOutlined style={{ color: record.color }} />
            <Text strong style={{ color: record.color, fontSize: 15 }}>
              {text}
            </Text>
          </Space>
        </CardCell>
      ),
    },
    { title: "Inside Now", dataIndex: "insideNow", key: "insideNow", width: 130, align: "center", render: numericCell("insideNow"), sorter: (a, b) => a.insideNow - b.insideNow },
    { title: "FG Vehicles", dataIndex: "fgVehicles", key: "fgVehicles", width: 130, align: "center", render: numericCell("fgVehicles"), sorter: (a, b) => a.fgVehicles - b.fgVehicles },
    { title: "RM Vehicles", dataIndex: "rmVehicles", key: "rmVehicles", width: 130, align: "center", render: numericCell("rmVehicles"), sorter: (a, b) => a.rmVehicles - b.rmVehicles },
    { title: "Internal Shift", dataIndex: "internalShifts", key: "internalShifts", width: 135, align: "center", render: numericCell("internalShifts"), sorter: (a, b) => a.internalShifts - b.internalShifts },
    { title: "Waiting > 4 Hrs", dataIndex: "delay4hrs", key: "delay4hrs", width: 145, align: "center", render: delayCell("delay4hrs"), sorter: (a, b) => a.delay4hrs - b.delay4hrs },
    { title: "Waiting > 12 Hrs", dataIndex: "delay12hrs", key: "delay12hrs", width: 150, align: "center", render: delayCell("delay12hrs"), sorter: (a, b) => a.delay12hrs - b.delay12hrs },
    { title: "This Month", dataIndex: "thisMonth", key: "thisMonth", width: 130, align: "center", render: numericCell("thisMonth") },
    {
      title: "Overstay",
      dataIndex: "overstay",
      key: "overstay",
      width: 140,
      align: "center",
      render: (value, record) => (
        <CardCell
          bg={value > 0 ? "#fff1f0" : "#fafafa"}
          border={value > 0 ? "#ff4d4f" : "#d9d9d9"}
          clickable
          onClick={() => openDrawer(record, "overstay")}
        >
          <Tag color={value > 0 ? "red" : "default"} style={{ margin: 0, borderRadius: 8 }}>
            {value ?? 0} Overstay
          </Tag>
        </CardCell>
      ),
      sorter: (a, b) => a.overstay - b.overstay,
    },
    {
      title: "Ready",
      dataIndex: "ready",
      key: "ready",
      width: 130,
      align: "center",
      render: (value, record) => (
        <CardCell
          bg={value > 0 ? "#fffbe6" : "#fafafa"}
          border={value > 0 ? "#faad14" : "#d9d9d9"}
          clickable
          onClick={() => openDrawer(record, "ready")}
        >
          <Tag color={value > 0 ? "gold" : "default"} style={{ margin: 0, borderRadius: 8 }}>
            {value ?? 0} Ready
          </Tag>
        </CardCell>
      ),
      sorter: (a, b) => a.ready - b.ready,
    },
  ];

  const totals = useMemo(() => {
    const keys = ["insideNow", "fgVehicles", "rmVehicles", "internalShifts", "delay4hrs", "delay12hrs", "thisMonth", "overstay", "ready"];
    return keys.reduce((acc, k) => {
      acc[k] = rows.reduce((sum, row) => sum + (row[k] || 0), 0);
      return acc;
    }, {});
  }, [rows]);

  return (
    // overflowX hidden here only — this is the page-level container, not an ancestor that
    // wraps the Table's own scroll region, so it won't break the sticky header (see note below).
    <div style={{ padding: 24, background: "#f5f5f5", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        .exec-table .ant-table {
          background: transparent;
        }
        .exec-table .ant-table-container table {
          border-collapse: separate;
          border-spacing: 10px 12px;
        }
        /* Header: solid, elevated, and pinned via antd's sticky prop */
        .exec-table .ant-table-thead > tr > th {
          background: #fff !important;
          border-radius: 12px !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          border: none !important;
          font-weight: 600;
          text-align: center;
          padding: 14px 8px !important;
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
          padding: 4px !important;
        }
        .exec-table .ant-table-tbody > tr:hover > td {
          background: transparent !important;
        }
        .exec-table .ant-table-summary > tr > td {
          background: transparent !important;
          border: none !important;
          padding: 4px !important;
        }
        .exec-cell-clickable:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.14);
        }
        .exec-cell-clickable:active {
          transform: translateY(0px);
        }
      `}</style>

      {/* Header */}
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
            onShare={() => {/* your share logic */}}
            onDownload={() => {handleDownload()}}
            // refetchDashboard={refetch}
        />


        <div>
          <Title level={3} style={{ margin: 0 }}>
            Executive Dashboard
          </Title>
          <Text type="secondary">Real-time Multi-Plant Operations Overview</Text>
        </div>
          <Button icon={<ReloadOutlined />} onClick={loadSummary} loading={tableLoading}>
            Refresh Data
          </Button>
      </div>

      {/* Table — scroll.x is handled internally by antd (its own overflow-x: auto region),
          so it stays contained under the viewport without any extra wrapping div. */}
      <Table
        className="exec-table"
        columns={columns}
        dataSource={rows}
        loading={tableLoading}
        bordered={false}
        pagination={false}
        sticky={{ offsetHeader: stickyOffset }}
        scroll={{ x: 1400 }}
        size="middle"
        summary={() => (
          <Table.Summary fixed="top">
            <Table.Summary.Row>
              {[
                ["All Plants", null],
                [totals.insideNow, null],
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
                    <Text strong style={{ color: warn ? "#ff7875" : "#fff" }}>
                      {val}
                    </Text>
                  </CardCell>
                </Table.Summary.Cell>
              ))}
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />

      {/* Vehicle drill-down drawer */}
      <Drawer
        title={
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: 16 }}>
              {drawer.title}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {drawer.subtitle}
            </Text>
          </Space>
        }
        placement="right"
        width={420}
        open={drawer.open}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
      >
        {drawer.loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <Spin />
          </div>
        ) : drawer.vehicles.length === 0 ? (
          <Empty description="No vehicles in this category" />
        ) : (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            {drawer.vehicles.map((v) => (
              <div
                key={v.tripId}
                style={{
                  border: "1px solid #f0f0f0",
                  borderRadius: 12,
                  padding: 14,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                <Space align="center" style={{ marginBottom: 8 }}>
                  <Avatar icon={<CarOutlined />} size="small" style={{ background: "#1677ff" }} />
                  <Text strong>{v.vehicleNo}</Text>
                  <Tag color={statusColor(v.status)}>{METRIC_LABELS[v.status] || v.status}</Tag>
                  <Tag>{v.type}</Tag>
                </Space>
                <div style={{ fontSize: 13, color: "#595959", lineHeight: 1.9 }}>
                  <div>
                    <UserOutlined style={{ marginRight: 6 }} />
                    {v.driverName}
                  </div>
                  <div>
                    <PhoneOutlined style={{ marginRight: 6 }} />
                    {v.driverPhone}
                  </div>
                  <div>
                    <ClockCircleOutlined style={{ marginRight: 6 }} />
                    Entry {formatDateTime(v.entryTime)} &middot; {v.duration}
                  </div>
                </div>
              </div>
            ))}
          </Space>
        )}
      </Drawer>
    </div>
  );
}