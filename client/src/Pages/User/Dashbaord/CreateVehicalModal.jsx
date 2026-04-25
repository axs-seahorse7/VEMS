import { useState, useEffect, useCallback, useRef } from "react";
import api from "../../../../services/API/Api/api";
import { message, Select } from "antd";
import { Factory, Truck, User, Car, ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
const { Option } = Select;

// ─── Document & Vehicle Format Rules ─────────────────────────────────────────
const ID_FORMAT = {
  Aadhar: {
    hint:        "12-digit number — e.g. 2345 6789 0123",
    placeholder: "2345 6789 0123",
    maxRaw:      12,            // raw digits stored/sent
    // strip non-digits, cap at 12
    clean:  (v) => v.replace(/\D/g, "").slice(0, 12),
    // display with spaces: XXXX XXXX XXXX
    display:(v) => v.replace(/\D/g,"").replace(/(\d{4})(\d{1,4})?(\d{1,4})?/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(" ")
    ),
    // validate the raw (digits only) value
    validate:(v) => /^\d{12}$/.test(v) ? null : "Aadhaar must be exactly 12 digits",
  },
  PAN: {
    hint:        "5 letters + 4 digits + 1 letter — e.g. ABCDE1234F",
    placeholder: "ABCDE1234F",
    maxRaw:      10,
    clean:  (v) => v.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 10),
    display:(v) => v,
    validate:(v) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v)
      ? null : "PAN format: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)",
  },
  DL: {
    hint:        "State-RTO-Year-ID — e.g. MH-12-2019-1234567",
    placeholder: "MH-12-2019-1234567",
    maxRaw:      15,            // 15 alphanum chars without dashes
    // auto-insert dashes as user types: SS-RR-YYYY-SSSSSSS
    clean: (raw) => {
      const c = raw.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 15);
      if (c.length <= 2)  return c;
      if (c.length <= 4)  return `${c.slice(0,2)}-${c.slice(2)}`;
      if (c.length <= 8)  return `${c.slice(0,2)}-${c.slice(2,4)}-${c.slice(4)}`;
      return `${c.slice(0,2)}-${c.slice(2,4)}-${c.slice(4,8)}-${c.slice(8)}`;
    },
    display:(v) => v,
    validate:(v) => /^[A-Z]{2}-\d{2}-\d{4}-[A-Z0-9]{7}$/.test(v)
      ? null : "DL format: SS-RR-YYYY-SSSSSSS (e.g. MH-12-2019-1234567)",
  },
};

// Vehicle number: SS NN LLL NNNN  — e.g. RJ 14 AB 1234
const VEH_REGEX = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/;
function cleanVehicleNumber(raw) {
  return raw.replace(/[-\s]/g, "").toUpperCase().slice(0, 10);
}
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
const LS_TAB      = "veh_modal_active_tab";

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
  { v: "Yashoda Industries", l: "Yashoda Industries", type: "customer" }
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
  { v: "ANUP PRINTERS PVT LTD", l: "ANUP PRINTERS PVT LTD" }
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

const DEFAULT_TRIP_COMMON = { purpose: "", materialType: "" };
const DEFAULT_TRIP_INTERNAL = { ...DEFAULT_TRIP_COMMON, destinationFactoryId: "" };
const DEFAULT_TRIP_EXTERNAL = {
  ...DEFAULT_TRIP_COMMON,
  supplier: "", material: "", quantity: "", invoiceNo: "",
  invoiceAmount: "", customer: "", isInternalShifting: false,
  destinationFactoryId: "", passType: "Incoming",
};
const DEFAULT_INTERNAL = { ...DEFAULT_DRIVER, ...DEFAULT_VEHICLE, ...DEFAULT_TRIP_INTERNAL };
const DEFAULT_EXTERNAL = { ...DEFAULT_DRIVER, ...DEFAULT_VEHICLE, ...DEFAULT_TRIP_EXTERNAL };

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  x:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  truck:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  search:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  spinner: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "vehSpin .8s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
  save:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
};

// ─── Modal Shell ──────────────────────────────────────────────────────────────
function Modal({ open, onClose, children, title, width = 780 }) {
  if (!open) return null;
  return (
    <>
      <style>{`
        @keyframes vehSpin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes vehIn    { from{opacity:0;transform:scale(.97) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes vehFade  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes tabSlide { from{opacity:0;transform:translateX(6px)} to{opacity:1;transform:translateX(0)} }
        @keyframes layerOpen { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fmtShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-4px)} 40%{transform:translateX(4px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
        .veh-btn-p { transition:all .15s; }
        .veh-btn-p:hover:not(:disabled) { filter:brightness(1.08); transform:translateY(-1px); box-shadow:0 4px 12px rgba(0,0,0,.18); }
        .veh-btn-c { transition:background .15s; }
        .veh-btn-c:hover { background:#e5e7eb!important; }
        .veh-inp:focus { border-color:#6366f1!important; box-shadow:0 0 0 3px rgba(99,102,241,.12)!important; outline:none; }
        .veh-sec { animation:tabSlide .18s ease; }
        .veh-badge { animation:vehFade .25s ease; }
        .layer-body { animation:layerOpen .18s ease; }
        .tab-pill { transition:all .22s cubic-bezier(.4,0,.2,1); position:relative; overflow:hidden; }
        .tab-pill::before { content:''; position:absolute; inset:0; opacity:0; transition:opacity .22s; }
        .tab-pill.active::before { opacity:1; }
        .fmt-err { animation:fmtShake .35s ease; }
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:#f9fafb} ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:8px}
      `}</style>
      <div
        style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(10,10,20,.5)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:width, maxHeight:"94vh", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 32px 90px rgba(0,0,0,.26), 0 0 0 1px rgba(99,102,241,.08)", animation:"vehIn .22s ease" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 20px 11px", background:"linear-gradient(135deg,#6366f1 0%,#4f46e5 60%,#4338ca 100%)", borderRadius:"18px 18px 0 0", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:9 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:"rgba(255,255,255,.18)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ width:17, height:17, color:"#fff" }}>{Icon.truck}</span>
              </div>
              <div>
                <h2 style={{ margin:0, fontSize:14, fontWeight:800, color:"#fff", letterSpacing:-.3 }}>{title}</h2>
                <p style={{ margin:0, fontSize:9.5, color:"rgba(255,255,255,.65)", fontWeight:400 }}>All draft fields are auto-saved locally</p>
              </div>
            </div>
            <button onClick={onClose} style={{ border:"none", background:"rgba(255,255,255,.18)", cursor:"pointer", borderRadius:8, width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", transition:"background .15s" }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,.28)"}
              onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,.18)"}
            >
              <span style={{ width:13, height:13 }}>{Icon.x}</span>
            </button>
          </div>
          <div style={{ overflowY:"auto", padding:"14px 18px 16px", flex:1 }}>{children}</div>
        </div>
      </div>
    </>
  );
}

// ─── Premium Tab Bar ──────────────────────────────────────────────────────────
function TabBar({ active, setActive, autoSwitched, hasDraft }) {
  const tabs = [
    {
      key: "internal", label: "Internal Vehicle", sub: "Plant to plant transfer",
      icon: <Factory size={15} strokeWidth={2} />,
      gradient: "linear-gradient(135deg,#6366f1,#4f46e5)",
      activeBg: "linear-gradient(135deg,#eef2ff,#e0e7ff)", activeColor: "#4338ca",
      activeBorder: "#a5b4fc", iconBg: "#ede9fe", iconColor: "#6366f1",
    },
    {
      key: "external", label: "External Vehicle", sub: "Gate entry & check-in",
      icon: <Truck size={15} strokeWidth={2} />,
      gradient: "linear-gradient(135deg,#f59e0b,#d97706)",
      activeBg: "linear-gradient(135deg,#fffbeb,#fef3c7)", activeColor: "#92400e",
      activeBorder: "#fcd34d", iconBg: "#fef3c7", iconColor: "#d97706",
    },
  ];
  return (
    <div style={{ display:"flex", gap:8, marginBottom:12, flexShrink:0 }}>
      {tabs.map(t => {
        const isActive = active === t.key;
        return (
          <button key={t.key} className={`tab-pill${isActive?" active":""}`} onClick={() => setActive(t.key)}
            style={{ flex:1, border:isActive?`1.5px solid ${t.activeBorder}`:"1.5px solid #e5e7eb", background:isActive?t.activeBg:"#fafafa", borderRadius:10, padding:"9px 12px", cursor:"pointer", display:"flex", alignItems:"center", gap:10, transition:"all .22s cubic-bezier(.4,0,.2,1)", boxShadow:isActive?`0 2px 12px ${t.activeBorder}55`:"none", position:"relative" }}
          >
            <div style={{ width:32, height:32, borderRadius:9, flexShrink:0, background:isActive?t.iconBg:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", color:isActive?t.iconColor:"#9ca3af", transition:"all .22s", boxShadow:isActive?`0 0 0 3px ${t.iconColor}18`:"none" }}>{t.icon}</div>
            <div style={{ textAlign:"left", minWidth:0 }}>
              <div style={{ fontSize:11.5, fontWeight:800, color:isActive?t.activeColor:"#6b7280", letterSpacing:-.1, transition:"color .22s" }}>{t.label}</div>
              <div style={{ fontSize:9.5, color:isActive?t.activeColor+"aa":"#9ca3af", fontWeight:500, transition:"color .22s" }}>{t.sub}</div>
            </div>
            {hasDraft[t.key] && (<div style={{ position:"absolute", top:7, right:9, width:6, height:6, borderRadius:"50%", background:"#6366f1", boxShadow:"0 0 0 2px #fff" }} title="Draft saved" />)}
            {autoSwitched === t.key && (<span className="veh-badge" style={{ position:"absolute", top:-4, right:-4, background:"#6366f1", color:"#fff", fontSize:7.5, fontWeight:800, borderRadius:6, padding:"1px 5px", letterSpacing:.4 }}>AUTO</span>)}
            {isActive && (<div style={{ position:"absolute", bottom:0, left:"10%", width:"80%", height:2, borderRadius:"2px 2px 0 0", background:t.gradient }} />)}
          </button>
        );
      })}
    </div>
  );
}

// ─── Collapsible Layer ────────────────────────────────────────────────────────
function Layer({ icon, title, subtitle, color, bg, border, found, foundMsg, children, defaultOpen=true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border:`1.5px solid ${found?"#6ee7b7":border}`, borderRadius:10, marginBottom:8, overflow:"hidden", transition:"border-color .2s" }}>
      <button onClick={() => setOpen(p => !p)} style={{ width:"100%", background:found?"linear-gradient(135deg,#ecfdf5,#d1fae5)":bg, border:"none", padding:"8px 12px", cursor:"pointer", display:"flex", alignItems:"center", gap:9, transition:"background .2s" }}>
        <div style={{ width:26, height:26, borderRadius:7, background:found?"#6ee7b7":color+"22", display:"flex", alignItems:"center", justifyContent:"center", color:found?"#065f46":color, flexShrink:0 }}>{icon}</div>
        <div style={{ textAlign:"left", flex:1, minWidth:0 }}>
          <div style={{ fontSize:11, fontWeight:800, color:found?"#065f46":"#374151" }}>{title}</div>
          <div style={{ fontSize:9, color:found?"#059669":"#9ca3af", fontWeight:500 }}>{found?foundMsg:subtitle}</div>
        </div>
        {found && (<span style={{ fontSize:9, background:"#059669", color:"#fff", borderRadius:5, padding:"1px 6px", fontWeight:700, marginRight:4 }}>AUTO-FILLED</span>)}
        <span style={{ color:"#9ca3af", display:"flex", alignItems:"center" }}>{open?<ChevronUp size={13}/>:<ChevronDown size={13}/>}</span>
      </button>
      {open && (<div className="layer-body" style={{ padding:"10px 12px 10px", background:"#fff" }}>{children}</div>)}
    </div>
  );
}

function SL({ label, color="#6366f1" }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6, marginTop:2 }}>
      <span style={{ fontSize:9, fontWeight:800, color, textTransform:"uppercase", letterSpacing:.8, whiteSpace:"nowrap" }}>{label}</span>
      <div style={{ flex:1, height:1, background:`${color}30` }} />
    </div>
  );
}

function DraftBadge({ show }) {
  if (!show) return null;
  return (
    <span style={{ fontSize:10, color:"#6366f1", fontWeight:600, display:"flex", alignItems:"center", gap:3, animation:"vehFade .2s ease" }}>
      <span style={{ width:11, height:11 }}>{Icon.save}</span> Draft saved
    </span>
  );
}

// ─── Format Hint Banner ───────────────────────────────────────────────────────
function FormatHint({ idType }) {
  const rule = ID_FORMAT[idType];
  if (!rule) return null;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:6, padding:"4px 10px", marginBottom:6, fontSize:9.5, color:"#1d4ed8", fontWeight:500 }}>
      <span style={{ fontSize:11 }}>ℹ️</span>
      <span>{rule.hint}</span>
    </div>
  );
}

// ─── Vehicle Format Hint ──────────────────────────────────────────────────────
function VehicleFormatHint({ value }) {
  const err = value.length >= 4 ? validateVehicleNumber(value) : null;
  if (!err && !value) return (
    <div style={{ fontSize:9, color:"#6b7280", marginTop:2 }}>Format: SS NN LLL NNNN — e.g. <code style={{ background:"#f3f4f6", padding:"0 3px", borderRadius:3 }}>RJ 14 AB 1234</code></div>
  );
  if (err && value.length >= 4) return (
    <div className="fmt-err" style={{ fontSize:9, color:"#dc2626", marginTop:2, fontWeight:600 }}>⚠ {err}</div>
  );
  if (!err && value.length >= 8) return (
    <div style={{ fontSize:9, color:"#059669", marginTop:2, fontWeight:600 }}>✓ {displayVehicleNumber(value)}</div>
  );
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CreateVehicleModal({ open, onClose, onRefresh }) {
  const user = (() => { try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; } })();

  const [activeTab, setActiveTab]       = useState(() => lsGet(LS_TAB, "internal"));
  const [factories, setFactories]       = useState([]);
  const [fetchingFactories, setFF]      = useState(false);
  const [internalForm, _setInternal]    = useState(() => lsGet(LS_INTERNAL, DEFAULT_INTERNAL));
  const [externalForm, _setExternal]    = useState(() => lsGet(LS_EXTERNAL, DEFAULT_EXTERNAL));
  const [errors, setErrors]             = useState({});
  const [submitting, setSubmitting]     = useState(false);
  const [autoSwitched, setAutoSwitched] = useState(null);
  const [draftSaved, setDraftSaved]     = useState(false);
  const [hasDraft, setHasDraft]         = useState({ internal:false, external:false });
  const [driverLookup, setDL]           = useState({ loading:false, found:false, foundBy:null });
  const [vehicleLookup, setVL]          = useState({ loading:false, found:false });
  const draftTimer = useRef(null);
  const ALL_CUSTOMERS = [...CUSTOMER, ...SUPPLIERS.sort((a,b) => a.v.localeCompare(b.v))];

  const checkDraft = useCallback((intForm, extForm) => {
    const hasData = (form, defaults) =>
      Object.keys(defaults).some(k => {
        if (typeof defaults[k] === "boolean") return form[k] !== defaults[k];
        return form[k] && form[k] !== defaults[k];
      });
    setHasDraft({ internal:hasData(intForm, DEFAULT_INTERNAL), external:hasData(extForm, DEFAULT_EXTERNAL) });
  }, []);

  const setInternalForm = useCallback(updater => {_setInternal(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      lsSet(LS_INTERNAL, next); flashDraft();
      checkDraft(next, lsGet(LS_EXTERNAL, DEFAULT_EXTERNAL)); return next;
    });
  }, [checkDraft]);

  const setExternalForm = useCallback(updater => {_setExternal(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      lsSet(LS_EXTERNAL, next); flashDraft();
      checkDraft(lsGet(LS_INTERNAL, DEFAULT_INTERNAL), next); return next;
    });
  }, [checkDraft]);

  const flashDraft = () => {
    setDraftSaved(true);
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => setDraftSaved(false), 2000);
  };

  useEffect(() => { lsSet(LS_TAB, activeTab); }, [activeTab]);
  useEffect(() => {
    if (!open) return;
    const si = lsGet(LS_INTERNAL, DEFAULT_INTERNAL);
    const se = lsGet(LS_EXTERNAL, DEFAULT_EXTERNAL);
    const st = lsGet(LS_TAB, "internal");
    _setInternal(si); _setExternal(se); setActiveTab(st); checkDraft(si, se);
  }, [open, checkDraft]);

  useEffect(() => {
    if (!open) return;
    setFF(true);
    api.get("/factories")
      .then(res => setFactories(res.data?.factories || res.data || []))
      .catch(() => message.error("Could not load factories"))
      .finally(() => setFF(false));
  }, [open]);

  // ── Driver Lookup ──────────────────────────────────────────────────────────
  const lookupDriver = useCallback(
    debounce(async (value, field, currentTab) => {
      if (field === "driverContact" && value.length < 10) return;
      if (field === "driverIdNumber" && value.length < 4) return;
      setDL({ loading:true, found:false, foundBy:null });
      try {
        const res = await api.get(`/lookup`, { params:{ [field]:value } });
        const d = res.data?.driver || res.data;
        if (d) {
          const patch = { driverName:d.driverName||"", driverContact:d.driverContact||"", driverIdType:d.driverIdType||"Aadhar", driverIdNumber:d.driverIdNumber||"", licenseNumber:d.licenseNumber||"" };
          if (currentTab==="internal") setInternalForm(p=>({...p,...patch}));
          else setExternalForm(p=>({...p,...patch}));
          setDL({ loading:false, found:true, foundBy:field });
        } else { setDL({ loading:false, found:false, foundBy:null }); }
      } catch { setDL({ loading:false, found:false, foundBy:null }); }
    }, 700),
    [setInternalForm, setExternalForm]
  );

  // ── Vehicle Lookup ─────────────────────────────────────────────────────────
  const lookupVehicle = useCallback(
    debounce(async (vehicleNumber, currentTab) => {
      if (!vehicleNumber || vehicleNumber.length < 4) return;
      setVL({ loading:true, found:false });
      try {
        const res = await api.get(`/vehicles/number/${vehicleNumber}`);
        const v = res.data?.vehicle || res.data;
        if (v) {
          const patch = { typeOfVehicle:v.typeOfVehicle||"truck", transporterName:v.transporterName||"", PUCExpiry:v.PUCExpiry?v.PUCExpiry.split("T")[0]:"" };
          if (v.type && v.type !== currentTab) {
            setActiveTab(v.type); setAutoSwitched(v.type);
            setTimeout(() => setAutoSwitched(null), 3000);
            if (v.type==="internal") setInternalForm(p=>({...p,...patch,vehicleNumber}));
            else setExternalForm(p=>({...p,...patch,vehicleNumber}));
          } else {
            if (currentTab==="internal") setInternalForm(p=>({...p,...patch}));
            else setExternalForm(p=>({...p,...patch}));
          }
          setVL({ loading:false, found:true });
        } else { setVL({ loading:false, found:false }); }
      } catch { setVL({ loading:false, found:false }); }
    }, 700),
    [setInternalForm, setExternalForm]
  );

  // ── Field handlers ─────────────────────────────────────────────────────────
  const setInternal = (k, v) => {
    setInternalForm(p => ({ ...p, [k]:v }));
    if (k==="vehicleNumber")  lookupVehicle(cleanVehicleNumber(v), "internal");
    if (k==="driverContact")  lookupDriver(v, "driverContact", "internal");
    if (k==="driverIdNumber") lookupDriver(v, "driverIdNumber", "internal");
    clearErr(k);
  };

  const setExternal = (k, v) => {
    setExternalForm(p => ({ ...p, [k]:v }));
    if (k==="vehicleNumber")  lookupVehicle(cleanVehicleNumber(v), "external");
    if (k==="driverContact")  lookupDriver(v, "driverContact", "external");
    if (k==="driverIdNumber") lookupDriver(v, "driverIdNumber", "external");
    clearErr(k);
  };

  const clearErr = k => setErrors(p => ({ ...p, [k]:"" }));

  // ── Validation ─────────────────────────────────────────────────────────────
  // Returns format errors for ID fields based on current idType
  const getFormatErrors = (form) => {
    const e = {};
    // Vehicle number
    const vehErr = validateVehicleNumber(form.vehicleNumber);
    if (form.vehicleNumber && vehErr) e.vehicleNumber = vehErr;
    // ID number
    const rule = ID_FORMAT[form.driverIdType];
    if (rule && form.driverIdNumber) {
      const idErr = rule.validate(form.driverIdNumber);
      if (idErr) e.driverIdNumber = idErr;
    }
    // License (always DL format)
    if (form.licenseNumber) {
      const dlErr = ID_FORMAT.DL.validate(form.licenseNumber);
      if (dlErr) e.licenseNumber = dlErr;
    }
    return e;
  };

  const validateInternal = () => {
    const e = {};
    if (!internalForm.driverName)           e.driverName = "Required";
    if (!internalForm.vehicleNumber)         e.vehicleNumber = "Required";
    if (!internalForm.destinationFactoryId) e.destinationFactoryId = "Required";
    if (!internalForm.purpose)              e.purpose = "Required";
    if (!internalForm.materialType)         e.materialType = "Required";
    const fmtErr = getFormatErrors(internalForm);
    const merged = { ...e, ...fmtErr };
    setErrors(merged); return !Object.keys(merged).length;
  };

  const validateExternal = () => {
    const e = {};
    if (!externalForm.driverName)   e.driverName = "Required";
    if (!externalForm.vehicleNumber) e.vehicleNumber = "Required";
    if (!externalForm.purpose)      e.purpose = "Required";
    if (!externalForm.materialType) e.materialType = "Required";
    if (externalForm.isInternalShifting && !externalForm.destinationFactoryId) e.destinationFactoryId = "Required";
    const fmtErr = getFormatErrors(externalForm);
    const merged = { ...e, ...fmtErr };
    setErrors(merged); return !Object.keys(merged).length;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmitInternal = async () => {
    if (!validateInternal()) return message.error("Please fix errors");
    setSubmitting(true);
    try {
      await api.post("/new/internal-trip", { ...internalForm, vehicleNumber:cleanVehicleNumber(internalForm.vehicleNumber), sourceFactoryId:user.factory?._id, status:"inside_factory" });
      message.success("Internal vehicle entry created");
      onRefresh(); handleClose();
    } catch (e) { message.error(e.response?.data?.message||"Failed"); }
    finally { setSubmitting(false); }
  };

  const handleSubmitExternal = async () => {
    if (!validateExternal()) return message.error("Please fix errors");
    setSubmitting(true);
    try {
      await api.post("/new/external-trip", { ...externalForm, vehicleNumber:cleanVehicleNumber(externalForm.vehicleNumber), sourceFactoryId:user.factory?._id });
      message.success("External vehicle entry created — awaiting gate check-in");
      onRefresh(); handleClose();
    } catch (e) { message.error(e.response?.data?.message||"Failed"); }
    finally { setSubmitting(false); }
  };

  const handleClose = () => {
    onClose();
    _setInternal(DEFAULT_INTERNAL); lsSet(LS_INTERNAL, DEFAULT_INTERNAL);
    _setExternal(DEFAULT_EXTERNAL); lsSet(LS_EXTERNAL, DEFAULT_EXTERNAL);
    lsDel(LS_TAB);
    setErrors({}); setVL({ loading:false, found:false }); setDL({ loading:false, found:false, foundBy:null });
    setAutoSwitched(null); setHasDraft({ internal:false, external:false });
  };

  // ── Style tokens ───────────────────────────────────────────────────────────
  const g2  = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 };
  const g3  = { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:8 };
  const col = { display:"flex", flexDirection:"column", gap:2 };
  const LBL = { fontSize:10, fontWeight:600, color:"#4b5563" };
  const ERR = { fontSize:8.5, color:"#dc2626", marginTop:1 };
  const IB  = { borderRadius:7, padding:"6px 9px", fontSize:12, outline:"none", background:"#fafafa", color:"#111", width:"100%", boxSizing:"border-box", transition:"border-color .15s,box-shadow .15s", fontFamily:"inherit", height:30 };

  const VEHICLE_TYPES  = [{ v:"truck",l:"Truck"},{v:"miniTruck",l:"Mini Truck"},{v:"containerTruck",l:"Container Truck"},{v:"mixerTruck",l:"Mixer Truck"},{v:"waterTanker",l:"Water Tanker"},{v:"car",l:"Car"}];
  const ID_TYPES       = [{ v:"Aadhar",l:"Aadhar"},{v:"PAN",l:"PAN"},{v:"DL",l:"Driving Licence"}];
  const MATERIAL_TYPES = [{ v:"RM",l:"RM – Raw Material"},{v:"FG",l:"FG – Finished Goods"},{v:"Scrap",l:"Scrap"},{v:"NewMachines",l:"New Machines"},{v:"Others",l:"Others"}];
  const PURPOSE_OPTS   = [{ v:"Pickup",l:"Pickup"},{v:"Delivery",l:"Delivery"}];
  const PASS_TYPE_OPTS = [{ v:"Incoming",l:"Incoming"},{v:"Outgoing",l:"Outgoing"}];
  const factoryOpts    = factories.filter(f=>f._id!==user.factory?._id).map(f=>({v:f._id,l:`${f.name} – ${f.location}`}));

  // ── Field builders ─────────────────────────────────────────────────────────
  const inp = (key, label, value, onChange, type="text", placeHolder, req=false, activeIdType=null) => {
    const isDriverLookupField  = key==="driverContact"||key==="driverIdNumber";
    const isVehicleLookupField = key==="vehicleNumber";
    const showSpinner = (isDriverLookupField&&driverLookup.loading)||(isVehicleLookupField&&vehicleLookup.loading);
    const showSearch  = (isDriverLookupField||isVehicleLookupField)&&!showSpinner;

    // ── Determine placeholder, maxLength for format-controlled fields ──
    let placeholder = placeHolder;
    let maxLen;
    if (key==="driverIdNumber" && activeIdType && ID_FORMAT[activeIdType]) {
      placeholder = ID_FORMAT[activeIdType].placeholder;
      maxLen = key==="driverIdNumber" && activeIdType==="DL"
        ? 19   // with dashes: SS-RR-YYYY-SSSSSSS = 18 chars
        : ID_FORMAT[activeIdType].maxRaw;
    }
    if (key==="licenseNumber") { placeholder = ID_FORMAT.DL.placeholder; maxLen = 19; }
    if (key==="vehicleNumber") { placeholder = "MH 12 AB 1234"; maxLen = 13; }
    if (key==="driverContact") { maxLen = 10; }

    const handleChange = (e) => {
      let val = e.target.value;

      if (key==="driverContact") {
        val = val.replace(/\D/g,"").slice(0,10);
      } else if (key==="vehicleNumber") {
        // allow spaces/dashes during input, clean on blur/submit
        val = val.replace(/[^A-Z0-9\s-]/gi,"").toUpperCase().slice(0,13);
      } else if (key==="driverIdNumber" && activeIdType) {
        const rule = ID_FORMAT[activeIdType];
        if (rule) val = rule.clean(val);
      } else if (key==="licenseNumber") {
        val = ID_FORMAT.DL.clean(val);
      } else {
        val = val.toUpperCase();
      }
      onChange(key, val);
      clearErr(key);
    };

    return (
      <div style={col}>
        <label style={LBL}>{label}{req&&<span style={{ color:"#6366f1",marginLeft:2 }}>*</span>}</label>
        <div style={{ display:"flex", alignItems:"center", border:errors[key]?"1.5px solid #dc2626":"1.5px solid #e5e7eb", borderRadius:6, overflow:"hidden", position:"relative" }}>
          {key==="driverContact" && (
            <span style={{ padding:"0px 8px", background:"#f3f4f6", borderRight:"1px solid #e5e7eb", fontSize:13, color:"#374151", height:"100%", display:"flex", alignItems:"center" }}>+91</span>
          )}
          <input
            type={key==="driverContact"?"text":type}
            inputMode={key==="driverContact"?"numeric":"text"}
            value={value}
            maxLength={maxLen}
            onChange={handleChange}
            placeholder={placeholder}
            className="veh-inp"
            style={{ ...IB, border:"none", flex:1, paddingRight:(isDriverLookupField||isVehicleLookupField)?28:undefined }}
          />
          {(showSpinner||showSearch) && (
            <span style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", width:13, height:13, color:showSpinner?"#6366f1":"#9ca3af" }}>
              {showSpinner?Icon.spinner:Icon.search}
            </span>
          )}
        </div>
        {/* Inline format error */}
        {errors[key] && (
          <span className="fmt-err" style={ERR}>⚠ {errors[key]}</span>
        )}
        {/* Vehicle number live hint */}
        {key==="vehicleNumber" && !errors[key] && <VehicleFormatHint value={value} />}
        {/* ID number live validation */}
        {key==="driverIdNumber" && !errors[key] && activeIdType && (() => {
          const rule = ID_FORMAT[activeIdType];
          if (!rule || !value) return null;
          const err = rule.validate(value);
          if (err && value.length >= 4) return <span className="fmt-err" style={ERR}>⚠ {err}</span>;
          if (!err) return <span style={{ fontSize:9, color:"#059669", marginTop:2, fontWeight:600 }}>✓ Valid {rule.label} number</span>;
          return null;
        })()}
        {/* DL / license live validation */}
        {key==="licenseNumber" && !errors[key] && (() => {
          if (!value) return null;
          const err = ID_FORMAT.DL.validate(value);
          if (err && value.length >= 4) return <span className="fmt-err" style={ERR}>⚠ {err}</span>;
          if (!err) return <span style={{ fontSize:9, color:"#059669", marginTop:2, fontWeight:600 }}>✓ Valid DL number</span>;
          return null;
        })()}
      </div>
    );
  };

  const sel = (key, label, value, onChange, options, req=false) => (
    <div style={col}>
      <label style={LBL}>{label}{req&&<span style={{ color:"#6366f1",marginLeft:2 }}>*</span>}</label>
      <select value={value} onChange={e=>{ onChange(key,e.target.value); clearErr(key); }} className="veh-inp"
        style={{ ...IB, border:errors[key]?"1.5px solid #dc2626":"1.5px solid #e5e7eb", cursor:"pointer" }}
      >
        <option value="" hidden>Select…</option>
        {options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      {errors[key]&&<span style={ERR}>{errors[key]}</span>}
    </div>
  );

  const submitRow = (label, onClick, gradient) => (
    <div style={{ display:"flex", alignItems:"center", gap:8, paddingTop:10, borderTop:"1px solid #f0f0f0", marginTop:4, flexShrink:0 }}>
      <button className="veh-btn-p" onClick={onClick} disabled={submitting}
        style={{ background:gradient, color:"#fff", border:"none", borderRadius:8, padding:"7px 18px", fontWeight:700, fontSize:11.5, cursor:submitting?"not-allowed":"pointer", opacity:submitting?0.7:1, display:"flex", alignItems:"center", gap:5, boxShadow:"0 2px 8px rgba(0,0,0,.14)" }}>
        <span style={{ width:12, height:12 }}>{submitting?Icon.spinner:Icon.check}</span>{label}
      </button>
      <button className="veh-btn-c" onClick={handleClose} disabled={submitting}
        style={{ background:"#f3f4f6", color:"#374151", border:"none", borderRadius:8, padding:"7px 14px", fontWeight:600, fontSize:11.5, cursor:"pointer" }}>
        Cancel
      </button>
      <div style={{ marginLeft:"auto" }}><DraftBadge show={draftSaved} /></div>
    </div>
  );

  const supplierOptions = SUPPLIERS.map(s=>({value:s.v,label:s.l}));

  // ── Driver Layer ──────────────────────────────────────────────────────────
  const renderDriverLayer = (form, onChange) => (
    <Layer
      icon={<User size={13}/>} title="Driver Details"
      subtitle="Lookup by phone or ID — or enter manually"
      color="#6366f1" bg="linear-gradient(135deg,#eef2ff,#f5f3ff)" border="#e0e7ff"
      found={driverLookup.found}
      foundMsg={`Driver found via ${driverLookup.foundBy==="driverContact"?"phone number":"ID number"} — fields auto-filled`}
      defaultOpen={true}
    >
      {/* Format hint for current ID type */}
      <FormatHint idType={form.driverIdType} />

      <div style={g3}>
        {inp("driverContact",  "Phone Number", form.driverContact,  onChange, "text", undefined, false, null)}
        {inp("driverIdNumber", "ID Number",    form.driverIdNumber, onChange, "text", undefined, false, form.driverIdType)}
        {inp("licenseNumber",  "Licence No.",  form.licenseNumber,  onChange, "text", undefined, false, null)}
      </div>
      <div style={g2}>
        {inp("driverName",   "Driver Name", form.driverName,   onChange, "text", undefined, true, null)}
        {sel("driverIdType", "ID Type",     form.driverIdType, onChange, ID_TYPES)}
      </div>
      {!driverLookup.found && (form.driverContact.length===10||form.driverIdNumber.length>=4) && (
        <div style={{ background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:6, padding:"5px 10px", fontSize:10, color:"#92400e", fontWeight:500 }}>
          ⚠️ Driver not found — a new driver record will be created on submit.
        </div>
      )}
    </Layer>
  );

  // ── Vehicle Layer ─────────────────────────────────────────────────────────
  const renderVehicleLayer = (form, onChange) => (
    <Layer
      icon={<Car size={13}/>} title="Vehicle Details"
      subtitle="Lookup by vehicle number — or enter manually"
      color="#0891b2" bg="linear-gradient(135deg,#ecfeff,#cffafe)" border="#a5f3fc"
      found={vehicleLookup.found} foundMsg="Vehicle found — details auto-filled"
      defaultOpen={true}
    >
      <div style={g3}>
        {inp("vehicleNumber",   "Vehicle Number", form.vehicleNumber,   onChange, "text", undefined, true)}
        {sel("typeOfVehicle",   "Vehicle Type",   form.typeOfVehicle,   onChange, VEHICLE_TYPES)}
        {inp("transporterName", "Transporter",    form.transporterName, onChange)}
      </div>
      <div style={g2}>
        {inp("PUCExpiry", "PUC Expiry", form.PUCExpiry, onChange, "date")}
        <div/>
      </div>
      {!vehicleLookup.found && form.vehicleNumber.length>=4 && (
        <div style={{ background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:6, padding:"5px 10px", fontSize:10, color:"#92400e", fontWeight:500 }}>
          ⚠️ Vehicle not found — a new vehicle record will be created on submit.
        </div>
      )}
    </Layer>
  );

  return (
    <Modal open={open} onClose={handleClose} title="New Vehicle Entry">
      <TabBar active={activeTab} setActive={setActiveTab} autoSwitched={autoSwitched} hasDraft={hasDraft} />

      {/* ── INTERNAL TAB ── */}
      {activeTab==="internal" && (
        <div className="veh-sec">
          <div style={{ background:"linear-gradient(135deg,#eef2ff,#e0e7ff)", borderRadius:8, padding:"6px 11px", marginBottom:9, fontSize:10, color:"#4338ca", fontWeight:500, display:"flex", alignItems:"center", gap:5 }}>
            <Factory size={12}/> Internal vehicles default to <code style={{ background:"rgba(99,102,241,.12)", padding:"0 5px", borderRadius:3, marginLeft:2 }}>inside_factory</code> status.
          </div>
          {renderDriverLayer(internalForm, setInternal)}
          {renderVehicleLayer(internalForm, setInternal)}
          <Layer icon={<ClipboardList size={13}/>} title="Trip Details" subtitle="Destination, purpose and material info"
            color="#7c3aed" bg="linear-gradient(135deg,#faf5ff,#ede9fe)" border="#e9d5ff"
            found={false} foundMsg="" defaultOpen={true}
          >
            <div style={g3}>
              {sel("destinationFactoryId","Destination Factory",internalForm.destinationFactoryId,setInternal,fetchingFactories?[{v:"",l:"Loading…"}]:factoryOpts,true)}
              {sel("purpose","Purpose",internalForm.purpose,setInternal,PURPOSE_OPTS,true)}
              {sel("materialType","Material Type",internalForm.materialType,setInternal,MATERIAL_TYPES,true)}
            </div>
          </Layer>
          {submitRow("Create Internal Entry", handleSubmitInternal, "linear-gradient(135deg,#6366f1,#4f46e5)")}
        </div>
      )}

      {/* ── EXTERNAL TAB ── */}
      {activeTab==="external" && (
        <div className="veh-sec">
          <div style={{ background:"linear-gradient(135deg,#fffbeb,#fef3c7)", borderRadius:8, padding:"6px 11px", marginBottom:9, fontSize:10, color:"#92400e", fontWeight:500, display:"flex", alignItems:"center", gap:5 }}>
            <Truck size={12}/> External vehicles await <strong style={{ marginLeft:2 }}>gate check-in</strong>. Material type reveals extra fields.
          </div>
          {renderDriverLayer(externalForm, setExternal)}
          {renderVehicleLayer(externalForm, setExternal)}
          <Layer icon={<ClipboardList size={13}/>} title="Trip Details" subtitle="Purpose, material, internal shifting config"
            color="#d97706" bg="linear-gradient(135deg,#fffbeb,#fef3c7)" border="#fcd34d"
            found={false} foundMsg="" defaultOpen={true}
          >
            {/* Internal Shifting Toggle */}
            <div style={{ background:"linear-gradient(135deg,#f8faff,#eef2ff)", border:"1.5px solid #e0e7ff", borderRadius:10, padding:"8px 14px", marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 4px rgba(99,102,241,.07)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:externalForm.isInternalShifting?"#ede9fe":"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", transition:"background .2s" }}>
                  <Factory size={14} color={externalForm.isInternalShifting?"#6366f1":"#9ca3af"}/>
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:11.5, color:"#374151" }}>Internal Shifting</div>
                  <div style={{ fontSize:9.5, color:"#9ca3af", fontWeight:400 }}>Plant to Plant transfer</div>
                </div>
              </div>
              <div
                onClick={()=>setExternalForm(p=>({...p,isInternalShifting:!p.isInternalShifting}))}
                style={{ width:44, height:24, borderRadius:12, background:externalForm.isInternalShifting?"linear-gradient(135deg,#6366f1,#4f46e5)":"#e5e7eb", position:"relative", cursor:"pointer", transition:"background .25s", boxShadow:externalForm.isInternalShifting?"0 0 0 3px rgba(99,102,241,.2)":"none", flexShrink:0 }}
              >
                <div style={{ position:"absolute", width:18, height:18, background:"#fff", borderRadius:"50%", top:3, left:externalForm.isInternalShifting?23:3, transition:"left .25s cubic-bezier(.4,0,.2,1)", boxShadow:"0 1px 4px rgba(0,0,0,.25)" }}/>
              </div>
            </div>

            {externalForm.isInternalShifting && (
              <div style={{ ...g2, animation:"vehFade .18s ease", marginBottom:9 }}>
                {sel("passType","Pass Type",externalForm.passType,setExternal,PASS_TYPE_OPTS,true)}
                {sel("destinationFactoryId","Destination Factory",externalForm.destinationFactoryId,setExternal,fetchingFactories?[{v:"",l:"Loading…"}]:factoryOpts,true)}
              </div>
            )}

            <div style={g3}>
              {sel("source","Source Factory", externalForm.source, setExternal, ALL_CUSTOMERS, true)}
              {sel("purpose","Purpose" ,externalForm.purpose, setExternal, PURPOSE_OPTS,true)}
              {sel("materialType","Material Type", externalForm.materialType, setExternal, MATERIAL_TYPES,true)}
            </div>

            {externalForm.materialType==="RM" && (
              <div style={{ animation:"vehFade .18s ease" }}>
                <SL label="Raw Material Details" color="#059669"/>
                <div style={{ background:"#f0fdf4", border:"1.5px solid #bbf7d0", borderRadius:8, padding:"8px 10px", marginBottom:8 }}>
                  <div style={g3}>
                    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                      <label style={LBL}>Supplier</label>
                      <Select mode="tags" showSearch style={{ width:"100%", height:32 }} placeholder="Search or enter supplier"
                        value={externalForm.supplier?[externalForm.supplier]:[]}
                        onChange={(value)=>setExternal("supplier",value[0])}
                        options={supplierOptions}
                      />
                    </div>
                    {inp("material","Material Name",externalForm.material,setExternal)}
                    {inp("quantity","Quantity",externalForm.quantity,setExternal,"number")}
                  </div>
                  <div style={g2}>
                    {inp("invoiceNo","Invoice No.",externalForm.invoiceNo,setExternal)}
                    {inp("invoiceAmount","Invoice Amount (₹)",externalForm.invoiceAmount,setExternal,"number")}
                  </div>
                </div>
              </div>
            )}

            {externalForm.materialType==="FG" && (
              <div style={{ animation:"vehFade .18s ease" }}>
                <SL label="Finished Goods Details" color="#2563eb"/>
                <div style={{ background:"#eff6ff", border:"1.5px solid #bfdbfe", borderRadius:8, padding:"8px 10px", marginBottom:8 }}>
                  <div style={g2}>
                    {sel("customer","Customer",externalForm.customer,setExternal,CUSTOMER)}
                    {inp("invoiceNo","Invoice No.",externalForm.invoiceNo,setExternal)}
                  </div>
                  <div style={g2}>
                    {inp("quantity","Quantity",externalForm.quantity,setExternal,"number")}
                    {inp("invoiceAmount","Invoice Amount (₹)",externalForm.invoiceAmount,setExternal,"number")}
                  </div>
                </div>
              </div>
            )}

            {["Scrap", "NewMachines", "Others"].includes(externalForm.materialType) && (
              <div style={{ animation:"vehFade .18s ease" }}>
                <SL label="Additional Details" color="#7c3aed"/>
                <div style={{ background:"#faf5ff", border:"1.5px solid #e9d5ff", borderRadius:8, padding:"8px 10px", marginBottom:8 }}>
                  <div style={g2}>
                    {inp("material","Material / Description",externalForm.material,setExternal)}
                    {inp("quantity","Quantity",externalForm.quantity,setExternal,"number")}
                  </div>
                </div>
              </div>
            )}
          </Layer>
          {submitRow("Create External Entry", handleSubmitExternal, "linear-gradient(135deg,#f59e0b,#d97706)")}
        </div>
      )}
    </Modal>
  );
}

// ─── Debounce ─────────────────────────────────────────────────────────────────
function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}