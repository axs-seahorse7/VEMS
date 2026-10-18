import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../../../../services/API/Api/api";
import { message, Popconfirm  } from "antd";
import ChangeRouteModal, {useChangeRouteModal} from "../../../components/Change-Route-Modal/ChangeRouteModal"; 
import {
  Modal as AntModal,
  Input,
  Select,
  Row,
  Col,
  Button,
  InputNumber,
  Form ,
  Spin,
  Tabs,
  Tag,
  Switch,
} from "antd";
import {WarningOutlined, } from "@ant-design/icons";
import CreateVehicleModal from "./CreateVehicalModal.jsx";
import { useQuery } from "@tanstack/react-query";
import {useUser} from "../../../Global/User-Context/UserContext.jsx";
import {Truck } from "lucide-react";

const { Option } = Select;

const CUSTOMER = [
  { v: "Abs Electroplaters", l: "Abs Electroplaters", type: "customer" },
  { v: "Acerpure India Pvt Ltd", l: "Acerpure India Pvt Ltd", type: "customer" },
  { v: "Air Liquide", l: "Air Liquide", type: "customer" },
  { v: "Amber Enterprises India Ltd", l: "Amber Enterprises India Ltd", type: "customer" },
  { v: "Amstrad Consumer India Pvt Ltd", l: "Amstrad Consumer India Pvt Ltd", type: "customer" },
  { v: "Assiya Paint", l: "Assiya Paint", type: "customer" },
  { v: "Atul Plast Cr", l: "Atul Plast Cr", type: "customer" },
  { v: "Atomberg Technologies Pvt Ltd", l: "Atomberg Technologies Pvt Ltd", type: "customer" },
  { v: "Avadhoot Paper", l: "Avadhoot Paper", type: "customer" },
  { v: "Belrise Industries Ltd", l: "Belrise Industries Ltd", type: "customer" },
  { v: "Blue Star Ltd", l: "Blue Star Ltd", type: "customer" },
  { v: "BPL Ltd", l: "BPL Ltd", type: "customer" },
  { v: "Carrier Airconditioning & Refrigeration Ltd", l: "Carrier Airconditioning & Refrigeration Ltd", type: "customer" },
  { v: "Carrier Midea India Pvt Ltd", l: "Carrier Midea India Pvt Ltd", type: "customer" },
  { v: "Croma", l: "Croma", type: "customer" },
  { v: "Enpar Steels", l: "Enpar Steels", type: "customer" },
  { v: "Flipkart Internet Pvt Ltd", l: "Flipkart Internet Pvt Ltd", type: "customer" },
  { v: "Godrej Enterprises Group", l: "Godrej Enterprises Group", type: "customer" },
  { v: "Haier Appliances India Pvt Ltd", l: "Haier Appliances India Pvt Ltd", type: "customer" },
  { v: "Hamster Air Conditioner", l: "Hamster Air Conditioner", type: "customer" },
  { v: "Havells India Ltd", l: "Havells India Ltd", type: "customer" },
  { v: "Hitachi", l: "Hitachi", type: "customer" },
  { v: "Infiniti Retail Ltd", l: "Infiniti Retail Ltd", type: "customer" },
  { v: "Jabil Circuit India Pvt Ltd", l: "Jabil Circuit India Pvt Ltd", type: "customer" },
  { v: "Jaydeep Industries", l: "Jaydeep Industries", type: "customer" },
  { v: "Kenstar", l: "Kenstar", type: "customer" },
  { v: "Kinetic Green Energy And Power Solution Ltd", l: "Kinetic Green Energy And Power Solution Ltd", type: "customer" },
  { v: "Kosh Innovations Pvt Ltd", l: "Kosh Innovations Pvt Ltd", type: "customer" },
  { v: "LG Electronics India Pvt Ltd", l: "LG Electronics India Pvt Ltd", type: "customer" },
  { v: "Machhar Packaging", l: "Machhar Packaging", type: "customer" },
  { v: "Maniar Plast", l: "Maniar Plast", type: "customer" },
  { v: "Marq Solutions", l: "Marq Solutions", type: "customer" },
  { v: "Md Graphics Pvt Ltd", l: "Md Graphics Pvt Ltd", type: "customer" },
  { v: "Microtask Engineering", l: "Microtask Engineering", type: "customer" },
  { v: "Minda Vast Access Systems Pvt Ltd", l: "Minda Vast Access Systems Pvt Ltd", type: "customer" },
  { v: "Mirc Electronics Ltd", l: "Mirc Electronics Ltd", type: "customer" },
  { v: "Motorola Mobility India Pvt Ltd", l: "Motorola Mobility India Pvt Ltd", type: "customer" },
  { v: "Navin Fluorine International Ltd", l: "Navin Fluorine International Ltd", type: "customer" },
  { v: "Nidec India Ltd", l: "Nidec India Ltd", type: "customer" },
  { v: "Onida", l: "Onida", type: "customer" },
  { v: "Pankaj Plastics Product", l: "Pankaj Plastics Product", type: "customer" },
  { v: "Pacoline Industries Pvt Ltd", l: "Pacoline Industries Pvt Ltd", type: "customer" },
  { v: "Paramount Polymers Pvt Ltd", l: "Paramount Polymers Pvt Ltd", type: "customer" },
  { v: "PG Electroplast", l: "PG Electroplast", type: "customer" },
  { v: "PG Technoplast", l: "PG Technoplast", type: "customer" },
  { v: "Poonam Petrochem", l: "Poonam Petrochem", type: "customer" },
  { v: "Posco India Pune Processing Center Pvt Ltd", l: "Posco India Pune Processing Center Pvt Ltd", type: "customer" },
  { v: "Pravin Engineering Works", l: "Pravin Engineering Works", type: "customer" },
  { v: "Procyon Star Pvt Ltd", l: "Procyon Star Pvt Ltd", type: "customer" },
  { v: "Qualis Engineers", l: "Qualis Engineers", type: "customer" },
  { v: "Ravago Shah Polymers", l: "Ravago Shah Polymers", type: "customer" },
  { v: "Realme Mobile Telecommunications India Pvt Ltd", l: "Realme Mobile Telecommunications India Pvt Ltd", type: "customer" },
  { v: "Reliance Retail Ltd", l: "Reliance Retail Ltd", type: "customer" },
  { v: "Renu Electronics Pvt Ltd", l: "Renu Electronics Pvt Ltd", type: "customer" },
  { v: "Royalux Lighting Pvt Ltd", l: "Royalux Lighting Pvt Ltd", type: "customer" },
  { v: "Sadguru Industries", l: "Sadguru Industries", type: "customer" },
  { v: "Samarth Enterprises", l: "Samarth Enterprises", type: "customer" },
  { v: "Sharp Business Systems India Pvt Ltd", l: "Sharp Business Systems India Pvt Ltd", type: "customer" },
  { v: "Shree Enterprises", l: "Shree Enterprises", type: "customer" },
  { v: "Shree Swaraj Mold", l: "Shree Swaraj Mold", type: "customer" },
  { v: "Shreenath Plastic", l: "Shreenath Plastic", type: "customer" },
  { v: "SP Industries", l: "SP Industries", type: "customer" },
  { v: "SRF Limited", l: "SRF Limited", type: "customer" },
  { v: "Starion India Pvt Ltd", l: "Starion India Pvt Ltd", type: "customer" },
  { v: "Styrenix Performance Materials Ltd", l: "Styrenix Performance Materials Ltd", type: "customer" },
  { v: "Sudarshan Polyblends Pvt Ltd", l: "Sudarshan Polyblends Pvt Ltd", type: "customer" },
  { v: "Sunshine Technoplast", l: "Sunshine Technoplast", type: "customer" },
  { v: "Supreme", l: "Supreme", type: "customer" },
  { v: "Syrma SGS Technology Ltd", l: "Syrma SGS Technology Ltd", type: "customer" },
  { v: "TCL", l: "TCL", type: "customer" },
  { v: "Trinity Material Handling Solutions", l: "Trinity Material Handling Solutions", type: "customer" },
  { v: "Tri Gases Pvt Ltd", l: "Tri Gases Pvt Ltd", type: "customer" },
  { v: "Tushar Engineering", l: "Tushar Engineering", type: "customer" },
  { v: "UKB Electronics Ltd", l: "UKB Electronics Ltd", type: "customer" },
  { v: "VBROS Auto Pvt Ltd", l: "VBROS Auto Pvt Ltd", type: "customer" },
  { v: "Victor Pushin Cords", l: "Victor Pushin Cords", type: "customer" },
  { v: "Voltas Ltd", l: "Voltas Ltd", type: "customer" },
  { v: "Voltbek Home Appliances Pvt Ltd", l: "Voltbek Home Appliances Pvt Ltd", type: "customer" },
  { v: "Whirlpool Of India Ltd", l: "Whirlpool Of India Ltd", type: "customer" },
  { v: "Yash Engineering", l: "Yash Engineering", type: "customer" },
  { v: "Yashoda Industries", l: "Yashoda Industries", type: "customer" },
  { v: "Others", l: "Others", type: "customer" }
];

const SUPPLIERS = [
  { v: "PGTI : PG Technoplast", l: "PGTI : PG Technoplast" },
  { v: "NGM : Next Generation Mfg", l: "NGM : Next Generation Mfg" },
  { v: "PGTI-2/Sanjeevani", l: "PGTI-2/Sanjeevani" },
  { v: "PG4: PG Electroplast", l: "PG4: PG Electroplast" },
  { v: "TRIUMPH Warehouse", l: "TRIUMPH Warehouse" },
  { v: "VIHAAN Warehouse", l: "VIHAAN Warehouse" },
  { v: "D111 Warehouse", l: "D111 Warehouse" },
  { v: "Pg Bhiwadi", l: "Pg Bhiwadi" },
  { v: "STYROTECH INDUSTRIES", l: "STYROTECH INDUSTRIES" },
  { v: "KSH DISTRIPARKS PVT.LTD", l: "KSH DISTRIPARKS PVT.LTD" },
  { v: "MD GRAPHICS PRIVATE LIMITED", l: "MD GRAPHICS PRIVATE LIMITED" },
  { v: "Carrier Midea", l: "Carrier Midea" },
  { v: "AIR LIQUIDE INDIA HOLDING PVT.LTD", l: "AIR LIQUIDE INDIA HOLDING PVT.LTD" },
  { v: "SAI AUTO COMPONENTS PVT.LTD", l: "SAI AUTO COMPONENTS PVT.LTD" },
  { v: "Hakimuddin", l: "Hakimuddin" },
  { v: "Prijai cooltech", l: "Prijai cooltech" },
  { v: "V G ENGINEERING ENTERPRISES", l: "V G ENGINEERING ENTERPRISES" },
  { v: "SUMITI PACKING", l: "SUMITI PACKING" },
  { v: "YEEMAK PVT LTD", l: "YEEMAK PVT LTD" },
  { v: "ALIGN COMPONENTS PVT.LTD", l: "ALIGN COMPONENTS PVT.LTD" },
  { v: "VAIBHAV AMIT IND HP GAS AGENCY.", l: "VAIBHAV AMIT IND HP GAS AGENCY." },
  { v: "SP INDUSTRIES", l: "SP INDUSTRIES" },
  { v: "MD Graphics", l: "MD Graphics" },
  { v: "YASH ENGINEERING", l: "YASH ENGINEERING" },
  { v: "ATUL PLAST", l: "ATUL PLAST" },
  { v: "Unipack Packaging Pvt Ltd", l: "Unipack Packaging Pvt Ltd" },
  { v: "Productive technologies", l: "Productive technologies" },
  { v: "SAIDEEP POLYTHERM", l: "SAIDEEP POLYTHERM" },
  { v: "SULTAN ENTERPRISES", l: "SULTAN ENTERPRISES" },
  { v: "SHAMBHURAV POLYPLAST", l: "SHAMBHURAV POLYPLAST" },
  { v: "MADAN ELECTRO", l: "MADAN ELECTRO" },
  { v: "KV BOXCORP", l: "KV BOXCORP" },
  { v: "Suyog eng", l: "Suyog eng" },
  { v: "AVADHOOT PAPER PRO", l: "AVADHOOT PAPER PRO" },
  { v: "SAMARTH", l: "SAMARTH" },
  { v: "ELIN ELECTRONIC", l: "ELIN ELECTRONIC" },
  { v: "SHREENATH PLASTIC", l: "SHREENATH PLASTIC" },
  { v: "Macdermid alpha", l: "Macdermid alpha" },
  { v: "SHRI JI FOAM", l: "SHRI JI FOAM" },
  { v: "Metacool", l: "Metacool" },
  { v: "OM SANTOSHI", l: "OM SANTOSHI" },
  { v: "M/S. S.B", l: "M/S. S.B" },
  { v: "CRAFTED SOLUTION", l: "CRAFTED SOLUTION" },
  { v: "SKM GALVA", l: "SKM GALVA" },
  { v: "Axalta coating", l: "Axalta coating" },
  { v: "M/s S.B. PRECISON SPRINGS - 2025-26", l: "M/s S.B. PRECISON SPRINGS - 2025-26" },
  { v: "METCAP TUB PVT. LTD.", l: "METCAP TUB PVT. LTD." },
  { v: "Royal polymer", l: "Royal polymer" },
  { v: "ANUSHKA INDUS", l: "ANUSHKA INDUS" },
  { v: "OIENTECH INDIA PVT.LTD.", l: "OIENTECH INDIA PVT.LTD." },
  { v: "Nahata plastikos llp", l: "Nahata plastikos llp" },
  { v: "KINGFA", l: "KINGFA" },
  { v: "Nidec INDIA", l: "Nidec INDIA" },
  { v: "Steel Suppliers Ltd", l: "Steel Suppliers Ltd" },
  { v: "Plastic Materials Co", l: "Plastic Materials Co" },
  { v: "Empire Fastner", l: "Empire Fastner" },
  { v: "Asian Paint", l: "Asian Paint" },
  { v: "SHREE ENTERPRISES", l: "SHREE ENTERPRISES" },
  { v: "MACHHAR PACKAGING", l: "MACHHAR PACKAGING" },
  { v: "PRAVIN ENGINEERING WORKS", l: "PRAVIN ENGINEERING WORKS" },
  { v: "ATUL PLAST-CR", l: "ATUL PLAST-CR" },
  { v: "SPF LIMITED", l: "SPF LIMITED" },
  { v: "SUPREME PETROCHEM LTD", l: "SUPREME PETROCHEM LTD" },
  { v: "FRIENDS AND COMPANY UNIT-2", l: "FRIENDS AND COMPANY UNIT-2" },
  { v: "VINDHYAWASNI INDUSTRIES", l: "VINDHYAWASNI INDUSTRIES" },
  { v: "TUSHAR ENG.", l: "TUSHAR ENG." },
  { v: "SHARDA INDUSTRIES", l: "SHARDA INDUSTRIES" },
  { v: "BHARGAVI ENTERPRISES", l: "BHARGAVI ENTERPRISES" },
  { v: "SAMARTH SERVICES", l: "SAMARTH SERVICES" },
  { v: "MAULI POLYMER", l: "MAULI POLYMER" },
  { v: "FORTUNE ENTERPRISES", l: "FORTUNE ENTERPRISES" },
  { v: "ANUP PRINTERS PVT LTD", l: "ANUP PRINTERS PVT LTD" },
];

const lsGet = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    const parsed = JSON.parse(v);
    return { ...fallback, ...parsed };
  } catch { return fallback; }
};
const lsSet = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };
const lsDel = (...keys) => keys.forEach(k => { try { localStorage.removeItem(k); } catch {} });

// ─── Default Shapes ───────────────────────────────────────────────────────────
const DEFAULT_DRIVER = {
  driverName: "", driverContact: "", driverIdType: "Aadhar",
  driverIdNumber: "", licenseNumber: "",
};

const DEFAULT_VEHICLE = {
  vehicleNumber: "", typeOfVehicle: "truck",
  transporterName: "", PUCExpiry: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isPUCExpired = (d) => new Date(d) < new Date();
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN") : "—";
const fmtTime = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
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
  if (location === "waiting_outside" ) return "waiting";
  if (location === "inside_factory") return "inside";
  if (location === "in_transit") return "enroute";
  return "unknown";
};

// ─── Stage / Type Metadata ────────────────────────────────────────────────────
const STAGE_META = {
  waiting: { label: "Waiting",  bg: "#fef9c3", color: "#92400e" },
  inside:  { label: "Inside",   bg: "#dcfce7", color: "#15803d" },
  enroute: { label: "En Route", bg: "#dbeafe", color: "#1d4ed8" },
  unknown: { label: "Unknown",  bg: "#f3f4f6", color: "#6b7280" },
};

const vehicleTypeLabel = {
  truck: "Truck", miniTruck: "Mini Truck", containerTruck: "Container Truck",
  mixerTruck: "Mixer Truck", waterTanker: "Water Tanker", tractor: "Tractor",
  car: "Car", bus: "Bus", ambulance: "Ambulance",
};

// ─── Trip History action → colour + icon ─────────────────────────────────────
// Handles both action string directly OR action object {type:...}
const ACTION_META = {
  begin:    { color: "#6366f1", icon: "ri-flag-line",             label: "Begin"    },
  created:  { color: "#6366f1", icon: "ri-add-circle-line",       label: "Created"  },
  checkin:  { color: "#2563eb", icon: "ri-login-box-line",        label: "Check-in" },
  checkout: { color: "#7c3aed", icon: "ri-logout-box-r-line",     label: "Checkout" },
  dispatched:{ color: "#f97316", icon: "ri-truck-line",             label: "Dispatched"},
  arrived:  { color: "#0891b2", icon: "ri-map-pin-2-line",        label: "Arrived"  },
  load:     { color: "#16a34a", icon: "ri-stack-line",            label: "Loaded"   },
  unload:   { color: "#d97706", icon: "ri-stack-overflow-line",   label: "Unloaded" },
  cancelled:{ color: "#dc2626", icon: "ri-close-circle-line",     label: "Cancelled"},
  cancel:   { color: "#dc2626", icon: "ri-close-circle-line",     label: "Cancelled"},
  complete: { color: "#059669", icon: "ri-checkbox-circle-line",  label: "Completed"},
  closed:   { color: "#059669", icon: "ri-checkbox-circle-line",  label: "Closed"},
  route_change: { color: "#f81033", icon: "ri-signpost-fill",     label: "Route Changed"},
  intra_plant_checkin: { color: "#09ab7a", icon: "ri-signpost-fill",     label: "Intra Movement Started"},
};

function resolveAction(entry) {
  const key = typeof entry.action === "string"? entry.action : entry.action?.type;
  return ACTION_META[key] || { color: "#9ca3af", icon: "ri-radio-button-line", label: key || entry.status || "Event" };
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  alert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  x:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
};

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, children, title, width = 700 }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: width, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 80px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 12px", borderBottom: "1px solid #f0f0f0" }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111" }}>{title}</h2>
          <button onClick={onClose} style={{ border: "none", background: "#f3f4f6", cursor: "pointer", borderRadius: 7, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "#374151" }}>
            <span style={{ width: 14, height: 14 }}>{Icon.x}</span>
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: "16px 20px 20px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function Badge({ stage }) {
  const s = STAGE_META[stage] || STAGE_META.unknown;
  return <span style={{ background: s.bg, color: s.color, fontSize: 10.5, fontWeight: 700, borderRadius: 5, padding: "2px 7px", letterSpacing: .3, whiteSpace: "nowrap" }}>{s.label}</span>;
}

function TypeBadge({ type }) {
  return (
    <Tag bordered style={{ fontWeight: 700, fontSize: 10.5, borderRadius: 5, color: "#374151", background: "#f3f4f6" }}>
      {vehicleTypeLabel[type] || type}
    </Tag>
  );
}

// ─── Horizontal Trip History Timeline ────────────────────────────────────────
function TripTimeline({ tripHistory, isIntraPlant }) {
  if (!Array.isArray(tripHistory) || tripHistory.length === 0) return null;

  const locationMap = {
      atGate: "Gate",
      storeSite: "Store",
      dispatchSite: "Dispatch",
    };

  return (
    <div style={{  marginTop: 14, borderTop: "1px solid #f0f0f0", paddingTop: 10,  }}>
      {/* Section heading */}
      <div style={{ fontSize: 10, fontWeight: 800, color: "#6366f1", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>
        Trip History
      </div>

      {/* Scrollable horizontal track */}
      <div style={{ overflowX: "auto", paddingBottom: 4, scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}>
        <div style={{ display: "flex", alignItems: "flex-start", minWidth: "max-content", gap: 0 }}>
          {tripHistory.map((entry, idx) => {
            const meta = resolveAction(entry);
            const isLast = idx === tripHistory.length - 1;
            const nextMeta = !isLast ? resolveAction(tripHistory[idx + 1]) : null;

            return (
              <div key={entry._id || idx} style={{ display: "flex", alignItems: "flex-start", position:"relative", paddingBottom:10 }}>
                {/* Step column */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 110,  }}>
                  {/* Dot */}
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: meta.color + "18", border: `2px solid ${meta.color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1 }}>
                    <i className={meta.icon} style={{ fontSize: 9.5, color: meta.color }} />
                  </div>
                  {/* Action label */}
                  <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, marginTop: 4, textAlign: "center", lineHeight: 1.2}}>
                    {meta.label} {locationMap[entry.actionLocation] ? ` ${ isIntraPlant ? `(${locationMap[entry.actionLocation].charAt(0)}, ${entry.actionDetails?.siteId ? entry?.actionDetails?.block?.name : "N/A"})` : `at (${locationMap[entry.actionLocation]})`}`: ""}
                  </span>
                  {/* Status */}
                  <span style={{ fontSize: 9, color: "black", marginTop: 2, textAlign: "center", lineHeight: 1.2, fontWeight: 500 }}>
                    {entry?.factory?.name || entry.location || "—"} ({entry?.factory?.location || "N/A"}) {entry?.action === "route_change" ?  `→ ${entry?.segment?.destinationFactory?.name?? entry?.segment?.externalDestination?? "N/A"} ${entry?.segment?.destinationFactory?.location?? ""} ` : ""}
                  </span>
                  {/* Timestamp */}
                  <span style={{ fontSize: 9, color: "blue", marginTop: 2, textAlign: "center", lineHeight: 1.3, letterSpacing: .2, fontWeight: 500 }}>
                    {fmtTime(entry.timestamp)}
                  </span>
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div style={{ position:"absolute", top:0, left:65, width: 90, height: 2, marginTop: 10, flexShrink: 0, background: `linear-gradient(90deg, ${meta.color}70, ${nextMeta.color}70)`, borderRadius: 2 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Cancel Reason Modal (add this component near the top of your file) ───────

function CancelTripModal({ open, onConfirm, onCancel, loading }) {
  const [form] = Form.useForm();
  const [showOther, setShowOther] = useState(false);

  const REASON_OPTIONS = [
    { label: "Seal Damaged", value: "Seal Damaged" },
    { label: "Wrong Entry", value: "Wrong Entry" },
    { label: "Wrong Destination", value: "Wrong Destination" },
    { label: "Missing Materials ", value: "Missing Materials" },
    { label: "Empty Vehicle", value: "Empty Vehicle" },
    { label: "Other Issue", value: "Other Issue" },
  ];

  const handleReasonChange = (value) => {
    setShowOther(value === "Other Issue");
    if (value !== "Other Issue") {
      form.setFieldValue("description", undefined);
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const finalReason =
        values.reasonType === "Other Issue"
          ? values.description
          : values.description
          ? `${values.reasonType} - ${values.description}`
          : values.reasonType;
      onConfirm(finalReason);
    } catch {}
  };

  const handleCancel = () => {
    form.resetFields();
    setShowOther(false);
    onCancel();
  };

  return (
    <AntModal
      open={open}
      onCancel={handleCancel}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Confirm Cancel"
      cancelText="Go Back"
      okButtonProps={{
        danger: true,
        style: { fontWeight: 600 },
      }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Cancel Trip</span>
        </div>
      }
      centered
      width={420}
      maskClosable={false}
    >
      <p style={{ color: "#6b7280", fontSize: 13, margin: "8px 0 16px" }}>
        Please select a reason for cancelling this trip. This will be recorded
        for audit purposes.
      </p>
      <Form form={form} layout="vertical">
        <Form.Item
          name="reasonType"
          label={<span style={{ fontWeight: 600, fontSize: 12 }}>Cancellation Reason</span>}
          rules={[{ required: true, message: "Please select a reason" }]}
        >
          <Select
            placeholder="Select a reason"
            options={REASON_OPTIONS}
            onChange={handleReasonChange}
            style={{ fontSize: 13 }}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label={
            <span style={{ fontWeight: 600, fontSize: 12 }}>
              {showOther ? "Describe the Reason" : "Additional Details (optional)"}
            </span>
          }
          rules={
            showOther
              ? [
                  { required: true, message: "Please describe the reason" },
                  { min: 10, message: "Reason must be at least 10 characters" },
                ]
              : []
          }
        >
          <Input.TextArea
            rows={3}
            placeholder={
              showOther
                ? "Please describe the issue in detail..."
                : "Add any extra details (optional)..."
            }
            maxLength={300}
            showCount
            style={{ borderRadius: 8, fontSize: 13 }}
          />
        </Form.Item>
      </Form>
    </AntModal>
  );
}

// ─── Workflow Actions ─────────────────────────────────────────────────────────
function WorkflowActions({ vehicle, factory, onAction, userFactoryId, userRole }) {
  const [loading, setLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  // const [isLoadMaterialAndNewTrip, setisLoadMaterialAndNewTrip] = useState(false);
  const {user} = useUser();
  const customers = [...CUSTOMER, ...SUPPLIERS]

  const DEFAULT_TRIP_INTERNAL = {
    materialType: null,
    material: "",
    quantity: "",
    invoiceNo: "",
    invoiceAmount: "",
    customer: "",
    shipmentCustomer: "",
    shipmentFactory: "",
    shipmentSiteId: "",
    shipmentBlockId: "",
  };

  const factories = factory.filter(f => f._id !== user?.factory?._id);  


  const [openLoadModal, setOpenLoadModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [tripInternal, setTripInternal] = useState(DEFAULT_TRIP_INTERNAL);
  const [shipmentType, setShipmentType] = useState("internal");
  const [isLoadAndComplete, setisLoadAndComplete] = useState(false);
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);

  const { modalProps, openChangeRouteModal } = useChangeRouteModal({
    onConfirmInternal: async (factory, trip) => {
    try {
      const res = await api.post(`/trip/change-route/${trip._id}`, {
      newDestinationFactoryId: factory._id,
      type: "internal",
      skipCheckin: modalProps.skipCheckin || false
      });

      onAction();
      message.success(res.data?.message || `Route changed to factory: ${factory.name}`);
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to change route");
    }
    },

    onConfirmExternal: async (customerName, trip) => {
    try {
      const res = await api.post(`/trip/change-route/${trip._id}`, {
      customer: customerName,
      type: "external"
      });
      onAction();
      message.success(res.data?.message || "Route changed successfully");
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to change route");
    }
    },

    onConfirmLoadMaterialAndNewTrip: async (trip, tripDetails) => {
      try {
        if (
          !tripDetails.material ||
          !tripDetails.materialType ||
          !tripDetails.quantity ||
          !tripDetails.invoiceNo ||
          !tripDetails.invoiceAmount
        ) {
          return message.error("Please fill all fields");
        }
        const res = await api.post(`/trip/load-material-and-newtrip/${trip._id}`, {
          ...withTripFactory,
          tripDetails: {
            material: tripDetails.material,
            materialType: tripDetails.materialType,
            quantity: tripDetails.quantity,
            invoiceNo: tripDetails.invoiceNo,
            invoiceAmount: tripDetails.invoiceAmount,
            customer: tripDetails.customer,
          },
        });
        onAction();
        message.success(res.data?.message || "Load completed successfully");
      } catch (err) {
        message.error(err.response?.data?.message || "Failed to complete load");
      }
    },

    onConfirmIntraPlant: async (site, block, trip) => {
      try {
        const res = await api.post(`/trip/change-route/${trip._id}`, {
          newSiteId: site._id,
          newBlockId: block?._id || null,
          type: "intraplant"
        });
        onAction();
        message.success(res.data?.message || `Route changed to site: ${site.name}`);
      } catch (err) {
        message.error(err.response?.data?.message || "Failed to change route");
      }
    },

  });

  // Aliases for readability
  const { location, phase, tripState, purpose, loadStatus, type } = vehicle;
  const trip = vehicle;
  const isIntraPlant = trip?.isIntraPlant || false;
  const sourceId = trip.sourceFactory?._id;
  const destId = trip.destinationFactory?._id;
  
  // const securityGateId = String(user?.securityGateId?._id);

  const isNotClosedOrCancelled = tripState !== "CLOSED" && tripState !== "CANCELLED";
  const isInsideFactory = location === "inside_factory";
  const isOutsideOrEnroute = location === "outside_factory" || location === "enroute";

  // ─── Action Runner ───────────────────────────────────────────────────────────
  const doAction = async (apiFn) => {
    setLoading(true);
    try {
      const result = await apiFn();
      message.success(result.data?.message || "Action successful");
      onAction();
    } catch (e) {
      message.error(e.response?.data?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  // ─── Shared Payloads ─────────────────────────────────────────────────────────
  const vehiclePayload = { vehicleNumber: vehicle.vehicle?.vehicleNumber };
  const withFactory = { ...vehiclePayload, factoryId: userFactoryId };

  const withSourceDest = {
    ...vehiclePayload,
    sourceFactoryId: userFactoryId,
    destinationFactoryId: destId,
    purpose: trip?.purpose || "pickup",
  };

  const withTripFactory = { ...vehiclePayload, tripId: trip?._id, factoryId: userFactoryId };
   
  
  const handleLoadAndNewTrip = async () => {
    try {
      if (
        !tripInternal.material ||
        !tripInternal.materialType ||
        !tripInternal.quantity ||
        !tripInternal.invoiceNo ||
        !tripInternal.invoiceAmount
      ) {
        return message.error("Please fill all fields");
      }

      if (isIntraPlant) {
        if (!tripInternal.shipmentSiteId) {
          return message.error("Please select a destination site");
        }
        const site = loadSiteBlocks.find((s) => s._id === tripInternal.shipmentSiteId);
        if (site?.supportsBlocks && !tripInternal.shipmentBlockId) {
          return message.error("Please select a destination block");
        }
      }

      const newTripDetails = isIntraPlant
        ? {
            newSiteId: tripInternal.shipmentSiteId,
            newBlockId: tripInternal.shipmentBlockId || null,
            type: "intraplant",
            ...withTripFactory,
            materialType: tripInternal.materialType,
            material: tripInternal.material,
            quantity: tripInternal.quantity,
            invoiceNo: tripInternal.invoiceNo,
            invoiceAmount: tripInternal.invoiceAmount,
            customer: tripInternal.customer,
          }
        : {
            newDestinationFactoryId: tripInternal.shipmentFactory,
            externalDestination: tripInternal.shipmentCustomer,
            shipmentType,
            type: "internal",
            ...withTripFactory,
            materialType: tripInternal.materialType,
            material: tripInternal.material,
            quantity: tripInternal.quantity,
            invoiceNo: tripInternal.invoiceNo,
            invoiceAmount: tripInternal.invoiceAmount,
            customer: tripInternal.customer,
          };

      await doAction(() =>
        api.post(`/trip/load-material-and-newtrip/${selectedTrip._id}`, { newTripDetails })
      );
      setOpenLoadModal(false);
      setTripInternal(DEFAULT_TRIP_INTERNAL);
      setSelectedTrip(null);
    } catch (err) {
      message.error("Failed to complete load and create new trip");
    }
  };

  const handleLoadComplete = async () => {
    try {
        if(isLoadAndComplete){
          await handleLoadAndNewTrip();
          return;
        }else{
          if (
            !tripInternal.material ||
            !tripInternal.materialType ||
            !tripInternal.quantity ||
            !tripInternal.invoiceNo ||
            !tripInternal.invoiceAmount
          ) {
            return message.error("Please fill all fields");
          }

          await doAction(() =>
            api.post(`/trip/load-complete/${selectedTrip._id}`,
              {
                ...withTripFactory,
                tripDetails: {
                  material: tripInternal.material,
                  materialType: tripInternal.materialType,
                  quantity: tripInternal.quantity,
                  invoiceNo: tripInternal.invoiceNo,
                  invoiceAmount: tripInternal.invoiceAmount,
                  customer: tripInternal.customer,
                },
              }
            )
          );

          setOpenLoadModal(false);
          setTripInternal(DEFAULT_TRIP_INTERNAL);
          setSelectedTrip(null);
      }
    } catch (err) {
      message.error("Failed to complete loading");
    }
  };

  const [checkinLoading, setCheckinLoading] = useState(false);
  const [siteId, setSiteId] = useState(null);
  const [blockId, setBlockId] = useState(null);
  const [siteBlocks, setSiteBlocks] = useState([]);
  const [fetchingSites, setFetchingSites] = useState(false);


  useEffect(() => {
    if (!checkinModalOpen) return;
    const factoryId = userFactoryId;
    if (!factoryId) return;
    const fetchSites = async () => {
      try {
        setFetchingSites(true);
        const res = await api.get("/sites", { params: { factoryId } });
        setSiteBlocks(res.data?.sites || res.data?.data || res.data || []);
      } catch {
        message.error("Could not load sites/blocks");
      } finally {
        setFetchingSites(false);
      }
    };
    fetchSites();
  }, [checkinModalOpen, userFactoryId]);


  const getLocationOptions = useCallback((purpose) => {
    const wantSiteType = purpose === "Pickup" ? "dispatch" : "store";
    const prefix = purpose === "Pickup" ? "Dispatch" : "Store";
    const opts = [];

    siteBlocks.forEach((site) => {
      const siteName = site.name?.trim().toLowerCase() || "";

      
      if (!siteName.includes(wantSiteType)) return;

      (site.allowedBlocks || []).forEach((block) => {
        opts.push({
          value: `${site._id}__${block._id}`,
          label: `${prefix} ${block.name}`,
        });
      });
    });

    return opts;
  }, [siteBlocks, trip.purpose]);

  const handleLocationChange = (val) => {
    const [s, b] = (val || "").split("__");
    setSiteId(s || null);
    setBlockId(b || null);
  };

  const resetCheckinModal = () => {
    setCheckinModalOpen(false);
    setIsIntraPlant(false);
    setSiteId(null);
    setBlockId(null);
  };

  const handleCheckinConfirm = async () => {
    // siteId always required
    if (!siteId) {
      return message.error("Please select a site");
    }
    // blockId required only when intra movement is ON
    if (isIntraPlant && !blockId) {
      return message.error("Please select a block for Intra Movement");
    }

    setCheckinLoading(true);

    try {
      const res = await api.post(`/trip/checkin/${trip._id}`, {
        ...withFactory,
        siteId,                                    // always sent
        isIntraPlant,
        blockId: isIntraPlant ? blockId : undefined, // only sent when intra is ON
      });
      message.success(res.data?.message || "Vehicle checked in");
      onAction();
      resetCheckinModal();
    } catch (e) {
      message.error(e.response?.data?.message || "Action failed");
    } finally {
      setCheckinLoading(false);
    }
  };

  // ─── Button Definitions ──────────────────────────────────────────────────────
// ─── Workflow Action Codes (mirrors server's ACTIONS enum — keep in sync manually) ──
const ACTIONS = {
  ARRIVED: "ARRIVED",
  CHECKIN: "CHECKIN",
  CANCEL: "CANCEL",
  UNLOAD: "UNLOAD",
  LOAD: "LOAD",
  COMPLETE: "COMPLETE",
  NEXT_TRIP: "NEXT_TRIP",
  DISPATCH_CHECKOUT: "DISPATCH_CHECKOUT",
  NEXT_LOCATION: "NEXT_LOCATION",
  EXIT_CHECKOUT: "EXIT_CHECKOUT",
  ROUTE_CHANGED: "ROUTE_CHANGED",
  ROUTE_CHANGE_WITHOUT_LOAD: "ROUTE_CHANGE_WITHOUT_LOAD",
  ROUTE_CHANGE_WITHOUT_UNLOAD: "ROUTE_CHANGE_WITHOUT_UNLOAD",
  VEHICLE_LOADED: "VEHICLE_LOADED",
  LOAD_AND_ROUTE_CHANGE: "LOAD_AND_ROUTE_CHANGE",
  CHANGED_ROUTE_WITHOUT_CHECKIN: "CHANGED_ROUTE_WITHOUT_CHECKIN",

   // INTRA-FACTORY MOVEMENT ACTIONS
  ARRIVAL:          "ARRIVAL",
  LOAD:             "LOAD",
  UNLOAD:           "UNLOAD",
  ROUTE_CHANGE:     "ROUTE_CHANGE",
  DISPATCH:         "DISPATCH",
  CLOSE:             "CLOSE",
  COMPLETE:          "COMPLETE",
  LOAD_NEW_MATERIAL: "LOAD_NEW_MATERIAL",
};

const { allowedActions = [], stage, actionRequiredBy } = vehicle.workflow || {};

const requiredActor  = actionRequiredBy?.actor || [];   // e.g. "storeSite", "atGate"
const requiredSiteId = actionRequiredBy?.siteId || [];

const userWorkLocation = user?.workLocation;
const userSiteId       = String(user?.siteId?._id || "");
const userBlockId      = String(user?.blockId?._id || "");
const tripSiteId       = String(trip?.site?._id || trip?.siteId || "");
const tripBlockId      = String(trip?.block?._id || trip?.blockId || "");


const effectiveSiteIds = Array.isArray(requiredSiteId)
  ? requiredSiteId.map(String)
  : requiredSiteId
    ? [String(requiredSiteId)]
    : [];
const actorMatches = requiredActor.length === 0 || requiredActor.includes(userWorkLocation);
const siteMatches = effectiveSiteIds.length === 0 || effectiveSiteIds.includes(userSiteId);
const blockMatches = !trip?.isIntraPlant || String(userBlockId) === tripBlockId;
const canAct = actorMatches || siteMatches



const ACTION_REGISTRY = {
  
  // INTRA PLANT MOVEMENT ACTIONS
  [ACTIONS.ARRIVAL]: {
    label: "✓ Mark Arrived",
    confirmTitle: "Mark this vehicle as arrived at the site?",
    color: "#10b981",
    onConfirm: () => doAction(() => api.post(`/trip/arrive/${trip._id}`, withFactory)),
  },

  [ACTIONS.CHANGED_ROUTE_WITHOUT_CHECKIN]: {
    label: "Change route without Checkin → ",
    confirmTitle: "Are you sure you want to move the vehicle to the Outside Factory?",
    color: "#db4116",
    onConfirm: () => openChangeRouteModal(trip, { skipCheckin: true }),
  },

  [ACTIONS.UNLOAD]: {
    label: "↓ Mark Unloaded",
    confirmTitle: "Confirm the vehicle has been fully unloaded at the site?",
    color: "#f59e0b",
    onConfirm: () => doAction(() => api.post(`/trip/intra-plant-unload/${trip._id}`, withFactory)),
  },


  // [ACTIONS.LOAD]: {
  //   label: "↑ Mark Load Complete intra-plant",
  //   confirmTitle: "Confirm the vehicle has been fully loaded at the site?",
  //   color: "#8b5cf6",
  //   onConfirm: () => {
  //     setSelectedTrip(trip);
  //     setTripInternal(DEFAULT_TRIP_INTERNAL);
  //     setisLoadAndComplete(false);
  //     setOpenLoadModal(true);
  //   },
  // },

  [ACTIONS.ROUTE_CHANGE]: {
    label: "Select Next Block → ",
    confirmTitle: "Are you sure you want to move the vehicle to the Outside Factory?",
    color: "#667eea",
    onConfirm: () => openChangeRouteModal(trip),
  },

  [ACTIONS.DISPATCH]: {
    label: "→ Dispatch Vehicle (Move to Next Block)",
    confirmTitle: "Dispatch this vehicle to its destination?",
    color: "#6366f1",
    onConfirm: () => doAction(() => api.post(`/trip/intra-plant-dispatch/${trip._id}`, withSourceDest)),
  },

  [ACTIONS.CLOSE]: {
    label: "Close Trip",
    confirmTitle: "Are you sure you want to close this trip?",
    color: "linear-gradient(90deg, #333333 0%, #dd1818 100%)",
    onConfirm: () => doAction(() => api.post(`/trip/internal-transfer-complete/${trip._id}`, withTripFactory)),
  },

  [ACTIONS.LOAD_NEW_MATERIAL]: {
    label: "Load New Material & Next Trip → ",
    confirmTitle: "This will Close current Trip and create a new Trip with new Material. Are you sure?",
    color: "#0fbf61",
    onConfirm: () => {
      setSelectedTrip(trip);
      setTripInternal(DEFAULT_TRIP_INTERNAL);
      setisLoadAndComplete(true);
      setOpenLoadModal(true);
    }
  },



  // INTER PLANT MOVEMENT ACTIONS
  [ACTIONS.CHECKIN]: {
    label: "✓ Allow Entry (Checkin)",
    confirmTitle: "Allow this vehicle to enter the factory?",
    color: "#10b981",
    isCheckinAction: true,
    onConfirm: () => doAction(() => api.post(`/trip/checkin/${trip._id}`, withFactory)),
  },

  [ACTIONS.CANCEL]: {
    label: "✕ Cancel Trip",
    confirmTitle: "Are you sure you want to cancel this trip?",
    color: "#D75656",
    onConfirm: () => setCancelModalOpen(true),
  },

  [ACTIONS.ARRIVED]: {
    label: "✓ Mark Arrived",
    confirmTitle: "Mark this vehicle as arrived?",
    color: "#10b981",
    onConfirm: () => doAction(() => api.post(`/trip/arrive/${trip._id}`, withFactory)),
  },

  [ACTIONS.DISPATCH_CHECKOUT]: {
    label: "→ Dispatch Vehicle (Checkout)",
    confirmTitle: "Dispatch this vehicle to its destination?",
    color: "#6366f1",
    onConfirm: () => doAction(() => api.post(`/trip/checkout/${trip._id}`, withSourceDest)),
  },

  [ACTIONS.EXIT_CHECKOUT]: {
    label: "Checkout & Exit",
    confirmTitle: "Check this vehicle out and allow it to exit?",
    color: "#D75656",
    onConfirm: () => doAction(() => api.post(`/trip/exit-checkout/${trip._id}`, withSourceDest)),
  },

  [ACTIONS.UNLOAD]: {
    label: "↓ Mark Unloaded",
    confirmTitle: "Confirm the vehicle has been fully unloaded?",
    color: "#f59e0b",
    onConfirm: () => doAction(() => api.post(`/trip/unload/${trip._id}`, withFactory)),
  },

  [ACTIONS.LOAD]: {
    label: "↑ Mark Load Complete",
    confirmTitle: "Confirm the vehicle has been fully loaded?",
    color: "#8b5cf6",
    onConfirm: () => {
      setSelectedTrip(trip);
      setTripInternal(DEFAULT_TRIP_INTERNAL);
      setisLoadAndComplete(false);
      setOpenLoadModal(true);
    },
  },

  [ACTIONS.ROUTE_CHANGE_WITHOUT_LOAD]: {
    label: "Change route without Load → ",
    confirmTitle: "Are you sure you want to move the vehicle to the Outside Factory?",
    color: "#db4116",
    onConfirm: () => openChangeRouteModal(trip),
  },

  [ACTIONS.ROUTE_CHANGE_WITHOUT_UNLOAD]: {
    label: "Change route without Unload → ",
    confirmTitle: "Are you sure you want to move the vehicle to the Outside Factory?",
    color: "#db4116",
    onConfirm: () => openChangeRouteModal(trip),
  },

  [ACTIONS.NEXT_LOCATION]: {
    label: "Move to Next Factory → ",
    confirmTitle: "Are you sure you want to move the vehicle to the Outside Factory?",
    color: "#3a64c7",
    onConfirm: () => openChangeRouteModal(trip),
  },

  [ACTIONS.COMPLETE]: {
    label: type === "internal_transfer" ? "Mark Trip Completed & Close inside factory":   "Mark Ready to Checkout" ,
    confirmTitle: type === "internal_transfer" ? "This will complete the internal transfer and close the trip. Are you sure?": "Mark this vehicle as ready to checkout?",
    color: "#8b5cf6",
    onConfirm: () => {
      const endpoint = (type === "internal_transfer") ? `/trip/internal-transfer-complete/${trip._id}`: `/trip/complete/${trip._id}`;
      return doAction(() => api.post(endpoint, withTripFactory));
    },
  },

  [ACTIONS.LOAD_AND_ROUTE_CHANGE]: {
    label: "Load New Material & Next Trip → ",
    confirmTitle: type === "internal_transfer"
      ? "This will Close current Trip and create a new Trip with new Material. Are you sure?"
      : "Mark this vehicle as ready to checkout?",
    color: "#0fbf61",
    onConfirm: () => {
      setSelectedTrip(trip);
      setTripInternal(DEFAULT_TRIP_INTERNAL);
      setisLoadAndComplete(true);
      setOpenLoadModal(true);
    },
  },
};

const visibleActions = canAct ? allowedActions.map((code) => {
  const def = ACTION_REGISTRY[code];
  if (!def) {
    console.warn(`[WorkflowActions] No UI mapping for action code: ${code}`);
    return null;
  }
  return { code, ...def };
}).filter(Boolean) : []; 


  const ACTION_LABEL_REGISTRY = {
      [ACTIONS.CHECKIN]: "Yes, Confirmed Checkin",
      [ACTIONS.CANCEL]: "Yes, Cancel Trip",
      [ACTIONS.ARRIVED]: "Yes, Mark Arrived",
      [ACTIONS.ARRIVAL]: "Yes, Mark Arrived",
      [ACTIONS.CHECKOUT]: "Yes, Checkout Vehicle",
      [ACTIONS.EXIT_CHECKOUT]: "Yes, Checkout & Exit",
      [ACTIONS.UNLOAD]: "Yes, Mark Unloaded",
      [ACTIONS.LOAD]: "Yes, Mark Load Complete",
      [ACTIONS.ROUTE_CHANGE_WITHOUT_LOAD]: "Yes, Change route without Load → ",
      [ACTIONS.ROUTE_CHANGE_WITHOUT_UNLOAD]: "Yes, Change route without Unload → ",
      [ACTIONS.ROUTE_CHANGED]: "Yes, Move to Next Factory → ",
      [ACTIONS.ROUTE_CHANGE]: "Yes, Move to Next Location → ",
      [ACTIONS.COMPLETE]: (type === "internal_transfer")? "Yes, Mark Trip Completed & Close here" : "Yes, Mark Ready to Checkout",
      [ACTIONS.NEXT_TRIP]: "Yes, Load New Material & Next Trip → ",
      [ACTIONS.CLOSE]: "Yes, Close Trip",
      [ACTIONS.LOAD_AND_ROUTE_CHANGE]: "Yes, Load New Material & Next Trip → ",
      [ACTIONS.LOAD_NEW_MATERIAL]: "Yes, Load New Material & Next Trip → ",
      [ACTIONS.DISPATCH]: "Yes, Dispatch Vehicle ",
      [ACTIONS.DISPATCH_CHECKOUT]: "Yes, Dispatch Vehicle (Checkout)",
      
  }

  const getConfirmButtonLabel = (actionCode) => {
    return ACTION_LABEL_REGISTRY[actionCode] || "Yes, Confirmed";
  }


  const [loadSiteBlocks, setLoadSiteBlocks] = useState([]);
  const [fetchingLoadSites, setFetchingLoadSites] = useState(false);

  useEffect(() => {
    if (!openLoadModal || !isIntraPlant) return;
    const factoryId = userFactoryId;
    if (!factoryId) return;
    const fetchSites = async () => {
      try {
        setFetchingLoadSites(true);
        const res = await api.get("/sites", { params: { factoryId } });
        setLoadSiteBlocks(res.data?.sites || res.data?.data || res.data || []);
      } catch {
        message.error("Could not load sites/blocks");
      } finally {
        setFetchingLoadSites(false);
      }
    };
    fetchSites();
  }, [openLoadModal, isIntraPlant, userFactoryId]);

  const allowedLoadSites = useMemo(() => {
    const allowedSiteIds = new Set(
      (user?.factory?.allowedSites || [])
        .filter((s) => s.name !== "Security")
        .map((s) => String(s._id))
    );

    return (loadSiteBlocks || []).filter((site) => allowedSiteIds.has(String(site._id)));
  }, [loadSiteBlocks, user]);

  const currentSiteId  = trip?.siteId?._id || trip?.destinationSiteId?._id || trip?.sourceSiteId?._id || null;
  const currentBlockId = trip?.blockId?._id || trip?.destinationBlockId?._id || trip?.sourceBlockId?._id || null;
  
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap",}}>
     {visibleActions.map(({ code, label, confirmTitle, color, onConfirm }) => (
      <Popconfirm key={code} title={confirmTitle} onConfirm={onConfirm} okText={getConfirmButtonLabel(code)} cancelText="Cancel"  disabled={loading}>
        <button
          disabled={loading}
          style={{
            background: color, color: "#fff", border: "none", borderRadius: 8,
            padding: "9px 18px", fontWeight: 700, fontSize: 13,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Please wait..." : label}
        </button>
      </Popconfirm>
    ))}

    <ChangeRouteModal {...modalProps} />

    <AntModal
      open={openLoadModal}
      onCancel={() => setOpenLoadModal(false)}
      footer={null}
      width={520}
      centered
      closeIcon={
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: "#f3f4f6", display: "flex",
          alignItems: "center", justifyContent: "center",
          fontSize: 13, color: "#6b7280", cursor: "pointer",
          transition: "background .15s",
        }}>✕</span>
      }
      styles={{
        content: { padding: 0, borderRadius: 16, overflow: "hidden" },
        mask: { backdropFilter: "blur(4px)", background: "rgba(0,0,0,0.35)" },
      }}
      title={null}
    >
      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        padding: "22px 24px 20px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position:"absolute", top:-30, right:-30, width:120, height:120, borderRadius:"50%", background:"rgba(99,102,241,0.12)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:-20, left:60, width:80, height:80, borderRadius:"50%", background:"rgba(34,211,238,0.07)", pointerEvents:"none" }}/>

        <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative" }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg,#6366f1,#4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
          }}>📦</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#f8fafc", letterSpacing: -0.3 }}>
              Complete Loading
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1, fontWeight: 400 }}>
              Fill in shipment details to confirm dispatch
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "20px 24px 24px", background: "#fff" }}>

        {/* Section label */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
          <span style={{ fontSize:10, fontWeight:700, color:"#6366f1", textTransform:"uppercase", letterSpacing:1 }}>
            Materials Details
          </span>
          <div style={{ flex:1, height:1, background:"#e0e7ff" }}/>
        </div>

        {/* Row 1 — Customer + Invoice No */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:10, fontWeight:600, color:"#475569", textTransform:"uppercase", letterSpacing:.6 }}>
              Customer (optional)
            </label>
            <Select
              showSearch
              placeholder="Search customer…"
              style={{ width: "100%" }}
              value={tripInternal.customer || undefined}
              onChange={(value) => setTripInternal({ ...tripInternal, customer: value })}
              options={(customers || []).map((c) => ({ label: c.l , value: c.v }))}
              filterOption={(input, option) =>
                option.label.toLowerCase().includes(input.toLowerCase())
              }
              optionFilterProp="label"
              styles={{ popup: { root: { borderRadius: 10 } } }}
            />
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:10, fontWeight:600, color:"#475569", textTransform:"uppercase", letterSpacing:.6 }}>
              Invoice No. <span className="text-red-500" >*</span>
            </label>
            <Input
              required
              placeholder="e.g. INV-2024-001"
              value={tripInternal.invoiceNo?.toUpperCase()}
              onChange={(e) => setTripInternal({ ...tripInternal, invoiceNo: e.target.value })}
              style={{ borderRadius: 8 }}
            />
          </div>
        </div>

        {/* Row 2 — Material + Quantity */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:10, fontWeight:600, color:"#475569", textTransform:"uppercase", letterSpacing:.6 }}>
              Material <span className="text-red-500" >*</span>
            </label>
            <Input
              required
              placeholder="Material description"
              value={tripInternal.material?.toUpperCase()}
              onChange={(e) => setTripInternal({ ...tripInternal, material: e.target.value })}
              style={{ borderRadius: 8 }}
            />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:10, fontWeight:600, color:"#475569", textTransform:"uppercase", letterSpacing:.6 }}>
              Material Type <span className="text-red-500" >*</span>
            </label>
            <Select
              required
              placeholder="Select material type"
              value={tripInternal.materialType}
              onChange={(value) =>
                setTripInternal({
                  ...tripInternal,
                  materialType: value
                })
              }
              options={[
                { label: "RAW Material", value: "RM" },
                { label: "Finish Good", value: "FG" },
                { label: "Other", value: "OTHER" }
              ]}
              style={{ borderRadius: 8 }}
            />
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:10, fontWeight:600, color:"#475569", textTransform:"uppercase", letterSpacing:.6 }}>
              Quantity <span className="text-red-500" >*</span>
            </label>
            <InputNumber
              required
              placeholder="0"
              style={{ width:"100%", borderRadius: 8 }}
              value={tripInternal.quantity}
              onChange={(value) => setTripInternal({ ...tripInternal, quantity: value })}
            />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:20 }}>
            <label style={{ fontSize:10, fontWeight:600, color:"#475569", textTransform:"uppercase", letterSpacing:.6 }}>
              Invoice Amount (₹) <span className="text-red-500" >*</span>
            </label>
            <InputNumber
              required
              placeholder="0.00"
              style={{ width:"100%", borderRadius: 8 }}
              value={tripInternal.invoiceAmount}
              formatter={(v) => v ? `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
              parser={(v) => v?.replace(/₹\s?|(,*)/g, "") || ""}
              onChange={(value) => setTripInternal({ ...tripInternal, invoiceAmount: value })}
            />
          </div>
        </div>

        {/* Row 3 — Invoice Amount */}


        {/* ── NEW: Shipment Type Section ── */}
        <div style={{ height:1, background:"#f1f5f9", marginBottom:16 }}/>

      {isLoadAndComplete && (
        <>
          {/* Section label */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <span style={{ fontSize:10, fontWeight:700, color:"#6366f1", textTransform:"uppercase", letterSpacing:1 }}>
              {isIntraPlant ? "Destination Site" : "Shipment Type"}
            </span>
            <div style={{ flex:1, height:1, background:"#e0e7ff" }}/>
          </div>

          {isIntraPlant ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ fontSize:10, fontWeight:600, color:"#475569", textTransform:"uppercase", letterSpacing:.6 }}>
                  Select Site <span className="text-red-500">*</span>
                </label>
                <Select
                  showSearch
                  loading={fetchingLoadSites}
                  placeholder="Search site…"
                  style={{ width: "100%" }}
                  value={tripInternal.shipmentSiteId || undefined}
                  optionFilterProp="label"
                  options={allowedLoadSites.map((s) => ({ label: s.name, value: s._id }))}
                  onChange={(value) =>
                    setTripInternal((prev) => ({ ...prev, shipmentSiteId: value, shipmentBlockId: "" }))
                  }
                />
              </div>

              {(() => {
                const site = allowedLoadSites.find((s) => s._id === tripInternal.shipmentSiteId);
                if (!site?.supportsBlocks) return null;

                const isSameSiteAsCurrent = currentSiteId && String(site._id) === String(currentSiteId);

                const userSiteId = user?.siteId?._id ? String(user.siteId._id) : null;
                const userBlockId = user?.blockId?._id ? String(user.blockId._id) : null;
                const isSameSiteAsUser = userSiteId && String(site._id) === userSiteId;

                const blockOptions = (site?.allowedBlocks || []).filter((b) => {
                  const bId = String(b._id);
                  if (isSameSiteAsCurrent && currentBlockId && bId === String(currentBlockId)) return false;
                  if (isSameSiteAsUser && userBlockId && bId === userBlockId) return false;
                  return true;
                });

                return (
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    <label style={{ fontSize:10, fontWeight:600, color:"#475569", textTransform:"uppercase", letterSpacing:.6 }}>
                      Select Block <span className="text-red-500">*</span>
                    </label>
                    <Select
                      showSearch
                      disabled={!tripInternal.shipmentSiteId}
                      placeholder={!tripInternal.shipmentSiteId ? "Select a site first" : "Search block…"}
                      style={{ width: "100%" }}
                      value={tripInternal.shipmentBlockId || undefined}
                      optionFilterProp="label"
                      options={blockOptions.map((b) => ({ label: b.name, value: b._id }))}
                      onChange={(value) =>
                        setTripInternal((prev) => ({ ...prev, shipmentBlockId: value }))
                      }
                    />
                  </div>
                );
              })()}

              <span style={{ fontSize:10, color:"#94a3b8" }}>
                Select the destination site (and block, if applicable) within this plant.
              </span>
            </div>
          ) : (
            <Tabs
              activeKey={shipmentType}
              onChange={(key) => {
                setShipmentType(key);
                setTripInternal((prev) => ({ ...prev, shipmentFactory: undefined, shipmentCustomer: undefined }));
              }}
              size="small"
              style={{ marginBottom: 4 }}
              items={[
                {
                  key: "internal",
                  label: (
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 12 }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: 5,
                        background: shipmentType === "internal" ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "#e2e8f0",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, color: shipmentType === "internal" ? "#fff" : "#94a3b8",
                        transition: "all .2s",
                      }}>🏭</span>
                      Internal Shipment
                    </span>
                  ),
                  children: (
                    <div style={{ paddingTop: 12 }}>
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        <label style={{ fontSize:10, fontWeight:600, color:"#475569", textTransform:"uppercase", letterSpacing:.6 }}>
                          Select Factory
                        </label>
                        <Select
                          showSearch
                          allowClear
                          placeholder="Search factory…"
                          style={{ width: "100%" }}
                          value={tripInternal.shipmentFactory || undefined}
                          onChange={(value) =>
                            setTripInternal(prev => ({ ...prev, shipmentFactory: value }))
                          }
                          options={factories.map((f) => ({
                            label: `${f?.name} (${f?.location})`,
                            value: f?._id
                          }))}
                          filterOption={(input, option) =>
                            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                          }
                          optionFilterProp="label"
                        />
                        <span style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>
                          Select the destination factory for this internal transfer.
                        </span>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "external",
                  label: (
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 12 }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: 5,
                        background: shipmentType === "external" ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "#e2e8f0",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, color: shipmentType === "external" ? "#fff" : "#94a3b8",
                        transition: "all .2s",
                      }}>🚚</span>
                      External Shipment
                    </span>
                  ),
                  children: (
                    <div style={{ paddingTop: 12 }}>
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        <label style={{ fontSize:10, fontWeight:600, color:"#475569", textTransform:"uppercase", letterSpacing:.6 }}>
                          Select Customer
                        </label>
                        <Select
                          showSearch
                          allowClear
                          placeholder="Search customer…"
                          style={{ width: "100%" }}
                          value={tripInternal.shipmentCustomer || undefined}
                          onChange={(value) => setTripInternal({ ...tripInternal, shipmentCustomer: value })}
                          options={customers.map((c) => ({ label: c.l, value: c.v }))}
                          filterOption={(input, option) =>
                            option.label.toLowerCase().includes(input.toLowerCase())
                          }
                          optionFilterProp="label"
                          styles={{ popup: { root: { borderRadius: 10 } } }}
                        />
                        <span style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>
                          Select the customer receiving this external shipment.
                        </span>
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </>
      )}

        {/* ── Actions ── */}
        <div style={{ height:1, background:"#f1f5f9", margin:"20px 0 16px" }}/>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button
            onClick={() => {  setOpenLoadModal(false); setSelectedTrip(null); setisLoadAndComplete(false); }}
            style={{
              padding:"8px 16px", borderRadius:9, fontSize:12, fontWeight:600,
              border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#475569",
              cursor:"pointer", transition:"all .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background="#f1f5f9"}
            onMouseLeave={e => e.currentTarget.style.background="#f8fafc"}
          >
            Discard
          </button>
          <button
            onClick={handleLoadComplete}
            style={{
              padding:"8px 20px", borderRadius:9, fontSize:12, fontWeight:700,
              border:"none", cursor:"pointer", transition:"all .15s",
              background:"linear-gradient(135deg,#6366f1,#4f46e5)",
              color:"#fff", boxShadow:"0 3px 10px rgba(99,102,241,0.35)",
              display:"flex", alignItems:"center", gap:6,
            }}
            onMouseEnter={e => { e.currentTarget.style.filter="brightness(1.1)"; e.currentTarget.style.transform="translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.filter=""; e.currentTarget.style.transform=""; }}
          >
            <span>✓</span> Confirm Loading
          </button>
        </div>

      </div>
    </AntModal>
      
    {/* Check-in Modal */}
    <AntModal
      open={checkinModalOpen}
      onCancel={resetCheckinModal}
      footer={null}
      width={460}
      centered
      closeIcon={
        <span style={{
          width: 26, height: 26, background: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, color: "#6b7280", cursor: "pointer",
        }}>✕</span>
      }
      styles={{
        content: { padding: 0, borderRadius: 16, overflow: "hidden" },
        mask: { backdropFilter: "blur(4px)", background: "rgba(0,0,0,0.35)" },
      }}
      title={null}
    >
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg,#10b981 0%,#059669 100%)",
        padding: "16px 20px",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,.2)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        }}>✓</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Allow Entry (Checkin)</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.8)" }}>
            {vehicle?.vehicle?.vehicleNumber || "Vehicle"} — confirm entry to factory
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "18px 20px 20px", background: "#fff" }}>

        {/* ── Site selector — always required, always visible ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
          <label style={{ fontSize: 10.5, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: .6 }}>
            {trip.purpose === "Pickup" ? "Dispatch Site" : "Store Site"}
            <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>
          </label>
          <Select
            loading={fetchingSites}
            placeholder="Select site"
            style={{ width: "100%" }}
            value={siteId || undefined}
            showSearch
            optionFilterProp="label"
            options={(() => {
              const wantType = trip.purpose === "Pickup" ? "dispatch" : "store";
              return siteBlocks
                .filter((site) => {
                  const n = site.name?.trim().toLowerCase() || "";
                  return n.includes(wantType);
                })
                .map((site) => ({ value: site._id, label: site.name }));
            })()}
            onChange={(val) => {
              setSiteId(val);
              setBlockId(null); // reset block when site changes
            }}
          />
        </div>

        {/* ── Intra Movement toggle ── */}
        <div style={{
          background: isIntraPlant ? "#eef2ff" : "#f8fafc",
          border: `1.25px solid ${isIntraPlant ? "#a5b4fc" : "#e5e7eb"}`,
          borderRadius: 12, padding: "10px 14px",
          marginBottom: isIntraPlant ? 12 : 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          transition: "all .2s",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: isIntraPlant ? "#ede9fe" : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,.08)", fontSize: 14,
            }}>📍</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 12.5, color: "#374151" }}>Enable Intra Movement</div>
              <div style={{ fontSize: 10.5, color: "#9ca3af", fontWeight: 500 }}>
                Assign a specific block within the site
              </div>
            </div>
          </div>
          <Switch
            checked={isIntraPlant}
            onChange={(checked) => {
              setIsIntraPlant(checked);
              if (!checked) setBlockId(null);
            }}
          />
        </div>

        {/* ── Block selector — only when intra movement is ON ── */}
        {isIntraPlant && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: .6 }}>
              {trip.purpose === "Pickup" ? "Dispatch Block" : "Store Block"}
              <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>
            </label>
            <Select
              loading={fetchingSites}
              disabled={!siteId}
              placeholder={!siteId ? "Select a site first" : "Select block"}
              style={{ width: "100%" }}
              value={blockId || undefined}
              showSearch
              optionFilterProp="label"
              options={(() => {
                if (!siteId) return [];
                const site = siteBlocks.find((s) => s._id === siteId);
                return (site?.allowedBlocks || []).map((block) => ({
                  value: block._id,
                  label: block.name,
                }));
              })()}
              onChange={(val) => setBlockId(val)}
            />
            {!siteId && (
              <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 500 }}>
                ⚠ Select a site above to load its blocks
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ height: 1, background: "#f1f5f9", margin: "18px 0 14px" }} />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={resetCheckinModal}
            disabled={checkinLoading}
            style={{
              padding: "8px 16px", borderRadius: 9, fontSize: 12, fontWeight: 600,
              border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#475569",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCheckinConfirm}
            disabled={checkinLoading}
            style={{
              padding: "8px 20px", borderRadius: 9, fontSize: 12, fontWeight: 700,
              border: "none", cursor: checkinLoading ? "not-allowed" : "pointer",
              background: "linear-gradient(135deg,#10b981,#059669)",
              color: "#fff", boxShadow: "0 3px 10px rgba(16,185,129,0.35)",
              opacity: checkinLoading ? 0.7 : 1,
            }}
          >
            {checkinLoading ? "Checking in..." : "✓ Confirm Entry"}
          </button>
        </div>
      </div>
    </AntModal>

    <CancelTripModal
      open={cancelModalOpen}
      loading={cancelLoading}
      onCancel={() => setCancelModalOpen(false)}
      onConfirm={async (reason) => {
        setCancelLoading(true);
        try {
          doAction (() => api.post(`/trip/cancel/${trip._id}`, { ...withFactory, reason }) ) ;
          setCancelModalOpen(false);
        } catch (e) {
          message.error(e.response?.data?.message || "Failed to cancel trip");
        } finally {
          setCancelLoading(false);
        }
      }}
    />
      
    </div>
  );
}

// ─── Vehicle Detail Modal ─────────────────────────────────────────────────────
export default function VehicleDetailModal({ selectedVehicleId, onClose, onRefresh  }) {
  if(!selectedVehicleId) return null
  const {user} = useUser();
  
  const userRole = user.workLocation
  const userFactoryId = user?.factory._id;
  const [factories, setFactories] = useState([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);


  const {data, isLoading: selectedTripLoading } = useQuery({
    queryKey: ["vehicle-trip", selectedVehicleId],
    queryFn: async () => {
      if (!selectedVehicleId) return null;
      const res = await api.get(`/vehicle/trips/${selectedVehicleId}`,);
      return res.data;
    },

    enabled: !!selectedVehicleId,
    refetchInterval: selectedVehicleId? 10000: false,
    
  });

  const trip = data || null;

  const location    = trip?.location;
  const vehicleData = trip?.vehicle;
  const pucAlert    = isPUCExpired(vehicleData?.PUCExpiry);
  const phase       = trip?.phase;
  const stage       = getWorkflowStage(trip);
  const tripHistory = Array.isArray(trip?.tripHistory) ? trip.tripHistory : [];
  const vehicle = trip?.vehicle || {};
  const driver = trip?.driver || {};

  
  const canEdit = (() => {
    if (!trip?.createdAt) return false;
    if(trip.type === "external_delivery" && stage !== "DESTINATION"){
      return false;
    }
    if(trip.type === "internal_transfer" && stage !== "ORIGIN"){
      return false;
    }

    const diffMin = (Date.now() - new Date(trip.createdAt)) / 1000 / 60;
    return diffMin <= 0;
  })();

  const Row = ({ label, value, warn, accent }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "5px 0", borderBottom: "1px solid #f1f5f9" }}>
    <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, flexShrink: 0, minWidth: 110 }}>{label}</span>
    <span style={{
      fontSize: 12,
      fontWeight: warn || accent ? 700 : 500,
      color: "#0f172a",
      textAlign: "right",
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
    }}>
      {warn && <WarningOutlined style={{ fontSize: 11 }} />}
      {value || "—"}
    </span>
  </div>
);

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 14,}}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#6366f1", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>{title}</div>
      <div style={{
        background: "#fff",
        borderRadius: 8,
        padding: "10px 10px",
        boxShadow: "0 1px 6px rgba(0,0,0,0.15)",
      }}>{children}</div>
    </div>
  );

  useEffect(() => {
    try {
      const fetchFactories = async () => {
        const res = await api.get("/factories");
        setFactories(res.data.factories);
      }
      fetchFactories();
    } catch (error) {
      message.error("cannot refresh");
    }

  }, []);

  if(selectedTripLoading) {
    return (
      <Modal open={!!vehicle} onClose={onClose} title="Your trip is loading..." width={640} style={{ maxHeight: "90vh", scrollbarWidth: "none" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
          <Spin size="large" />
        </div>
      </Modal>
    );
  }


  const handleCopy = async (id) => {
    try {
      await navigator.clipboard.writeText(String(id));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* clipboard unavailable */ }
  };

  return (
    
    <Modal 
      open={!!trip} 
      onClose={onClose} 
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "2px 0" }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11, flexShrink: 0,
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(99,102,241,0.28)",
          }}>
            <Truck size={19} color="#fff" strokeWidth={2.2} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", letterSpacing: -0.2 }}>
                {vehicleData?.vehicleNumber || "Vehicle"}
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>
                {vehicleData?.transporterName || "Transporter"}
              </span>
              {trip?.isIntraPlant && (
                <span style={{
                  fontSize: 9.5, fontWeight: 700, color: "#4f46e5",
                  background: "#eef2ff", border: "1px solid #c7d2fe",
                  padding: "2px 8px", borderRadius: 20,
                  textTransform: "uppercase", letterSpacing: 0.4,
                }}>
                  Intra-Plant
                </span>
              )}
            </div>

            {trip?.updatedAt && (
            <div
              style={{
                display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8,
                fontSize: 11, fontWeight: 500, color: "#64748b",
              }}
            >
              {/* last updated */}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <i className="ri-time-line" style={{ fontSize: 13, color: "#94a3b8" }} />
                Updated <b style={{ color: "#334155", fontWeight: 600 }}>{fmtTime(trip.updatedAt)}</b>
              </span>

              {/* <span style={{ width: 1, height: 12, background: "#e2e8f0" }} /> */}

              {/* trip id + copy */}
              {/* <span
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "2px 4px 2px 8px", borderRadius: 8,
                  background: "#f5f3ff", border: "1px solid #ddd6fe",
                }}
              >
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.6, color: "#7c3aed" }}>TRIP ID</span>
                <span
                  title={String(trip._id)}
                  style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 11, color: "#4c1d95" }}
                >
                  {trip._id}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(trip._id)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    padding: "1px 7px", borderRadius: 6, cursor: "pointer",
                    border: `1px solid ${copied ? "#6ee7b7" : "#c4b5fd"}`,
                    background: copied ? "#ecfdf5" : "#fff",
                    color: copied ? "#047857" : "#7c3aed",
                    fontSize: 10, fontWeight: 700, lineHeight: "16px",
                    transition: "all .15s ease",
                  }}
                >
                  <i className={copied ? "ri-check-line" : "ri-file-copy-line"} style={{ fontSize: 11 }} />
                  {copied ? "Copied" : "Copy"}
                </button>
              </span> */}
            </div>
          )}
          </div>
        </div>
      }
      width={640}
      style={{ maxHeight: "90vh", background: "#f3f4f6", scrollY: "auto", scrollbarWidth: "none", position: "relative", padding: 0 }}
      styles={{
        body: {
          background: "#f3f4f6"
        },
        header: {
          padding: "18px 24px",
          borderBottom: "1px solid #e5e7eb",
          background: "#fff",
        }
      }}
      >
        
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <TypeBadge type={vehicleData?.typeOfVehicle} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", background: "#f3f4f6", borderRadius: 5, padding: "2px 7px" }}>
          {trip?.purpose === "Pickup" ? "📦 Pickup" : "🚚 Delivery"}
        </span>
        {phase && (
          <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: .8, textTransform: "uppercase", padding: "2px 8px", borderRadius: 20, background: phase === "ORIGIN" ? "#ede9fe" : "#dcfce7", color: phase === "ORIGIN" ? "#6366f1" : "#15803d" }}>
            {phase === "ORIGIN" ? "Origin" : "Destination"}
          </span>
        )}
        {pucAlert && (
          <span style={{ background: "#fef2f2", color: "#dc2626", fontSize: 10.5, fontWeight: 700, borderRadius: 5, padding: "2px 7px", display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ width: 11, height: 11 }}>{Icon.alert}</span> PUC Expired
          </span>
        )}
      </div>

      {/* Info grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,  }}>
        <Section title="Driver">
          <Row label="Name"             value={driver?.driverName} />
          <Row label="Contact"          value={driver?.driverContact} />
          <Row label="ID Type"          value={driver?.driverIdType} />
          <Row label="ID Number"        value={driver?.driverIdNumber} />
        </Section>
        <Section title="Vehicle">
          <Row label="Number"           value={vehicleData?.vehicleNumber} accent />
          <Row label="Transporter"      value={vehicleData?.transporterName} />
          <Row label="Type"             value={vehicleTypeLabel[vehicleData?.typeOfVehicle] || vehicleData?.typeOfVehicle} />
          <Row label="PUC End"          value={fmtDate(vehicleData?.PUCExpiry)} warn={pucAlert} />
        </Section>
        <Section title="Trip Details">
          <Row label="Type"             value={trip?.type === "external_delivery"? "External Trip" : "Internal Trip"} />
          <Row label="Status"           value={trip?.status === "IN_TRANSIT"? "In Transit" : trip?.status === "ROUTE_CHANGED"? "Route Changed" : trip?.status || "N/A"} />
          <Row label="Load Status"      value={trip?.loadStatus?.charAt(0).toUpperCase() + trip?.loadStatus?.slice(1)} accent={trip?.loadStatus === "loaded"} />
          <Row label="Purpose"          value={trip?.purpose} />
        </Section>
        <Section title="Location">
          <Row label="State"            value={location === "outside_factory" ? "Outside Factory" : location === "inside_factory" ? "Inside Factory" : "In Transit"} accent />
          <Row label="Source Factory"   value={`${trip?.sourceFactory?.name?? trip?.externalSource?? "Unknown" }, ${trip?.isIntraPlant && trip?.sourceSiteId ? `${trip?.sourceSite?.name}, ${ trip?.isIntraPlant && trip?.sourceBlock?.name}` : ""}`|| (trip?.type === "external_delivery" ? (trip?.externalSource?? "External") : "Internal")} />
          <Row label="Destination"      value={`${trip?.destinationFactory?.name?? trip?.externalDestination?? "N/A"}, ${trip?.isIntraPlant && trip?.destinationSiteId ? `${trip?.destinationSite?.name}` : ""} ${trip?.isIntraPlant && trip?.destinationBlockId ? `${trip?.destinationBlock?.name}` : ""}`} />
          <Row label="Trip Start"       value={fmtTime(trip?.createdAt) || "N/A"} />
        </Section>
        <Section title="Material Details">
          <Row label="Material"         value={trip?.materials[0]?.material || "-"} accent />
          <Row label="Quantity"         value={trip?.materials[0]?.quantity || "-"} accent />
          {trip?.materials[0] && 
          trip?.materials[0].customer !== "" && (
              <Row label="Customer"     value={trip?.materials[0]?.customer || "-"} />
          )}
          {trip?.materials[0]?.supplier && trip?.materials[0]?.supplier !== "" && (
            <Row label="Supplier"         value={trip?.materials[0]?.supplier || "-"} />
          )}
        </Section>

        <Section title="Invoice Details">
          <Row label="Material Type"    value={trip?.materials[0]?.name === "RM" ? "Raw Material" : trip?.materials[0]?.name === "FG" ? "Finished Goods" : trip?.materials[0]?.name || "-" } accent />
          <Row label="Invoice No"       value={trip?.materials[0]?.invoiceNo || "-"} accent />
          <Row label="Amount"           value={`${trip?.materials[0]?.invoiceAmount ? `₹ ${trip?.materials[0]?.invoiceAmount.toFixed(2)}` : "₹ 0.00"}`} accent />
        </Section>
      </div>

        { trip?.reason && (
          <div className=" border border-red-400 bg-red-100/80 rounded px-2 text-sm py-1" >
            <span className="block text-[10px] font-semibold" >Trip is cancelled due to :</span>
            <span className="text-[11px] tracking-wide pl-2" > {trip?.reason} </span>
          </div>
        )}

      {/* ── Horizontal Trip History Timeline ── */}
      <TripTimeline tripHistory={tripHistory} isIntraPlant={trip?.isIntraPlant} />

      {/* Workflow actions */}
      <div style={{
        position: "sticky", 
        bottom: -20,
        top: 0,
        marginLeft: -22, 
        marginRight: -20, 
        // marginBottom: -50, 
        left: 0, 
        zIndex: 10, 
        padding: "10px 20px", 
        display: "flex", 
        alignItems: "center", gap: 8, 
        paddingTop: 12, 
        backgroundColor: "white", 
        boxShadow: "0 -2px 4px rgba(0,0,0,0.1)", 
        flexWrap: "wrap" 
      }}
      className="border-t border-gray-200"
        >
        {canEdit && (
            <button
              onClick={() => setEditModalOpen(true)}
              style={{
                background: "rgba(99,102,241,0.08)",
                color: "#4f46e5",
                border: "1.5px solid rgba(99,102,241,0.25)",
                borderRadius: 8,
                padding: "7px 14px",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                backdropFilter: "blur(4px)",
              }}
            >
              ✏️ Edit Trip
            </button>
          )}
        <WorkflowActions vehicle={trip} factory={factories} onAction={() => { onClose(); }} userFactoryId={userFactoryId} userRole={userRole} />
        <CreateVehicleModal
            open={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            onRefresh={() => { setEditModalOpen(false); onRefresh(); }}
            tripToEdit={vehicle}
          />
      </div>

      
    </Modal>
  );
}