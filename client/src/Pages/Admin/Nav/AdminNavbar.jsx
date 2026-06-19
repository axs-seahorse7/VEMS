import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { DatePicker, Select, Popover, Input } from "antd";
import {
  EnvironmentOutlined,
  BankOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  ArrowLeftOutlined,
  FilterOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../../../services/API/Api/api";
import { useDashboard } from "../../../Global/Dashboard-Context/DashboardProvider.jsx";

const { RangePicker } = DatePicker;

const C = {
  bg: "#f0f9f9",
  teal: "#0d9488",
  tealLight: "#DFF1F1",
  text: "#0f172a",
  muted: "#64748b",
  slate: "#94a3b8",
  border: "#e2e8f0",
};

const LOCATION_OPTIONS = [
  { value: "SUPA",    label: "Supa"    },
  { value: "BHIWADI", label: "Bhiwadi" },
  { value: "KAROLI",  label: "Karoli"  },
];

const PRESETS = [
  { label: "Today",         value: [dayjs(), dayjs()] },
  { label: "Yesterday",     value: [dayjs().subtract(1, "day"), dayjs().subtract(1, "day")] },
  { label: "This Week",     value: [dayjs().startOf("week"), dayjs()] },
  { label: "This Month",    value: [dayjs().startOf("month"), dayjs()] },
  { label: "Last 3 Months", value: [dayjs().subtract(3, "month"), dayjs()] },
  { label: "This Year",     value: [dayjs().startOf("year"), dayjs()] },
];

const ANT_OVERRIDE_ID = "dashboard-navbar-ant-override";

if (!document.getElementById(ANT_OVERRIDE_ID)) {
  const style = document.createElement("style");
  style.id = ANT_OVERRIDE_ID;
  style.textContent = `
    .db-nav .ant-picker,
    .db-nav-popover .ant-picker {
      border-radius: 8px !important;
      border-color: ${C.border} !important;
      background: #fff !important;
      height: 32px !important;
      font-size: 12px !important;
      font-family: 'DM Sans', 'Segoe UI', sans-serif !important;
    }
    .db-nav .ant-picker:hover, .db-nav .ant-picker-focused,
    .db-nav-popover .ant-picker:hover, .db-nav-popover .ant-picker-focused {
      border-color: ${C.teal} !important;
      box-shadow: 0 0 0 2px rgba(13,148,136,0.12) !important;
    }
    .db-nav .ant-picker-input > input,
    .db-nav-popover .ant-picker-input > input {
      font-size: 12px !important;
      font-family: 'DM Sans', 'Segoe UI', sans-serif !important;
      color: ${C.text} !important;
    }
    .db-nav .ant-picker-separator, .db-nav .ant-picker-suffix,
    .db-nav-popover .ant-picker-separator, .db-nav-popover .ant-picker-suffix {
      color: ${C.muted} !important;
    }
    .db-nav .ant-select .ant-select-selector,
    .db-nav-popover .ant-select .ant-select-selector {
      border-radius: 8px !important;
      border-color: ${C.border} !important;
      background: #fff !important;
      height: 32px !important;
      align-items: center !important;
      font-size: 12px !important;
      font-family: 'DM Sans', 'Segoe UI', sans-serif !important;
    }
    .db-nav .ant-select:not(.ant-select-disabled):hover .ant-select-selector,
    .db-nav .ant-select-focused .ant-select-selector,
    .db-nav-popover .ant-select:not(.ant-select-disabled):hover .ant-select-selector,
    .db-nav-popover .ant-select-focused .ant-select-selector {
      border-color: ${C.teal} !important;
      box-shadow: 0 0 0 2px rgba(13,148,136,0.12) !important;
    }
    .db-nav .ant-select-selection-placeholder,
    .db-nav-popover .ant-select-selection-placeholder {
      font-size: 12px !important; color: ${C.muted} !important;
    }
    .db-nav .ant-select-selection-item,
    .db-nav-popover .ant-select-selection-item {
      font-size: 12px !important; color: ${C.text} !important; font-weight: 600 !important;
    }
    .ant-select-dropdown, .ant-picker-dropdown {
      font-family: 'DM Sans', 'Segoe UI', sans-serif !important;
      font-size: 12px !important;
    }
    .ant-select-item-option-selected:not(.ant-select-item-option-disabled) {
      background: ${C.tealLight} !important; color: ${C.teal} !important; font-weight: 600 !important;
    }
    .ant-select-item-option-active:not(.ant-select-item-option-disabled) {
      background: #f0fdfa !important;
    }
    .ant-picker-cell-in-view.ant-picker-cell-selected .ant-picker-cell-inner,
    .ant-picker-cell-in-view.ant-picker-cell-range-start .ant-picker-cell-inner,
    .ant-picker-cell-in-view.ant-picker-cell-range-end .ant-picker-cell-inner {
      background: ${C.teal} !important;
    }
    .ant-picker-cell-in-view.ant-picker-cell-in-range::before {
      background: ${C.tealLight} !important;
    }
    .ant-btn-primary { background: ${C.teal} !important; border-color: ${C.teal} !important; }
    .ant-picker-preset > .ant-tag {
      border-radius: 6px !important;
      cursor: pointer !important;
      font-size: 11px !important;
      font-family: 'DM Sans', 'Segoe UI', sans-serif !important;
      border-color: ${C.border} !important;
      color: ${C.text} !important;
      background: #f8fafc !important;
      padding: 2px 10px !important;
      transition: all 0.15s !important;
    }
    .ant-picker-preset > .ant-tag:hover {
      background: ${C.tealLight} !important;
      border-color: ${C.teal} !important;
      color: ${C.teal} !important;
    }
    @keyframes pillIn {
      from { opacity: 0; transform: translateY(-6px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0)   scale(1);    }
    }
    .db-float-pill { animation: pillIn 0.18s ease; }
    .db-nav-popover .ant-popover-inner {
      padding: 14px 16px !important;
      border-radius: 12px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.14) !important;
    }
    .db-nav-popover .ant-popover-arrow { display: none !important; }
  `;
  document.head.appendChild(style);
}

const s = {
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    width: "100%",
    gap: 10,
    padding: "8px 0",
  },

  left: {
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 13, color: C.muted,
  },

  right: {
    display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
  },

  backBtn: {
    background: "#f1f5f9", border: `1px solid ${C.border}`,
    borderRadius: 8, width: 30, height: 30,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, cursor: "pointer", color: C.text, fontWeight: 700,
  },

  divider: { width: 1, height: 20, background: C.border, margin: "0 2px" },

  label: { fontSize: 11, color: C.muted, fontWeight: 600, whiteSpace: "nowrap" },

  shareBtn: {
    display: "flex", alignItems: "center", gap: 5,
    padding: "0 14px", height: 32,
    fontSize: 12, fontWeight: 600,
    border: `1px solid ${C.border}`, borderRadius: 8,
    background: "#fff", color: "#093C5D", cursor: "pointer",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },

  downloadBtn: {
    display: "flex", alignItems: "center", gap: 5,
    padding: "0 14px", height: 32,
    fontSize: 12, fontWeight: 700,
    border: "none", borderRadius: 8,
    background: C.teal, color: "#fff", cursor: "pointer",
    boxShadow: "0 2px 8px rgba(13,148,136,0.3)",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },

};

function NavControls({ dateRange, onDateRangeChange, location, onLocationChange, user,
  factory, onFactoryChange, factories, factoriesLoading, onShare, onDownload, compact }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: compact ? "nowrap" : "wrap" }}>
      <span style={s.label}>Period</span>
      <RangePicker
        value={dateRange}
        onChange={onDateRangeChange}
        size="small"
        allowClear
        format="DD MMM YYYY"
        presets={PRESETS}
        style={{ width: compact ? 210 : 240 }}
        getPopupContainer={() => document.body}
      />

      <div style={s.divider} />

      {user?.isSystemAdmin? (
        <Select
          placeholder={<span style={{ display: "flex", alignItems: "center", gap: 4 }}><EnvironmentOutlined /> Location</span>}
          options={LOCATION_OPTIONS}
          value={location ?? undefined}
          onChange={onLocationChange}
          allowClear ={user.isSystemAdmin} 
        style={{ width: 130 }}
        getPopupContainer={() => document.body}
      />):(
          <Input value={location} readOnly style={{ width: 130 }} />
      )}

      <Select
        placeholder={<span style={{ display: "flex", alignItems: "center", gap: 4 }}><BankOutlined /> Factory</span>}
        options={factories}
        value={factory ?? undefined}
        onChange={onFactoryChange}
        loading={factoriesLoading}
        allowClear ={user?.isSystemAdmin} 
        showSearch
        optionFilterProp="label"
        style={{ width: 150 }}
        getPopupContainer={() => document.body}
      />

      <div style={s.divider} />

      <button style={s.shareBtn} onClick={onShare}>
        <ShareAltOutlined style={{ fontSize: 12 }} /> Share
      </button>
      <button style={s.downloadBtn} onClick={onDownload}>
        <DownloadOutlined style={{ fontSize: 12 }} /> Download
      </button>
    </div>
  );
}

function activeCount(dateRange, location, factory) {
  let n = 0;
  if (dateRange?.length === 2) n++;
  if (location) n++;
  if (factory)  n++;
  return n;
}

function FloatingPill({ vehicleNumber, dateRange, onDateRangeChange, location, onLocationChange,
  factory, onFactoryChange, factories, factoriesLoading, onShare, onDownload }) {
  const [open, setOpen] = useState(false);
  const count = activeCount(dateRange, location, factory);

  const popoverContent = (
    <div className="db-nav db-nav-popover" style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 540 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.muted, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
        <ArrowLeftOutlined style={{ cursor: "pointer", fontSize: 11 }} onClick={() => window.history.back()} />
        <span style={{ fontWeight: 600 }}>VEMS</span>
        <span style={{ color: C.slate }}>»</span>
        <span style={{ fontWeight: 700, color: C.text }}>{vehicleNumber}</span>
      </div>
      <NavControls
        dateRange={dateRange} onDateRangeChange={onDateRangeChange}
        location={location} onLocationChange={onLocationChange}
        factory={factory} onFactoryChange={onFactoryChange}
        factories={factories} factoriesLoading={factoriesLoading}
        onShare={() => { onShare?.(); setOpen(false); }}
        onDownload={() => { onDownload?.(); setOpen(false); }}
        compact
      />
    </div>
  );

  return createPortal(
    <Popover
      content={popoverContent}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      overlayClassName="db-nav-popover"
      getPopupContainer={() => document.body}
    >
      <button
        className="db-float-pill"
        style={{
          position: "fixed",
          top: 14,
          right: 280,
          zIndex: 1100,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 14px",
          height: 32,
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
          border: `1.5px solid ${C.teal}`,
          borderRadius: 20,
          background: open ? C.teal : "#fff",
          color: open ? "#fff" : C.teal,
          cursor: "pointer",
          boxShadow: open
            ? "0 4px 16px rgba(13,148,136,0.35)"
            : "0 2px 10px rgba(13,148,136,0.18)",
          transition: "all 0.18s ease",
        }}
      >
        <FilterOutlined style={{ fontSize: 12 }} />
        <CalendarOutlined style={{ fontSize: 12 }} />
        <span>Filters</span>
        {count > 0 && (
          <span style={{
            background: open ? "rgba(255,255,255,0.3)" : C.teal,
            color: "#fff",
            borderRadius: 10,
            padding: "0 6px",
            fontSize: 10,
            fontWeight: 800,
            minWidth: 18,
            textAlign: "center",
          }}>
            {count}
          </span>
        )}
      </button>
    </Popover>,
    document.body
  );
}

// ── Default values (exported so parent can use same defaults) ─────────────────
export const DEFAULT_DATE_RANGE = [dayjs().subtract(6, "day"), dayjs()];
export const DEFAULT_LOCATION   = "SUPA";

export default function AdminNavbar({
  vehicleNumber,
  refetchDashboard,
  onShare,
  onDownload,
}) {

  // const [factories, setFactories]               = useState([]);
  const [factoriesLoading, setFactoriesLoading] = useState(false);
  const [navbarHidden, setNavbarHidden]         = useState(false);
  const navbarRef = useRef(null);
  const { setDateRange, dateRange, setLocation, location, setFactory, factory, setFactories, factories,  onDateRangeChange, dashboardRefetch } = useDashboard();
  const user = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;

  useEffect(() => {
    setLocation(user?.isSystemAdmin ? DEFAULT_LOCATION : user?.location);
  }, [user, setLocation]);

  useEffect(() => {
    if (!dateRange) {
      setDateRange(DEFAULT_DATE_RANGE);
    }
  }, [dateRange, setDateRange]);

  useEffect(() => {
    if (dashboardRefetch) {
      dashboardRefetch();
    }
  }, [location, dateRange, factory]);

  


  useEffect(() => {
    const fetchFactories = async () => {
      setFactoriesLoading(true);

      try {
        const res = await api.get("/factories-by-location", { params: { location },});
        const list = res.data?.factories ?? [];
        const mapped = list.map((f) => ({
          value: String(f._id ?? f.id),
          label: f.name ?? f.factoryName ?? String(f._id),
        }));

        setFactories(mapped);
        if (!factory && mapped.length > 0) {
          const selected =
            mapped.find(f => f.value === user?.factory?._id)?.value ||
            mapped[0].value;

          setFactory(selected);
        }
      } catch (error) {
        console.error("Error fetching factories:", error);
      } finally {
        setFactoriesLoading(false);
      }
    };

    if (location) {
      fetchFactories();
    }
  }, [location]);



  useEffect(() => {
    const el = navbarRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setNavbarHidden(!entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const sharedProps = {
  user,
  dateRange,        onDateRangeChange: (val) => setDateRange(val),
  location,         onLocationChange: (val) => setLocation(val),
  factory,          onFactoryChange: (val) => setFactory(val),
  factories,        factoriesLoading,
  onShare,          onDownload,
  vehicleNumber,
};

  return (
    <>
      <div ref={navbarRef} className="db-nav" style={s.topBar}>
        <div style={s.left}>
          
          <span style={{ fontWeight: 600 }}>VEMS</span>
          <span style={{ color: C.slate }}>»</span>
          <span style={{ fontWeight: 700, color: C.text }}>{vehicleNumber}</span>
        </div>
        <NavControls {...sharedProps} />
      </div>

      {navbarHidden && (
        <FloatingPill vehicleNumber={vehicleNumber} {...sharedProps} />
      )}
    </>
  );
}