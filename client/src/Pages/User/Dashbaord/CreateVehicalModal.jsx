import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import api from "../../../../services/API/Api/api";
import {
  Modal, Form, Input, Select, AutoComplete, Switch,
  Button, Tag, Alert, DatePicker, Row, Col, Space,
  Typography, message,
} from "antd";
import {
  BankOutlined, CarOutlined, UserOutlined, FileTextOutlined,
  SearchOutlined, LoadingOutlined, SaveOutlined, SwapOutlined,
  EnvironmentOutlined, CheckCircleFilled, TruckOutlined, EnvironmentFilled , DownOutlined, UpOutlined 
} from "@ant-design/icons";
import dayjs from "dayjs";
import getDeviceInfo from "../../../utils/Get-DeviceInfo/getDeviceInfo.js";
import { useUser } from "../../../Global/User-Context/UserContext.jsx";
import PucExpiredModal from "../components/PUC-Expiry-Alert/PucExpiredModal.jsx";

const { Text, Title } = Typography;

// ─── Document & Vehicle Format Rules ─────────────────────────────────────────
const ID_FORMAT = {
  Aadhar: {
    hint: "Aadhaar 12-digit number e.g. 2345 6789 0123",
    placeholder: "2345 6789 0123",
    maxRaw: 12,
    clean: (v) => v.replace(/\D/g, "").slice(0, 12),
    validate: (v) => (/^\d{12}$/.test(v) ? null : "Aadhaar must be exactly 12 digits"),
  },
  PAN: {
    hint: "PAN format 5 letters + 4 digits + 1 letter e.g. ABCDE1234F",
    placeholder: "ABCDE1234F",
    maxRaw: 10,
    clean: (v) => v.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 10),
    validate: (v) =>
      /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v) ? null : "PAN format: 5 letters + 4 digits + 1 letter e.g. ABCDE1234F",
  },
  DL: {
    hint: "DL formats e.g. MH-12-2019-1234567",
    placeholder: "AB-XX-XXXX-XXXXXXX",
    maxRaw: 16,
    clean: (raw) => {
      const c = raw.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 16);
      if (/^[A-Z]{2}\d{2}/.test(c)) {
        if (c.length <= 2) return c;
        if (c.length <= 4) return `${c.slice(0, 2)}-${c.slice(2)}`;
        if (c.length <= 8) return `${c.slice(0, 2)}-${c.slice(2, 4)}-${c.slice(4)}`;
        return `${c.slice(0, 2)}-${c.slice(2, 4)}-${c.slice(4, 8)}-${c.slice(8)}`;
      }
      return c;
    },
    validate: (v) => {
      const raw = v.replace(/-/g, "");
      const pattern = /^[A-Z]{2}\d{2}[A-Z0-9]{3,5}\d{6,9}$/;
      return pattern.test(raw) ? null : "Invalid DL format";
    },
  },
};

const VEH_REGEX = /^[A-Z]{2}\d{1,2}(?:[A-Z]{1,3})?\d{4}$/;
function cleanVehicleNumber(raw) { return raw.replace(/[-\s]/g, "").toUpperCase().slice(0, 10); }
function displayVehicleNumber(raw) {
  const c = cleanVehicleNumber(raw);
  const m = c.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$/);
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : c;
}
function validateVehicleNumber(raw) {
  const c = cleanVehicleNumber(raw);
  return VEH_REGEX.test(c) ? null : "Format: SS NN LLL NNNN (e.g. RJ 14 AB 1234)";
}

// ─── LocalStorage Helpers ─────────────────────────────────────────────────────
const LS_INTERNAL = "veh_modal_internal_draft";
const LS_EXTERNAL = "veh_modal_external_draft";
const LS_TAB = "veh_modal_active_tab";

const CUSTOMER = [
  { v: "Abs Electroplaters", l: "Abs Electroplaters" }, { v: "Acerpure India Pvt Ltd", l: "Acerpure India Pvt Ltd" },
  { v: "Air Liquide", l: "Air Liquide" }, { v: "Amber Enterprises India Ltd", l: "Amber Enterprises India Ltd" },
  { v: "Amstrad Consumer India Pvt Ltd", l: "Amstrad Consumer India Pvt Ltd" }, { v: "Assiya Paint", l: "Assiya Paint" },
  { v: "Atul Plast Cr", l: "Atul Plast Cr" }, { v: "Atomberg Technologies Pvt Ltd", l: "Atomberg Technologies Pvt Ltd" },
  { v: "Avadhoot Paper", l: "Avadhoot Paper" }, { v: "Belrise Industries Ltd", l: "Belrise Industries Ltd" },
  { v: "Blue Star Ltd", l: "Blue Star Ltd" }, { v: "BPL Ltd", l: "BPL Ltd" },
  { v: "Carrier Airconditioning & Refrigeration Ltd", l: "Carrier Airconditioning & Refrigeration Ltd" },
  { v: "Carrier Midea India Pvt Ltd", l: "Carrier Midea India Pvt Ltd" }, { v: "Croma", l: "Croma" },
  { v: "Enpar Steels", l: "Enpar Steels" }, { v: "Flipkart Internet Pvt Ltd", l: "Flipkart Internet Pvt Ltd" },
  { v: "Godrej Enterprises Group", l: "Godrej Enterprises Group" }, { v: "Haier Appliances India Pvt Ltd", l: "Haier Appliances India Pvt Ltd" },
  { v: "Hamster Air Conditioner", l: "Hamster Air Conditioner" }, { v: "Havells India Ltd", l: "Havells India Ltd" },
  { v: "Hitachi", l: "Hitachi" }, { v: "Infiniti Retail Ltd", l: "Infiniti Retail Ltd" },
  { v: "Jabil Circuit India Pvt Ltd", l: "Jabil Circuit India Pvt Ltd" }, { v: "Jaydeep Industries", l: "Jaydeep Industries" },
  { v: "Kenstar", l: "Kenstar" }, { v: "Kinetic Green Energy And Power Solution Ltd", l: "Kinetic Green Energy And Power Solution Ltd" },
  { v: "Kosh Innovations Pvt Ltd", l: "Kosh Innovations Pvt Ltd" }, { v: "LG Electronics India Pvt Ltd", l: "LG Electronics India Pvt Ltd" },
  { v: "Machhar Packaging", l: "Machhar Packaging" }, { v: "Maniar Plast", l: "Maniar Plast" },
  { v: "Marq Solutions", l: "Marq Solutions" }, { v: "Md Graphics Pvt Ltd", l: "Md Graphics Pvt Ltd" },
  { v: "Microtask Engineering", l: "Microtask Engineering" }, { v: "Minda Vast Access Systems Pvt Ltd", l: "Minda Vast Access Systems Pvt Ltd" },
  { v: "Mirc Electronics Ltd", l: "Mirc Electronics Ltd" }, { v: "Motorola Mobility India Pvt Ltd", l: "Motorola Mobility India Pvt Ltd" },
  { v: "Navin Fluorine International Ltd", l: "Navin Fluorine International Ltd" }, { v: "Nidec India Ltd", l: "Nidec India Ltd" },
  { v: "Onida", l: "Onida" }, { v: "Pankaj Plastics Product", l: "Pankaj Plastics Product" },
  { v: "Pacoline Industries Pvt Ltd", l: "Pacoline Industries Pvt Ltd" }, { v: "Paramount Polymers Pvt Ltd", l: "Paramount Polymers Pvt Ltd" },
  { v: "PG Electroplast", l: "PG Electroplast" }, { v: "PG Technoplast", l: "PG Technoplast" },
  { v: "Poonam Petrochem", l: "Poonam Petrochem" }, { v: "Posco India Pune Processing Center Pvt Ltd", l: "Posco India Pune Processing Center Pvt Ltd" },
  { v: "Pravin Engineering Works", l: "Pravin Engineering Works" }, { v: "Procyon Star Pvt Ltd", l: "Procyon Star Pvt Ltd" },
  { v: "Qualis Engineers", l: "Qualis Engineers" }, { v: "Ravago Shah Polymers", l: "Ravago Shah Polymers" },
  { v: "Realme Mobile Telecommunications India Pvt Ltd", l: "Realme Mobile Telecommunications India Pvt Ltd" },
  { v: "Reliance Retail Ltd", l: "Reliance Retail Ltd" }, { v: "Renu Electronics Pvt Ltd", l: "Renu Electronics Pvt Ltd" },
  { v: "Royalux Lighting Pvt Ltd", l: "Royalux Lighting Pvt Ltd" }, { v: "Sadguru Industries", l: "Sadguru Industries" },
  { v: "Samarth Enterprises", l: "Samarth Enterprises" }, { v: "Sharp Business Systems India Pvt Ltd", l: "Sharp Business Systems India Pvt Ltd" },
  { v: "Shree Enterprises", l: "Shree Enterprises" }, { v: "Shree Swaraj Mold", l: "Shree Swaraj Mold" },
  { v: "Shreenath Plastic", l: "Shreenath Plastic" }, { v: "SP Industries", l: "SP Industries" },
  { v: "SRF Limited", l: "SRF Limited" }, { v: "Starion India Pvt Ltd", l: "Starion India Pvt Ltd" },
  { v: "Styrenix Performance Materials Ltd", l: "Styrenix Performance Materials Ltd" }, { v: "Sudarshan Polyblends Pvt Ltd", l: "Sudarshan Polyblends Pvt Ltd" },
  { v: "Sunshine Technoplast", l: "Sunshine Technoplast" }, { v: "Supreme", l: "Supreme" },
  { v: "Syrma SGS Technology Ltd", l: "Syrma SGS Technology Ltd" }, { v: "TCL", l: "TCL" },
  { v: "Trinity Material Handling Solutions", l: "Trinity Material Handling Solutions" }, { v: "Tri Gases Pvt Ltd", l: "Tri Gases Pvt Ltd" },
  { v: "Tushar Engineering", l: "Tushar Engineering" }, { v: "UKB Electronics Ltd", l: "UKB Electronics Ltd" },
  { v: "VBROS Auto Pvt Ltd", l: "VBROS Auto Pvt Ltd" }, { v: "Victor Pushin Cords", l: "Victor Pushin Cords" },
  { v: "Voltas Ltd", l: "Voltas Ltd" }, { v: "Voltbek Home Appliances Pvt Ltd", l: "Voltbek Home Appliances Pvt Ltd" },
  { v: "Whirlpool Of India Ltd", l: "Whirlpool Of India Ltd" }, { v: "Yash Engineering", l: "Yash Engineering" },
  { v: "Yashoda Industries", l: "Yashoda Industries" }, { v: "Others", l: "Others" },
];

const SUPPLIERS = [
  { v: "PGTI : PG Technoplast", l: "PGTI : PG Technoplast" }, { v: "NGM : Next Generation Mfg", l: "NGM : Next Generation Mfg" },
  { v: "PGTI-2/Sanjeevani", l: "PGTI-2/Sanjeevani" }, { v: "PG4: PG Electroplast", l: "PG4: PG Electroplast" },
  { v: "TRIUMPH Warehouse", l: "TRIUMPH Warehouse" }, { v: "VIHAAN Warehouse", l: "VIHAAN Warehouse" },
  { v: "D111 Warehouse", l: "D111 Warehouse" }, { v: "Pg Bhiwadi", l: "Pg Bhiwadi" },
  { v: "STYROTECH INDUSTRIES", l: "STYROTECH INDUSTRIES" }, { v: "KSH DISTRIPARKS PVT.LTD", l: "KSH DISTRIPARKS PVT.LTD" },
  { v: "MD GRAPHICS PRIVATE LIMITED", l: "MD GRAPHICS PRIVATE LIMITED" }, { v: "Carrier Midea", l: "Carrier Midea" },
  { v: "AIR LIQUIDE INDIA HOLDING PVT.LTD", l: "AIR LIQUIDE INDIA HOLDING PVT.LTD" }, { v: "SAI AUTO COMPONENTS PVT.LTD", l: "SAI AUTO COMPONENTS PVT.LTD" },
  { v: "Hakimuddin", l: "Hakimuddin" }, { v: "Prijai cooltech", l: "Prijai cooltech" },
  { v: "V G ENGINEERING ENTERPRISES", l: "V G ENGINEERING ENTERPRISES" }, { v: "SUMITI PACKING", l: "SUMITI PACKING" },
  { v: "YEEMAK PVT LTD", l: "YEEMAK PVT LTD" }, { v: "ALIGN COMPONENTS PVT.LTD", l: "ALIGN COMPONENTS PVT.LTD" },
  { v: "VAIBHAV AMIT IND HP GAS AGENCY.", l: "VAIBHAV AMIT IND HP GAS AGENCY." }, { v: "SP INDUSTRIES", l: "SP INDUSTRIES" },
  { v: "MD Graphics", l: "MD Graphics" }, { v: "YASH ENGINEERING", l: "YASH ENGINEERING" },
  { v: "ATUL PLAST", l: "ATUL PLAST" }, { v: "Unipack Packaging Pvt Ltd", l: "Unipack Packaging Pvt Ltd" },
  { v: "Productive technologies", l: "Productive technologies" }, { v: "SAIDEEP POLYTHERM", l: "SAIDEEP POLYTHERM" },
  { v: "SULTAN ENTERPRISES", l: "SULTAN ENTERPRISES" }, { v: "SHAMBHURAV POLYPLAST", l: "SHAMBHURAV POLYPLAST" },
  { v: "MADAN ELECTRO", l: "MADAN ELECTRO" }, { v: "KV BOXCORP", l: "KV BOXCORP" },
  { v: "Suyog eng", l: "Suyog eng" }, { v: "AVADHOOT PAPER PRO", l: "AVADHOOT PAPER PRO" },
  { v: "SAMARTH", l: "SAMARTH" }, { v: "ELIN ELECTRONIC", l: "ELIN ELECTRONIC" },
  { v: "SHREENATH PLASTIC", l: "SHREENATH PLASTIC" }, { v: "Macdermid alpha", l: "Macdermid alpha" },
  { v: "SHRI JI FOAM", l: "SHRI JI FOAM" }, { v: "Metacool", l: "Metacool" },
  { v: "OM SANTOSHI", l: "OM SANTOSHI" }, { v: "M/S. S.B", l: "M/S. S.B" },
  { v: "CRAFTED SOLUTION", l: "CRAFTED SOLUTION" }, { v: "SKM GALVA", l: "SKM GALVA" },
  { v: "Axalta coating", l: "Axalta coating" }, { v: "M/s S.B. PRECISON SPRINGS - 2025-26", l: "M/s S.B. PRECISON SPRINGS - 2025-26" },
  { v: "METCAP TUB PVT. LTD.", l: "METCAP TUB PVT. LTD." }, { v: "Royal polymer", l: "Royal polymer" },
  { v: "ANUSHKA INDUS", l: "ANUSHKA INDUS" }, { v: "OIENTECH INDIA PVT.LTD.", l: "OIENTECH INDIA PVT.LTD." },
  { v: "Nahata plastikos llp", l: "Nahata plastikos llp" }, { v: "KINGFA", l: "KINGFA" },
  { v: "Nidec INDIA", l: "Nidec INDIA" }, { v: "Steel Suppliers Ltd", l: "Steel Suppliers Ltd" },
  { v: "Plastic Materials Co", l: "Plastic Materials Co" }, { v: "Empire Fastner", l: "Empire Fastner" },
  { v: "Asian Paint", l: "Asian Paint" }, { v: "SHREE ENTERPRISES", l: "SHREE ENTERPRISES" },
  { v: "MACHHAR PACKAGING", l: "MACHHAR PACKAGING" }, { v: "PRAVIN ENGINEERING WORKS", l: "PRAVIN ENGINEERING WORKS" },
  { v: "ATUL PLAST-CR", l: "ATUL PLAST-CR" }, { v: "SPF LIMITED", l: "SPF LIMITED" },
  { v: "SUPREME PETROCHEM LTD", l: "SUPREME PETROCHEM LTD" }, { v: "FRIENDS AND COMPANY UNIT-2", l: "FRIENDS AND COMPANY UNIT-2" },
  { v: "VINDHYAWASNI INDUSTRIES", l: "VINDHYAWASNI INDUSTRIES" }, { v: "TUSHAR ENG.", l: "TUSHAR ENG." },
  { v: "SHARDA INDUSTRIES", l: "SHARDA INDUSTRIES" }, { v: "BHARGAVI ENTERPRISES", l: "BHARGAVI ENTERPRISES" },
  { v: "SAMARTH SERVICES", l: "SAMARTH SERVICES" }, { v: "MAULI POLYMER", l: "MAULI POLYMER" },
  { v: "FORTUNE ENTERPRISES", l: "FORTUNE ENTERPRISES" }, { v: "ANUP PRINTERS PVT LTD", l: "ANUP PRINTERS PVT LTD" },
];

const lsGet = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    return { ...fallback, ...JSON.parse(v) };
  } catch { return fallback; }
};
const lsSet = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };
const lsDel = (...keys) => keys.forEach((k) => { try { localStorage.removeItem(k); } catch {} });

// ─── Default Shapes ───────────────────────────────────────────────────────────
const DEFAULT_DRIVER = { driverName: "", driverContact: "", driverIdType: "Aadhar", driverIdNumber: "", licenseNumber: "" };
const DEFAULT_VEHICLE = { vehicleNumber: "", typeOfVehicle: "truck", transporterName: "", PUCExpiry: "" };
const DEFAULT_TRIP_COMMON = { purpose: "", materialType: "" };

const DEFAULT_TRIP_INTERNAL = {
  ...DEFAULT_TRIP_COMMON, destinationFactoryId: "", supplier: "", material: "", quantity: "",
  invoiceNo: "", invoiceAmount: "", customer: "", passType: "Incoming",
  isIntraPlant: false, siteId: "", blockId: "",
};

const DEFAULT_TRIP_EXTERNAL = {
  ...DEFAULT_TRIP_COMMON, supplier: "", material: "", quantity: "", invoiceNo: "",
  invoiceAmount: "", customer: "", isInternalShifting: false, destinationFactoryId: "",
  passType: "Incoming", source: "", isIntraPlant: false, siteId: "", blockId: "",
};

const DEFAULT_INTERNAL = { ...DEFAULT_DRIVER, ...DEFAULT_VEHICLE, ...DEFAULT_TRIP_INTERNAL };
const DEFAULT_EXTERNAL = { ...DEFAULT_DRIVER, ...DEFAULT_VEHICLE, ...DEFAULT_TRIP_EXTERNAL };

const ID_TYPES = [{ value: "Aadhar", label: "Aadhar" }, { value: "PAN", label: "PAN" }, { value: "DL", label: "Driving Licence" }];
const MATERIAL_TYPES = [
  { value: "RM", label: "RM – Raw Material" }, { value: "FG", label: "FG – Finished Goods" },
  { value: "Scrap", label: "Scrap" }, { value: "NewMachines", label: "New Machines" }, { value: "Others", label: "Others" },
];

const PURPOSE_OPTS = [{ value: "Pickup", label: "Pickup" }, { value: "Delivery", label: "Delivery" }];
const PASS_TYPE_OPTS = [{ value: "Incoming", label: "Incoming" }, { value: "Outgoing", label: "Outgoing" }];
const VEHICLE_TYPES = [
  { value: "truck", label: "Truck" }, { value: "car", label: "Car" }, { value: "bike", label: "Bike" }, { value: "byHand", label: "By Hand" },
  { value: "trackter", label: "Trackter" }, { value: "miniTruck", label: "Mini Truck" }, { value: "mixerTruck", label: "Mixer Truck" },
  { value: "autoRikshaw", label: "Auto Rikshaw" }, { value: "waterTanker", label: "Water Tanker" }, { value: "containerTruck", label: "Container Truck" },
];
const CUSTOMER_OPTS = CUSTOMER.map((c) => ({ value: c.v, label: c.l }));
const SUPPLIER_OPTS = SUPPLIERS.map((s) => ({ value: s.v, label: s.l }));
const ALL_SOURCE_OPTS = [...CUSTOMER, ...SUPPLIERS].sort((a, b) => a.l.localeCompare(b.l)).map((o) => ({ value: o.v, label: o.l }));

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// ─── Theme tokens ───────────────────────────────────────────────────────────────
const THEME = {
  internal: { grad: "linear-gradient(135deg,#6366f1 0%,#4f46e5 60%,#4338ca 100%)", soft: "linear-gradient(135deg,#eef2ff,#e0e7ff)", border: "#a5b4fc", text: "#4338ca", icon: "#6366f1", iconBg: "#ede9fe", boxShadow: "0 2px 10px rgba(99,102,241,.04)" },
  external: {
    grad: "linear-gradient(135deg,#10b981 0%,#059669 60%,#047857 100%)",
    soft: "linear-gradient(135deg,#ecfdf5,#d1fae5)",
    border: "#6ee7b7",
    text: "#065f46",
    icon: "#059669",
    iconBg: "#d1fae5"
  },
ok: { soft: "linear-gradient(135deg,#ecfdf5,#d1fae5)", border: "#6ee7b7", text: "#065f46", icon: "#10b981" },
};

// ─── Compact section card ──────────────────────────────────────────────────────
function Section({ icon, title, subtitle, theme, found, foundMsg, children }) {
  const t = found ? THEME.ok : theme;
  return (
    <>
    <style>{`

      .section-card:hover {
        // box-shadow: 0 8px 20px ${found ? "#059669" : "#4b5563"}33;
        outline: 1px solid ${found ? "#059669" : "#4b5563"}22;
      }
    `}</style>
    <div
      style={{
        // border: `1.25px solid rgba(0,1,5,.06)`,
        borderRadius: 12,
        marginBottom: 10,
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 4px 14px rgba(15,23,42,.08), 0 1px 3px rgba(15,23,42,.06)",
      }}
      className="section-card"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", background: t.soft }}>
        <div style={{ width: 28, height: 28, borderRadius: 9, flexShrink: 0, background: found ? "#6ee7b7" : t.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: found ? "#065f46" : t.icon, fontSize: 13 }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text strong style={{ fontSize: 12.5, color: found ? "#065f46" : "#1f2937" }}>{title}</Text>
          <div style={{ fontSize: 10, color: found ? "#059669" : "#6b7280", fontWeight: 500 }}>{found ? foundMsg : subtitle}</div>
        </div>
        {found && <Tag color="success" icon={<CheckCircleFilled />} style={{ borderRadius: 999, fontWeight: 700, fontSize: 10 }}>Auto-filled</Tag>}
      </div>
      <div style={{ padding: "10px 12px 2px" }}>{children}</div>
    </div>
    </>
  );
}

// ─── Sticky, big, pattern-recognizable mode switcher ───────────────────────────
function ModeSwitcher({ active, setActive, showExternal, hasDraft }) {
  const modes = [
    { key: "internal", label: "INTERNAL", sub: "Plant → Plant transfer", icon: <BankOutlined style={{ fontSize: 19 }} />, theme: THEME.internal },
    { key: "external", label: "EXTERNAL", sub: "Gate entry / check-in", icon: <TruckOutlined style={{ fontSize: 19 }} />, theme: THEME.external },
  ].filter((m) => m.key === "internal" || showExternal);

  if (modes.length === 1) {
    const m = modes[0];
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 13, background: m.theme.grad, marginBottom: 10, boxShadow: `0 6px 16px ${m.theme.border}66` }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,.22)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>{m.icon}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#fff", letterSpacing: 0.3 }}>{m.label} VEHICLE</div>
          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.85)", fontWeight: 500 }}>{m.sub}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
      {modes.map((m) => {
        const isActive = active === m.key;
        return (
          <button
            key={m.key}
            onClick={() => setActive(m.key)}
            style={{
              flex: 1, cursor: "pointer", border: "none", borderRadius: 13, padding: "9px 12px",
              display: "flex", alignItems: "center", gap: 10,
              background: isActive ? m.theme.grad : "#f3f4f6",
              boxShadow: isActive ? `0 2px 5px rgb(0, 0, 0, 0.1)` : "inset 0 0 0 1.25px #e5e7eb",
              transform: isActive ? "translateY(-1px)" : "none",
              transition: "all .22s cubic-bezier(.4,0,.2,1)", position: "relative",
            }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 11, flexShrink: 0, background: isActive ? "rgba(255,255,255,.22)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: isActive ? "#fff" : "#9ca3af", boxShadow: isActive ? "0 2px 6px rgba(0,0,0,.1)" : "0 1px 3px rgba(0,0,0,.06)" }}>
              {m.icon}
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 0.3, color: isActive ? "#fff" : "#6b7280" }}>{m.label}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: isActive ? "rgba(255,255,255,.85)" : "#9ca3af" }}>{m.sub}</div>
            </div>
            {hasDraft[m.key] && <span style={{ position: "absolute", top: 7, right: 9, width: 7, height: 7, borderRadius: "50%", background: isActive ? "#fff" : m.theme.icon, boxShadow: "0 0 0 2px rgba(255,255,255,.5)" }} />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CreateVehicleModal({ open, onClose, onRefresh, tripToEdit = null }) {
  const isEditMode = !!tripToEdit;
  const { user } = useUser();
  const isIsIntraPlant = user.factory?.isIntraMovementAllowed || false;
  
  const workLocation = user.workLocation;
  const showExternal = workLocation === "atGate";
  const canAutoLookup = true;
  const [pucModalOpen, setPucModalOpen] = useState(false);

  const [messageApi, contextHolder] = message.useMessage();
  const deviceInfo = getDeviceInfo();

  const [activeTab, setActiveTab] = useState(() => (workLocation === "atGate" ? lsGet(LS_TAB, "external") : lsGet(LS_TAB, "internal")));
  const [factories, setFactories] = useState([]);
  const [fetchingFactories, setFF] = useState(false);
  const [siteBlocks, setSiteBlocks] = useState([]);
  const [fetchingSites, setFS] = useState(false);
  const [internalForm, _setInternal] = useState(() => lsGet(LS_INTERNAL, DEFAULT_INTERNAL));
  const [externalForm, _setExternal] = useState(() => lsGet(LS_EXTERNAL, DEFAULT_EXTERNAL));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [hasDraft, setHasDraft] = useState({ internal: false, external: false });
  const [driverLookup, setDL] = useState({ loading: false, found: false, foundBy: null });
  const [vehicleLookup, setVL] = useState({ loading: false, found: false });
  const draftTimer = useRef(null);

  useEffect(() => { if (!showExternal && activeTab === "external") setActiveTab("internal"); }, [showExternal, activeTab]);
  

  const checkDraft = useCallback((intForm, extForm) => {
    const hasData = (form, defaults) =>
      Object.keys(defaults).some((k) => (typeof defaults[k] === "boolean" ? form[k] !== defaults[k] : form[k] && form[k] !== defaults[k]));
    setHasDraft({ internal: hasData(intForm, DEFAULT_INTERNAL), external: hasData(extForm, DEFAULT_EXTERNAL) });
  }, []);

  const flashDraft = () => {
    setDraftSaved(true);
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => setDraftSaved(false), 2000);
  };

  const setInternalForm = useCallback((updater) => {
    _setInternal((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (!isEditMode) { lsSet(LS_INTERNAL, next); flashDraft(); }
      checkDraft(next, lsGet(LS_EXTERNAL, DEFAULT_EXTERNAL));
      return next;
    });
  }, [checkDraft, isEditMode]);

  const setExternalForm = useCallback((updater) => {
    _setExternal((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (!isEditMode) { lsSet(LS_EXTERNAL, next); flashDraft(); }
      checkDraft(lsGet(LS_INTERNAL, DEFAULT_INTERNAL), next);
      return next;
    });
  }, [checkDraft, isEditMode]);

  useEffect(() => { lsSet(LS_TAB, activeTab); }, [activeTab]);

  useEffect(() => {
    if (!open) return;

    if (isEditMode && tripToEdit) {
      const trip = tripToEdit;
      const mat = trip.materials?.[0] || {};
      const drv = trip.driver || {};
      const veh = trip.vehicle || {};

      const prefilled = {
        driverName: drv.driverName || "", driverContact: drv.driverContact || "",
        driverIdType: drv.driverIdType || "Aadhar", driverIdNumber: drv.driverIdNumber || "",
        licenseNumber: drv.licenseNumber || "",
        vehicleNumber: veh.vehicleNumber || "", typeOfVehicle: veh.typeOfVehicle || "truck",
        transporterName: veh.transporterName || "", PUCExpiry: veh.PUCExpiry ? veh.PUCExpiry.split("T")[0] : "",
        purpose: trip.purpose || "", materialType: mat.name || "", material: mat.material || "",
        quantity: mat.quantity || "", invoiceNo: mat.invoiceNo || "", invoiceAmount: mat.invoiceAmount || "",
        customer: mat.customer || "", supplier: mat.supplier || "",
        destinationFactoryId: trip.destinationFactory?._id || trip.destinationFactoryId || "",
        source: trip.externalSource || "", isInternalShifting: trip.type === "internal_transfer",
        passType: "Incoming", seal: mat.seal || "sealed", unit: mat.unit || "",
        isIntraPlant: !!trip.isIntraPlant,
        siteId: trip.siteId?._id || trip.siteId || "",
        blockId: trip.blockId?._id || trip.blockId || "",
      };

      if (trip.type === "internal_transfer") { _setInternal({ ...DEFAULT_INTERNAL, ...prefilled }); setActiveTab("internal"); }
      else { _setExternal({ ...DEFAULT_EXTERNAL, ...prefilled }); setActiveTab("external"); }
      return;
    }

    const si = lsGet(LS_INTERNAL, DEFAULT_INTERNAL);
    const se = lsGet(LS_EXTERNAL, DEFAULT_EXTERNAL);
    _setInternal(si); _setExternal(se);
    setActiveTab(workLocation === "atGate" ? "external" : "internal");
    checkDraft(si, se);
  }, [open, isEditMode, tripToEdit, checkDraft]);

  useEffect(() => {
    if (!open) return;
    setFF(true);
    api.get("/factories")
      .then((res) => setFactories(res.data?.factories || res.data || []))
      .catch(() => messageApi.error("Could not load factories"))
      .finally(() => setFF(false));
  }, [open]);

  useEffect(() => {
    const fetchSites = async () => {
      if (!open) return;
      const factoryId = user?.factory?._id;
      if (!factoryId) return;
      try {
        setFS(true);
        const res = await api.get("/sites", { params: { factoryId } });
        setSiteBlocks(res.data?.data || res.data || []);
      } catch {
        messageApi.error("Could not load sites/blocks");
      } finally {
        setFS(false);
      }
    };
    fetchSites();
  }, [open]);


  const getLocationOptions = useCallback((purpose) => {
    const opts = [];

    // Normalize user's own site + block ids (handle populated or raw id)
    const userSiteId = user?.siteId?._id || user?.siteId || null;
    const userBlockId = user?.blockId?._id || user?.blockId || null;

    // Only consider sites that this user's factory actually allows —
    // prevents same-named sites from other factories leaking in as duplicates
    const factoryAllowedSiteIds = new Set(
      (user?.factory?.allowedSites || []).map((s) => s?._id || s)
    );

    const scopedSiteBlocks = siteBlocks.filter((site) =>
      factoryAllowedSiteIds.has(site._id)
    );

    scopedSiteBlocks.forEach((site) => {
      const siteName = site.name?.trim().toLowerCase();

      // Always exclude Security
      if (siteName === "security") return;

      const isUsersSite = userSiteId && site._id === userSiteId;

      (site.allowedBlocks || site.blocks || []).forEach((block) => {
        // Only exclude this specific block when it's the user's own site AND own block
        if (isUsersSite && userBlockId && block._id === userBlockId) return;

        opts.push({
          value: `${site._id}__${block._id}`,
          label: `${site.name} ${block.name}`,
        });
      });
    });

    return opts;
  }, [siteBlocks, user?.siteId, user?.blockId, user?.factory?.allowedSites]);

  const handleLocationChange = (onChange, val) => {
    const [siteId, blockId] = (val || "").split("__");
    onChange("siteId", siteId || "");
    onChange("blockId", blockId || "");
  };

  const lookupDriver = useCallback(
    debounce(async (value, field, currentTab) => {
      if (!canAutoLookup) return;
      if (field === "driverContact" && value.length < 10) return;
      if (field === "driverIdNumber" && value.length < 4) return;
      setDL({ loading: true, found: false, foundBy: null });
      try {
        const res = await api.get(`/lookup`, { params: { [field]: value } });
        const d = res.data?.driver || res.data;
        if (d) {
          const patch = { driverName: d.driverName || "", driverContact: d.driverContact || "", driverIdType: d.driverIdType || "Aadhar", driverIdNumber: d.driverIdNumber || "", licenseNumber: d.licenseNumber || "" };
          if (currentTab === "internal") setInternalForm((p) => ({ ...p, ...patch }));
          else setExternalForm((p) => ({ ...p, ...patch }));
          setDL({ loading: false, found: true, foundBy: field });
        } else setDL({ loading: false, found: false, foundBy: null });
      } catch { setDL({ loading: false, found: false, foundBy: null }); }
    }, 700),
    [setInternalForm, setExternalForm, canAutoLookup]
  );

  const lookupVehicle = useCallback(
    debounce(async (vehicleNumber, currentTab) => {
      if (!canAutoLookup) return;
      if (!vehicleNumber || vehicleNumber.length < 4) return;
      setVL({ loading: true, found: false });
      try {
        const res = await api.get(`/vehicles/number/${vehicleNumber}`);
        const v = res.data?.vehicle || res.data;
        if(v.PUCExpiry && new Date(v.PUCExpiry) < new Date()) {
          setPucModalOpen(true);
        }

        if (v) {
          const patch = { typeOfVehicle: v.typeOfVehicle || "truck", transporterName: v.transporterName || "", PUCExpiry: v.PUCExpiry ? v.PUCExpiry.split("T")[0] : "" };
          if (currentTab === "internal") setInternalForm((p) => ({ ...p, ...patch }));
          else setExternalForm((p) => ({ ...p, ...patch }));
          setVL({ loading: false, found: true });
        } else setVL({ loading: false, found: false });
      } catch { setVL({ loading: false, found: false }); }
    }, 700),
    [setInternalForm, setExternalForm, canAutoLookup]);

  const clearErr = (k) => setErrors((p) => ({ ...p, [k]: "" }));

  const setInternal = (k, v) => {
    setInternalForm((p) => ({ ...p, [k]: v }));
    if (k === "vehicleNumber") lookupVehicle(cleanVehicleNumber(v), "internal");
    if (k === "driverContact") lookupDriver(v, "driverContact", "internal");
    if (k === "driverIdNumber") lookupDriver(v, "driverIdNumber", "internal");
    clearErr(k);
  };

  const setExternal = (k, v) => {
    setExternalForm((p) => ({ ...p, [k]: v }));
    if (k === "vehicleNumber") lookupVehicle(cleanVehicleNumber(v), "external");
    if (k === "driverContact") lookupDriver(v, "driverContact", "external");
    if (k === "driverIdNumber") lookupDriver(v, "driverIdNumber", "external");
    clearErr(k);
  };

  const getFormatErrors = (form) => {
    const e = {};
    const vehErr = validateVehicleNumber(form.vehicleNumber);
    if (form.vehicleNumber && vehErr) e.vehicleNumber = vehErr;
    const rule = ID_FORMAT[form.driverIdType];
    if (rule && form.driverIdNumber) { const idErr = rule.validate(form.driverIdNumber); if (idErr) e.driverIdNumber = idErr; }
    if (form.licenseNumber) { const dlErr = ID_FORMAT.DL.validate(form.licenseNumber); if (dlErr) e.licenseNumber = dlErr; }
    return e;
  };

  const validateInternal = () => {
    const e = {};
    if (!internalForm.driverContact) e.driverContact = "Required";
    if (!internalForm.driverName) e.driverName = "Required";
    if (!internalForm.driverIdNumber) e.driverIdNumber = "Required";
    if (!internalForm.vehicleNumber) e.vehicleNumber = "Required";
    if (!internalForm.transporterName) e.transporterName = "Required";
    if (!internalForm.purpose) e.purpose = "Required";
    if (!internalForm.materialType) e.materialType = "Required";
    if (internalForm.isIntraPlant) {
      if (!internalForm.siteId || !internalForm.blockId) e.blockId = "Required";
    } else if (!internalForm.destinationFactoryId) e.destinationFactoryId = "Required";
    if (internalForm.purpose !== "Pickup" && internalForm.materialType === "FG" && !internalForm.customer) e.customer = "Required";
    const merged = { ...e, ...getFormatErrors(internalForm) };
    setErrors(merged);
    return !Object.keys(merged).length;
  };

  const validateExternal = () => {
    const e = {};
    if (!externalForm.driverContact) e.driverContact = "Required";
    if (!externalForm.driverName) e.driverName = "Required";
    if (!externalForm.driverIdNumber) e.driverIdNumber = "Required";
    if (!externalForm.vehicleNumber) e.vehicleNumber = "Required";
    if (!externalForm.typeOfVehicle) e.typeOfVehicle = "Required";
    if (!externalForm.transporterName) e.transporterName = "Required";
    if (!externalForm.purpose) e.purpose = "Required";
    if (!externalForm.materialType) e.materialType = "Required";
    if (!externalForm.source) e.source = "Required";
    if (externalForm.isIntraPlant) {
      if (!externalForm.siteId || !externalForm.blockId) e.blockId = "Required";
    }
    if (externalForm.isInternalShifting && !externalForm.supplier) e.supplier = "Required";
    if (externalForm.isInternalShifting && !externalForm.isIntraPlant && !externalForm.destinationFactoryId) e.destinationFactoryId = "Required";
    if (externalForm.purpose !== "Pickup") {
      if (externalForm.materialType === "RM" && !externalForm.supplier) e.supplier = "Required";
      if (["RM", "Scrap", "NewMachines", "Others"].includes(externalForm.materialType) && !externalForm.material) e.material = "Required";
      if (externalForm.materialType === "FG" && !externalForm.customer) e.customer = "Required";
    }
    const merged = { ...e, ...getFormatErrors(externalForm) };
    setErrors(merged);
    return !Object.keys(merged).length;
  };

  const handleSubmitInternal = async () => {
    if (!validateInternal()) return messageApi.error("Please fill all required fields.");
    setSubmitting(true);
    try {
      if (isEditMode) {
        await api.patch(`/trip/update/${tripToEdit._id}`, {
          ...internalForm, deviceDetails: deviceInfo,
          vehicleNumber: cleanVehicleNumber(internalForm.vehicleNumber),
          sourceFactoryId: user.factory?._id,
        });
        messageApi.success("Trip updated successfully");
      } else {
        await api.post("/new/internal-trip", {
          ...internalForm, vehicleNumber: cleanVehicleNumber(internalForm.vehicleNumber),
          sourceFactoryId: user.factory?._id,
          source: user.factory?.name || user.factory?._id || "",
          status: "inside_factory",
        });
        messageApi.success("Internal vehicle entry created");
      }
      setTimeout(() => { onRefresh(); handleClose(); }, 500);
    } catch (e) { messageApi.error(e.response?.data?.message || "Failed"); }
    finally { setSubmitting(false); }
  };

  const handleSubmitExternal = async () => {
    if (!validateExternal()) return messageApi.error("Please fill all required fields.");
    setSubmitting(true);
    try {
      if (isEditMode) {
        await api.patch(`/trip/update/${tripToEdit._id}`, {
          ...externalForm, deviceDetails: deviceInfo,
          vehicleNumber: cleanVehicleNumber(externalForm.vehicleNumber),
          sourceFactoryId: user.factory?._id,
        });
        messageApi.success("Trip updated successfully");
      } else {
        const response = await api.post("/new/external-trip", {
          ...externalForm, deviceDetails: deviceInfo,
          vehicleNumber: cleanVehicleNumber(externalForm.vehicleNumber),
          sourceFactoryId: user.factory?._id,
        });
        messageApi.success(response?.data?.message || "External Vehicle created.");
      }
      setTimeout(() => { onRefresh(); handleClose(); }, 500);
    } catch (e) { messageApi.error(String(e.response?.data?.message || "Failed")); }
    finally { setSubmitting(false); }
  };

  const handleClose = () => {
    onClose();
    _setInternal(DEFAULT_INTERNAL); lsSet(LS_INTERNAL, DEFAULT_INTERNAL);
    _setExternal(DEFAULT_EXTERNAL); lsSet(LS_EXTERNAL, DEFAULT_EXTERNAL);
    lsDel(LS_TAB);
    setErrors({}); setVL({ loading: false, found: false }); setDL({ loading: false, found: false, foundBy: null });
    setHasDraft({ internal: false, external: false });
  };

const [expandedLocation, setExpandedLocation] = useState(null);

const factoryOpts = useMemo(() => {
  const others = factories.filter((f) => f._id !== user.factory?._id);
  const grouped = others.reduce((acc, f) => {
    const loc = f.location || "Other";
    (acc[loc] ||= []).push(f);
    return acc;
  }, {});

  const userLocation = user.factory?.location;
  const otherLocations = Object.keys(grouped)
    .filter((loc) => loc !== userLocation)
    .sort((a, b) => a.localeCompare(b));

  const opts = [];

  // user's own location — always flat, always visible, always searchable
  if (userLocation && grouped[userLocation]) {
    opts.push({
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "#1677ff" }}>
          <EnvironmentFilled />
          {userLocation}
          <Tag color="blue" style={{ marginLeft: 4, lineHeight: "16px" }}>Your Location</Tag>
        </span>
      ),
      title: userLocation,
      options: grouped[userLocation]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((f) => ({ value: f._id, label: `${f.name} – ${f.location}` })),
    });
  }

  // other locations — collapsed by default, one open at a time
  otherLocations.forEach((loc) => {
    const isOpen = loc === expandedLocation;
    const count = grouped[loc].length;

    const headerRow = (
      <span
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
        onMouseDown={(e) => e.preventDefault()} // prevent select from stealing focus/closing on click
        onClick={(e) => {
          e.stopPropagation();
          setExpandedLocation(isOpen ? null : loc);
        }}
      >
        <span>{loc}{!isOpen && <span style={{ color: "#999", marginLeft: 6 }}>({count})</span>}</span>
        {isOpen ? <UpOutlined style={{ fontSize: 10 }} /> : <DownOutlined style={{ fontSize: 10 }} />}
      </span>
    );

    if (isOpen) {
      opts.push({
        label: headerRow,
        title: loc,
        options: grouped[loc]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((f) => ({ value: f._id, label: `${f.name} – ${f.location}` })),
      });
    } else {
      // single disabled leaf option — acts as a clickable, always-rendered header row
      opts.push({ value: `__collapsed_${loc}`, label: headerRow, disabled: true });
    }
  });

  return opts;
}, [factories, user.factory, expandedLocation]);


const renderFactorySelect = (form, onChange, key, label, options, required = false) => (
  <Form.Item
    layout="vertical"
    label={lbl(label, required)}
    validateStatus={errors[key] ? "error" : undefined}
    help={errors[key]}
    labelCol={{ span: 24 }}
    wrapperCol={{ span: 24 }}
    style={{ marginBottom: 11 }}
  >
    <Select
      value={form[key] || undefined}
      placeholder="Select…"
      options={options}
      showSearch
      filterOption={factoryFilterOption}
      style={{ width: "100%" }}
      className="veh-select"
        popupClassName="factory-select-dropdown" // antd v5; use dropdownClassName if on antd v4
      onChange={(val) => { onChange(key, val); clearErr(key); }}
    />
  </Form.Item>
);

// custom filter: skip collapsed headers, only match real factory rows,
// and only within own location / the currently expanded group (since
// collapsed groups' factories simply aren't in the options array)
const factoryFilterOption = (input, option) => {
  if (!input) return true;
  if (option?.disabled) return false;
  const text = typeof option.label === "string" ? option.label : "";
  return text.toLowerCase().includes(input.toLowerCase());
};
  // ── Field renderers (compact) ─────────────────────────────────────────────────
  const lookupSuffix = (key) => {
    const isDriverLookup = key === "driverContact" || key === "driverIdNumber";
    const isVehicleLookup = key === "vehicleNumber";
    if (!isDriverLookup && !isVehicleLookup) return null;
    const loading = (isDriverLookup && driverLookup.loading) || (isVehicleLookup && vehicleLookup.loading);
    return loading ? <LoadingOutlined spin style={{ color: THEME.internal.icon, fontSize: 12 }} /> : <SearchOutlined style={{ color: "#c0c4cc", fontSize: 12 }} />;
  };

  const fieldStyle = { borderRadius: 8, height: 34, fontSize: 13 };
  const lbl = (text, req) => <Text strong style={{ fontSize: 11.5, color: "#4b5563" }}>{text}{req && <span style={{ color: "#ef4444" }}> *</span>}</Text>;

 const renderTextField = (form, onChange, key, label, { required, type = "text", maxLen, placeholder, addonBefore, idType } = {}) => {
  let status = errors[key] ? "error" : undefined;
  let help = errors[key];

  if (!help && key === "vehicleNumber" && form.vehicleNumber.length >= 8) {
    const err = validateVehicleNumber(form.vehicleNumber);
    if (!err) { status = "success"; help = `✓ ${displayVehicleNumber(form.vehicleNumber)}`; }
  }
  if (!help && key === "driverIdNumber" && idType && form.driverIdNumber) {
    const rule = ID_FORMAT[idType];
    if (rule && !rule.validate(form.driverIdNumber)) { status = "success"; help = `✓ Format Valid for ${idType}`; }
  }
  if (!help && key === "licenseNumber" && form.licenseNumber) {
    if (!ID_FORMAT.DL.validate(form.licenseNumber)) { status = "success"; help = "✓ Format Valid for DL"; }
  }

  // Render success help text in green explicitly — antd doesn't color it by default
  const helpNode = status === "success" && help
    ? <span style={{ color: "#52c41a" }}>{help}</span>
    : help;

  const handleChange = (e) => {
    let val = e.target.value;
    if (key === "driverContact") val = val.replace(/\D/g, "").slice(0, 10);
    else if (key === "vehicleNumber") val = val.replace(/[^A-Z0-9\s-]/gi, "").toUpperCase().slice(0, 13);
    else if (key === "driverIdNumber" && idType && ID_FORMAT[idType]) val = ID_FORMAT[idType].clean(val);
    else if (key === "licenseNumber") val = ID_FORMAT.DL.clean(val);
    else if (type === "text") val = val.toUpperCase();
    onChange(key, val);
  };

  return (
    <Form.Item
      layout="vertical"
      label={lbl(label, required)}
      validateStatus={status}
      help={helpNode}
      labelCol={{ span: 24 }}
      wrapperCol={{ span: 24 }}
      style={{ marginBottom: 11 }}
    >
      <Input
        value={form[key]}
        maxLength={maxLen}
        placeholder={placeholder}
        addonBefore={addonBefore}
        suffix={lookupSuffix(key)}
        onChange={handleChange}
        style={fieldStyle}
      />
    </Form.Item>
  );
 };

  const renderSelectField = (form, onChange, key, label, options, required = false) => (
    <Form.Item
      layout="vertical"
      label={lbl(label, required)}
      validateStatus={errors[key] ? "error" : undefined}
      help={errors[key]}
      labelCol={{ span: 24 }}
      wrapperCol={{ span: 24 }}
      style={{ marginBottom: 11 }}
    >
      <Select value={form[key] || undefined} placeholder="Select…" options={options} showSearch optionFilterProp="label" style={{ width: "100%" }} className="veh-select" onChange={(val) => { onChange(key, val); clearErr(key); }} />
    </Form.Item>
  );
  
  const driverHint = (idType) => ID_FORMAT[idType]?.hint;

  // ── Driver row: Phone (narrow) | Driver Name (wide) | ID Number (medium) ──────
  const renderDriverSection = (form, onChange) => (
    <>
      {driverHint(form.driverIdType) && <Alert type="info" showIcon message={driverHint(form.driverIdType)} style={{ marginBottom: 10, borderRadius: 8, fontSize: 11.5, padding: "4px 10px" }} />}
      <Row gutter={10}>
        <Col xs={24} sm={8}>{renderTextField(form, onChange, "driverContact", "Phone Number", { maxLen: 10, addonBefore: "+91", required: true, placeholder: "Enter phone number" })}</Col>
        <Col xs={24} sm={8}>{renderTextField(form, onChange, "driverName", "Driver Name", { required: true, placeholder: "Enter driver name" })}</Col>
        <Col xs={24} sm={8}>{renderTextField(form, onChange, "driverIdNumber", "ID Number", { idType: form.driverIdType, maxLen: ID_FORMAT[form.driverIdType]?.maxRaw, placeholder: ID_FORMAT[form.driverIdType]?.placeholder })}</Col>
      </Row>
      <Row gutter={10}>
        <Col xs={24} sm={12}>{renderSelectField(form, onChange, "driverIdType", "ID Type", ID_TYPES)}</Col>
        <Col xs={24} sm={12}>{renderTextField(form, onChange, "licenseNumber", "Licence No.", { maxLen: 19, placeholder: ID_FORMAT.DL.placeholder })}</Col>
      </Row>
      {!driverLookup.found && (form.driverContact.length === 10 || form.driverIdNumber.length >= 4) && (
        <Alert type="warning" showIcon message="Driver not found — new record will be created." style={{ borderRadius: 8, fontSize: 11.5, padding: "4px 10px" }} />
      )}
    </>
  );

  const renderVehicleSection = (form, onChange) => (
  <>
    <Row gutter={10}>
      <Col xs={24} sm={12}>{renderTextField(form, onChange, "vehicleNumber", "Vehicle Number", { required: true, maxLen: 13, placeholder: "MH 12 AB 1234" })}</Col>
      <Col xs={24} sm={12}>{renderSelectField(form, onChange, "typeOfVehicle", "Vehicle Type", VEHICLE_TYPES, true)}</Col>
    </Row>
    <Row gutter={10}>
      <Col xs={24} sm={12}>{renderTextField(form, onChange, "transporterName", "Transporter", { required: true, placeholder: "Enter transporter name" })}</Col>
      <Col xs={24} sm={12}>
        <Form.Item
          layout="vertical"
          label={<span>{lbl("PUC Expiry")} <span className="text-red-500 font-semibold tracking-wide" >{form.PUCExpiry ? new Date(form.PUCExpiry) < new Date() ? "(Expired ⚠)" : "Valid" : null}</span> </span>}
          labelCol={{ span: 24 }}
          wrapperCol={{ span: 24 }}
          style={{ marginBottom: 11 }}
        >
          <DatePicker
            style={{ width: "100%", ...fieldStyle }}
            value={form.PUCExpiry ? dayjs(form.PUCExpiry) : null}
            onChange={(_, dateString) => onChange("PUCExpiry", dateString || "")}
          />
        </Form.Item>
      </Col>
    </Row>
    {!vehicleLookup.found && form.vehicleNumber.length >= 4 && (
      <Alert type="warning" showIcon message="Vehicle not found — new record will be created." style={{ borderRadius: 8, fontSize: 11.5, padding: "4px 10px" }} />
    )}
  </>
);

  const renderMaterialDetails = (form, onChange, isPickup) => {
    if (isPickup || !form.materialType) return null;

    if (form.materialType === "RM") return (
      <>
        <Row gutter={10}>
          <Col xs={24} sm={8}>
            <Form.Item  layout="vertical" label={lbl("Supplier", true)} validateStatus={errors.supplier ? "error" : undefined} help={errors.supplier} style={{ marginBottom: 11 }}>
              <Select mode="tags" showSearch style={{ width: "100%" }} placeholder="Search or enter supplier" value={form.supplier ? [form.supplier] : []} onChange={(value) => onChange("supplier", value[0] || "")} options={SUPPLIER_OPTS} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>{renderTextField(form, onChange, "material", "Material Name", { required: true, placeholder: "Enter material name" })}</Col>
          <Col xs={24} sm={8}>{renderTextField(form, onChange, "quantity", "Quantity", { type: "number", placeholder: "Enter quantity" })}</Col>
        </Row>
        <Row gutter={10}>
          <Col xs={24} sm={12}>{renderTextField(form, onChange, "invoiceNo", "Invoice No.", { placeholder: "Enter invoice number" })}</Col>
          <Col xs={24} sm={12}>{renderTextField(form, onChange, "invoiceAmount", "Invoice Amount (₹)", { type: "number", placeholder: "Enter invoice amount" })}</Col>
        </Row>
      </>
    );

    if (form.materialType === "FG") return (
      <>
        <Row gutter={10}>
          <Col xs={24} sm={12}>{renderSelectField(form, onChange, "customer", "Customer", CUSTOMER_OPTS, true)}</Col>
          <Col xs={24} sm={12}>{renderTextField(form, onChange, "invoiceNo", "Invoice Number", { placeholder: "Enter invoice number" })}</Col>
        </Row>
        <Row gutter={10}>
          <Col xs={24} sm={12}>{renderTextField(form, onChange, "quantity", "Quantity", { type: "number", placeholder: "Enter quantity" })}</Col>
          <Col xs={24} sm={12}>{renderTextField(form, onChange, "invoiceAmount", "Invoice Amount (₹)", { type: "number", placeholder: "Enter invoice amount" })}</Col>
        </Row>
      </>
    );

    if (["Scrap", "NewMachines", "Others"].includes(form.materialType)) return (
      <Row gutter={10}>
        <Col xs={24} sm={12}>{renderTextField(form, onChange, "material", "Material / Description", { required: true, placeholder: "Enter material description" })}</Col>
        <Col xs={24} sm={12}>{renderTextField(form, onChange, "quantity", "Quantity", { type: "number", placeholder: "Enter quantity" })}</Col>
      </Row>
    );

    return null;
  };

  const renderIntraPlantBlock = (form, onChange) => (
    <>
      <div style={{ background: form.isIntraPlant ? THEME.internal.soft : "#f8fafc", border: `1.25px solid ${form.isIntraPlant ? THEME.internal.border : "#e5e7eb"}`, borderRadius: 11, padding: "8px 12px", marginBottom: form.isIntraPlant ? 8 : 11, display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all .2s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 9, background: form.isIntraPlant ? "#ede9fe" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
            <EnvironmentOutlined style={{ color: form.isIntraPlant ? THEME.internal.icon : "#9ca3af", fontSize: 13 }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 12, color: "#374151" }}>Active Intra Movement</div>
            <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 500 }}>Within-factory site / block</div>
          </div>
        </div>
        <Switch size="large" checked={form.isIntraPlant} checkedChildren="ON" unCheckedChildren="OFF"
          onChange={(checked) => {
            onChange("isIntraPlant", checked);
            if (checked) onChange("destinationFactoryId", "");
            else { onChange("siteId", ""); onChange("blockId", ""); }
          }}
        />
      </div>
        {form.isIntraPlant && (
          <Form.Item  layout="vertical" label={lbl(form.purpose === "Pickup" ? "Pickup Location" : "Drop Location", true)} validateStatus={errors.blockId ? "error" : undefined} help={errors.blockId || (!form.purpose && "Select a Purpose first")} style={{ marginBottom: 11 }}>
            <Select
              style={{ width: "100%" }} loading={fetchingSites} disabled={!form.purpose}
              placeholder={form.purpose === "Pickup" ? "Select dispatch block" : form.purpose === "Delivery" ? "Select store block" : "Select purpose first"}
              value={form.siteId && form.blockId ? `${form.siteId}__${form.blockId}` : undefined}
              options={getLocationOptions(form.purpose)} showSearch optionFilterProp="label"
              onChange={(val) => handleLocationChange(onChange, val)}
            />
          </Form.Item>
        )}
    </>
  );

  const renderInternal = () => (
    <div>
      <div style={{ background: THEME.internal.soft, boxShadow: `0 2px 4px rgba(0, 0, 0, 0.1)`, borderRadius: 10, padding: "6px 12px", marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}>
        <BankOutlined style={{ color: THEME.internal.icon, fontSize: 14 }} />
        <Text style={{ fontSize: 11.5, color: THEME.internal.text, fontWeight: 600 }}>
          Source: <strong>{user.factory?.name || "Your Factory"}</strong>
        </Text>
        <Tag color="purple" style={{ marginLeft: "auto", borderRadius: 999, fontSize: 10 }}>Inside factory</Tag>
      </div>

      <Section icon={<UserOutlined style={{ fontSize: 18 }} />} title="Driver Details" subtitle="Lookup by phone or ID or enter manually" theme={THEME.internal}
        found={driverLookup.found} foundMsg={`Driver found via ${driverLookup.foundBy === "driverContact" ? "phone" : "ID"} — auto-filled`}>
        {renderDriverSection(internalForm, setInternal)}
      </Section>

      <Section icon={<CarOutlined style={{ fontSize: 18 }} />} title="Vehicle Details" subtitle="Lookup by vehicle number or enter manually" theme={THEME.internal}
        found={vehicleLookup.found} foundMsg="Vehicle found — auto-filled">
        {renderVehicleSection(internalForm, setInternal)}
      </Section>

      <Section icon={<FileTextOutlined style={{ fontSize: 18 }} />} title="Trip Details" subtitle="Destination, purpose and material info" theme={THEME.internal} found={false}>
        <Row gutter={10}>
          {!internalForm.isIntraPlant && (
            <Col xs={24} sm={8}>
              {renderFactorySelect(internalForm, setInternal, "destinationFactoryId", "Destination Factory", fetchingFactories ? [] : factoryOpts, true)}
            </Col>
          )}
          <Col xs={24} sm={internalForm.isIntraPlant ? 12 : 8}>{renderSelectField(internalForm, setInternal, "purpose", "Purpose", PURPOSE_OPTS, true)}</Col>
          <Col xs={24} sm={internalForm.isIntraPlant ? 12 : 8}>{renderSelectField(internalForm, setInternal, "materialType", "Material Type", MATERIAL_TYPES, true)}</Col>
        </Row>
        { isIsIntraPlant && workLocation !== "atGate" && renderIntraPlantBlock(internalForm, setInternal) }
        {renderMaterialDetails(internalForm, setInternal, internalForm.purpose === "Pickup")}
      </Section>
    </div>
  );

  const renderExternal = () => (
    <div>
      <Alert type="warning" showIcon message="External vehicles await gate check-in. Material type reveals extra fields." style={{ marginBottom: 10, borderRadius: 8, fontSize: 11.5, padding: "5px 10px", border:"none", boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }} />

      <Section icon={<UserOutlined style={{ fontSize: 18 }} />} title="Driver Details" subtitle="Lookup by phone or ID or enter manually" theme={THEME.external}
        found={driverLookup.found} foundMsg={`Driver found via ${driverLookup.foundBy === "driverContact" ? "phone" : "ID"} auto-filled`}>
        {renderDriverSection(externalForm, setExternal)}
      </Section>

      <Section icon={<CarOutlined style={{ fontSize: 18 }} />} title="Vehicle Details" subtitle="Lookup by vehicle number or enter manually" theme={THEME.external}
        found={vehicleLookup.found} foundMsg="Vehicle found — auto-filled">
        {renderVehicleSection(externalForm, setExternal)}
      </Section>

      <Section icon={<FileTextOutlined style={{ fontSize: 18 }} />} title="Trip Details" subtitle="Purpose, material, internal shifting & intra-plant config" theme={THEME.external} found={false}>

        {externalForm.isInternalShifting && !externalForm.isIntraPlant && (
          <Row gutter={10}>
            <Col xs={24} sm={12}>{renderSelectField(externalForm, setExternal, "passType", "Pass Type", PASS_TYPE_OPTS, true)}</Col>
            <Col xs={24} sm={12}>{renderSelectField(externalForm, setExternal, "destinationFactoryId", "Destination Factory", fetchingFactories ? [] : factoryOpts, true)}</Col>
          </Row>
        )}

        <Row gutter={10}>
          <Col xs={24} sm={8}>
            <Form.Item layout="vertical" label={lbl("Source Factory", true)} validateStatus={errors.source ? "error" : undefined} help={errors.source} style={{ marginBottom: 11 }}>
              <AutoComplete
                value={externalForm.source || ""} placeholder="Source Factory" options={ALL_SOURCE_OPTS} style={{ width: "100%" }}
                filterOption={(inputValue, option) => option.label.toLowerCase().includes(inputValue.toLowerCase())}
                onChange={(val) => setExternal("source", val)}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>{renderSelectField(externalForm, setExternal, "purpose", "Purpose", PURPOSE_OPTS, true)}</Col>
          <Col xs={24} sm={8}>{renderSelectField(externalForm, setExternal, "materialType", "Material Type", MATERIAL_TYPES, true)}</Col>
        </Row>

        {/* {renderIntraPlantBlock(externalForm, setExternal)} */}
        {renderMaterialDetails(externalForm, setExternal, externalForm.purpose === "Pickup")}
      </Section>
    </div>
  );

  const activeTheme = activeTab === "internal" ? THEME.internal : THEME.external;

  return (
    <>
      <style>{`
        .veh-vmodal .ant-modal-content { border-radius: 18px !important; overflow: hidden; padding:0 !important; box-shadow: 0 24px 60px rgba(15,23,42,.32) !important; }
        .veh-vmodal .ant-modal-body { padding: 0 !important; }
        .veh-vmodal .ant-modal-mask { backdrop-filter: blur(5px); background: rgba(15,23,42,.48) !important; }
        .veh-select .ant-select-selector { border-radius: 8px !important; min-height: 34px !important; align-items:center; font-size: 13px; }
        .ant-input, .ant-input-affix-wrapper, .ant-picker { border-radius: 8px !important; font-size: 13px !important; }
        .ant-input-affix-wrapper { padding-top:0 !important; padding-bottom:0 !important; }
        .ant-input-affix-wrapper > input.ant-input { height: 32px !important; }
        .ant-picker { height: 34px !important; }
        .ant-form-item-explain-error { font-size: 10.5px !important; font-weight: 600; }
        .veh-footer-btn { border-radius: 10px !important; height: 38px !important; font-weight: 700 !important; font-size: 13px !important; }
        .veh-sticky-switcher { position: sticky; top: -10px; z-index: 5; background: #fff; padding-top: 2px; }
      `}</style>
      <Modal
        open={open}
        onCancel={handleClose}
        width={820}
        centered
        className="veh-vmodal"
        closeIcon={<span style={{ color: "#fff", background: "gray", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", fontSize: 14 }}>✕</span>}
        title={null}
        footer={null}
        destroyOnClose
      >
        {/* Compact header */}
       <div style={{ background:"#e6e8e6", padding:"12px 20px", borderRadius:12, display:"flex", alignItems:"center", gap:10, boxShadow:"0 4px 14px rgba(15,23,42,.08), 0 1px 3px rgba(15,23,42,.06)", border:"1px solid rgba(0,0,0,.06)" }}>
          <div style={{ width:32, height:32, borderRadius:10, background:"#eef2ff", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <CarOutlined style={{ color:"#6366f1", fontSize:15 }} />
          </div>

          <div>
            <Title level={5} style={{ margin:0, color:"#111827", fontWeight:800, fontSize:14.5 }}>
              {isEditMode ? `Edit Trip — ${tripToEdit?.vehicle?.vehicleNumber || ""}` : "New Vehicle Entry"}
            </Title>
            <Text style={{ color:"#6b7280", fontSize:10.5 }}>Draft fields auto-saved locally</Text>
          </div>
        </div>

        {/* Scrollable body with sticky switcher */}
        <div style={{ padding: "10px 8px 4px", maxHeight: "70vh", overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 #f1f5f9" }}>
          {contextHolder}
          <div className="veh-sticky-switcher">
            <ModeSwitcher active={activeTab} setActive={setActiveTab} showExternal={showExternal} hasDraft={hasDraft} />
          </div>
          {activeTab === "internal" ? renderInternal() : showExternal && renderExternal()}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px 16px", borderTop: "1px solid #f1f5f9" }}>
          <Button className="veh-footer-btn" onClick={handleClose} disabled={submitting} style={{ background: "#f3f4f6", border: "none", color: "#374151" }}>
            Cancel
          </Button>
          <Button
            className="veh-footer-btn" type="primary" loading={submitting}
            onClick={activeTab === "internal" ? handleSubmitInternal : handleSubmitExternal}
            style={{ background: activeTheme.grad, border: "none", flex: 1, boxShadow: `0 6px 16px ${activeTheme.border}77` }}
          >
            {isEditMode ? "Update Entry" : activeTab === "internal" ? "Create Internal Entry" : "Create External Entry"}
          </Button>
          {draftSaved && <Tag icon={<SaveOutlined />} color="processing" style={{ borderRadius: 999, marginLeft: 2, fontSize: 11 }}>Saved</Tag>}
        </div>
      </Modal>


      <PucExpiredModal
        open={pucModalOpen}
        onClose={() => setPucModalOpen(false)}
        vehicleNumber={internalForm?.vehicleNumber?? externalForm?.vehicleNumber?? null}
        pucExpiryDate={internalForm?.pucExpiryDate ? fmtTime(internalForm.pucExpiryDate) : externalForm?.pucExpiryDate ? fmtTime(externalForm.pucExpiryDate) : null}
      />
    </>
  );
}