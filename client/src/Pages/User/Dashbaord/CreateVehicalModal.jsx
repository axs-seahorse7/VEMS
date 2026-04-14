import { useState, useEffect, useCallback, useRef } from "react";
import api from "../../../../services/API/Api/api";
import { message, Select  } from "antd";
import { Factory, Truck } from "lucide-react";
const { Option } = Select;

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
  { v: "AIR LIQUIDE INDIA HOLDING PVT.LTD", l: "AIR LIQUIDE INDIA HOLDING PVT.LTD" },
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
]

const lsGet = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    const parsed = JSON.parse(v);
    // Merge with fallback so new fields added later don't go missing
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
};
const lsSet = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };
const lsDel = (...keys) => keys.forEach(k => { try { localStorage.removeItem(k); } catch {} });

// ─── Default Shapes ───────────────────────────────────────────────────────────
const DEFAULT_COMMON = {
  driverName: "", driverContact: "", driverIdType: "Aadhar",
  driverIdNumber: "", vehicleNumber: "", transporterName: "",
  typeOfVehicle: "truck", PUCExpiry: "",
};
const DEFAULT_INTERNAL = {
  ...DEFAULT_COMMON,
  destinationFactoryId: "", purpose: "", materialType: "",
};
const DEFAULT_EXTERNAL = {
  ...DEFAULT_COMMON,
  purpose: "", materialType: "", supplier: "", material: "",
  quantity: "", invoiceNo: "", invoiceAmount: "", customer: "",
  isInternalShifting: false, destinationFactoryId: "", passType: "Incoming",
};

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
        .veh-btn-p { transition:all .15s; }
        .veh-btn-p:hover:not(:disabled) { filter:brightness(1.08); transform:translateY(-1px); box-shadow:0 4px 12px rgba(0,0,0,.18); }
        .veh-btn-c { transition:background .15s; }
        .veh-btn-c:hover { background:#e5e7eb!important; }
        .veh-inp:focus { border-color:#6366f1!important; box-shadow:0 0 0 3px rgba(99,102,241,.12)!important; outline:none; }
        .veh-sec { animation:tabSlide .18s ease; }
        .veh-badge { animation:vehFade .25s ease; }
        .tab-pill { transition:all .22s cubic-bezier(.4,0,.2,1); position:relative; overflow:hidden; }
        .tab-pill::before { content:''; position:absolute; inset:0; opacity:0; transition:opacity .22s; }
        .tab-pill.active::before { opacity:1; }
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:#f9fafb} ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:8px}
      `}</style>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(10,10,20,.5)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: width, maxHeight: "94vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 90px rgba(0,0,0,.26), 0 0 0 1px rgba(99,102,241,.08)", animation: "vehIn .22s ease" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 20px 11px", background: "linear-gradient(135deg,#6366f1 0%,#4f46e5 60%,#4338ca 100%)", borderRadius: "18px 18px 0 0", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ width: 17, height: 17, color: "#fff" }}>{Icon.truck}</span>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: -.3 }}>{title}</h2>
                <p style={{ margin: 0, fontSize: 9.5, color: "rgba(255,255,255,.65)", fontWeight: 400 }}>All draft fields are auto-saved locally</p>
              </div>
            </div>
            <button onClick={onClose} style={{ border: "none", background: "rgba(255,255,255,.18)", cursor: "pointer", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", transition: "background .15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.28)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.18)"}
            >
              <span style={{ width: 13, height: 13 }}>{Icon.x}</span>
            </button>
          </div>
          <div style={{ overflowY: "auto", padding: "14px 18px 16px", flex: 1 }}>{children}</div>
        </div>
      </div>
    </>
  );
}

// ─── Premium Tab Bar ──────────────────────────────────────────────────────────
function TabBar({ active, setActive, autoSwitched, hasDraft }) {
  const tabs = [
    {
      key: "internal",
      label: "Internal Vehicle",
      sub: "Plant to plant transfer",
      icon: <Factory size={15} strokeWidth={2} />,
      gradient: "linear-gradient(135deg,#6366f1,#4f46e5)",
      activeBg: "linear-gradient(135deg,#eef2ff,#e0e7ff)",
      activeColor: "#4338ca",
      activeBorder: "#a5b4fc",
      iconBg: "#ede9fe",
      iconColor: "#6366f1",
    },
    {
      key: "external",
      label: "External Vehicle",
      sub: "Gate entry & check-in",
      icon: <Truck size={15} strokeWidth={2} />,
      gradient: "linear-gradient(135deg,#f59e0b,#d97706)",
      activeBg: "linear-gradient(135deg,#fffbeb,#fef3c7)",
      activeColor: "#92400e",
      activeBorder: "#fcd34d",
      iconBg: "#fef3c7",
      iconColor: "#d97706",
    },
  ];

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12, flexShrink: 0 }}>
      {tabs.map(t => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            className={`tab-pill${isActive ? " active" : ""}`}
            onClick={() => setActive(t.key)}
            style={{
              flex: 1,
              border: isActive ? `1.5px solid ${t.activeBorder}` : "1.5px solid #e5e7eb",
              background: isActive ? t.activeBg : "#fafafa",
              borderRadius: 10,
              padding: "9px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              transition: "all .22s cubic-bezier(.4,0,.2,1)",
              boxShadow: isActive ? `0 2px 12px ${t.activeBorder}55` : "none",
              position: "relative",
            }}
          >
            {/* Icon bubble */}
            <div style={{
              width: 32, height: 32, borderRadius: 9, flexShrink: 0,
              background: isActive ? t.iconBg : "#f3f4f6",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: isActive ? t.iconColor : "#9ca3af",
              transition: "all .22s",
              boxShadow: isActive ? `0 0 0 3px ${t.iconColor}18` : "none",
            }}>
              {t.icon}
            </div>

            {/* Text */}
            <div style={{ textAlign: "left", minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: isActive ? t.activeColor : "#6b7280", letterSpacing: -.1, transition: "color .22s" }}>
                {t.label}
              </div>
              <div style={{ fontSize: 9.5, color: isActive ? t.activeColor + "aa" : "#9ca3af", fontWeight: 500, transition: "color .22s" }}>
                {t.sub}
              </div>
            </div>

            {/* Draft dot */}
            {hasDraft[t.key] && (
              <div style={{ position: "absolute", top: 7, right: 9, width: 6, height: 6, borderRadius: "50%", background: "#6366f1", boxShadow: "0 0 0 2px #fff" }} title="Draft saved" />
            )}

            {/* AUTO badge */}
            {autoSwitched === t.key && (
              <span className="veh-badge" style={{ position: "absolute", top: -4, right: -4, background: "#6366f1", color: "#fff", fontSize: 7.5, fontWeight: 800, borderRadius: 6, padding: "1px 5px", letterSpacing: .4 }}>
                AUTO
              </span>
            )}

            {/* Active indicator bar */}
            {isActive && (
              <div style={{ position: "absolute", bottom: 0, left: "10%", width: "80%", height: 2, borderRadius: "2px 2px 0 0", background: t.gradient }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SL({ label, color = "#6366f1" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, marginTop: 2 }}>
      <span style={{ fontSize: 9, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: .8, whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: `${color}30` }} />
    </div>
  );
}

// ─── Lookup Banner ────────────────────────────────────────────────────────────
function LookupBanner({ found, vehicleNumber }) {
  if (!vehicleNumber || !found) return null;
  return (
    <div style={{ background: "linear-gradient(135deg,#ecfdf5,#d1fae5)", border: "1px solid #6ee7b7", borderRadius: 7, padding: "5px 11px", marginBottom: 8, fontSize: 10, color: "#065f46", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
      ✅ Vehicle found — details auto-filled.
    </div>
  );
}

// ─── Draft Badge ──────────────────────────────────────────────────────────────
function DraftBadge({ show }) {
  if (!show) return null;
  return (
    <span style={{ fontSize: 10, color: "#6366f1", fontWeight: 600, display: "flex", alignItems: "center", gap: 3, animation: "vehFade .2s ease" }}>
      <span style={{ width: 11, height: 11 }}>{Icon.save}</span> Draft saved
    </span>
  );
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
  const [vehicleLookup, setVL]          = useState({ loading: false, found: false });
  const [autoSwitched, setAutoSwitched] = useState(null);
  const [draftSaved, setDraftSaved]    = useState(false);

  // Track whether each tab has a non-empty draft
  const [hasDraft, setHasDraft] = useState({ internal: false, external: false });

  const draftTimer = useRef(null);

  // ── Check if a form has any meaningful content ────────────────────────────
  const checkDraft = useCallback((intForm, extForm) => {
    const hasData = (form, defaults) =>
      Object.keys(defaults).some(k => {
        if (typeof defaults[k] === "boolean") return form[k] !== defaults[k];
        return form[k] && form[k] !== defaults[k];
      });
    setHasDraft({
      internal: hasData(intForm, DEFAULT_INTERNAL),
      external: hasData(extForm, DEFAULT_EXTERNAL),
    });
  }, []);

  // ── Wrapped setters: persist to localStorage immediately on every change ──
  const setInternalForm = useCallback(updater => {
    _setInternal(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      lsSet(LS_INTERNAL, next);
      flashDraft();
      checkDraft(next, lsGet(LS_EXTERNAL, DEFAULT_EXTERNAL));
      return next;
    });
  }, [checkDraft]);

  const setExternalForm = useCallback(updater => {
    _setExternal(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      lsSet(LS_EXTERNAL, next);
      flashDraft();
      checkDraft(lsGet(LS_INTERNAL, DEFAULT_INTERNAL), next);
      return next;
    });
  }, [checkDraft]);

  const flashDraft = () => {
    setDraftSaved(true);
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => setDraftSaved(false), 2000);
  };

  // Persist active tab
  useEffect(() => { lsSet(LS_TAB, activeTab); }, [activeTab]);

  // On open: re-hydrate from localStorage and check for existing drafts
  useEffect(() => {
    if (!open) return;
    const savedInternal = lsGet(LS_INTERNAL, DEFAULT_INTERNAL);
    const savedExternal = lsGet(LS_EXTERNAL, DEFAULT_EXTERNAL);
    const savedTab      = lsGet(LS_TAB, "internal");
    _setInternal(savedInternal);
    _setExternal(savedExternal);
    setActiveTab(savedTab);
    checkDraft(savedInternal, savedExternal);
  }, [open, checkDraft]);

  // ── Fetch Factories ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setFF(true);
    api.get("/factories")
      .then(res => setFactories(res.data?.factories || res.data || []))
      .catch(() => message.error("Could not load factories"))
      .finally(() => setFF(false));
  }, [open]);

  // ── Vehicle Lookup ─────────────────────────────────────────────────────────
  const lookupVehicle = useCallback(
    debounce(async (vehicleNumber, currentTab) => {
      if (!vehicleNumber || vehicleNumber.length < 4) return;
      setVL({ loading: true, found: false });
      try {
        const res = await api.get(`/vehicles/number/${vehicleNumber}`);
        const v = res.data?.vehicle || res.data;
        if (v) {
          const patch = {
            driverName: v.driverName || "", driverContact: v.driverContact || "",
            driverIdType: v.driverIdType || "Aadhar", driverIdNumber: v.driverIdNumber || "",
            transporterName: v.transporterName || "", typeOfVehicle: v.typeOfVehicle || "truck",
            PUCExpiry: v.PUCExpiry ? v.PUCExpiry.split("T")[0] : "",
          };
          if (v.type && v.type !== currentTab) {
            setActiveTab(v.type);
            setAutoSwitched(v.type);
            setTimeout(() => setAutoSwitched(null), 3000);
            if (v.type === "internal") setInternalForm(p => ({ ...p, ...patch, vehicleNumber }));
            else                       setExternalForm(p => ({ ...p, ...patch, vehicleNumber }));
          } else {
            if (currentTab === "internal") setInternalForm(p => ({ ...p, ...patch }));
            else                           setExternalForm(p => ({ ...p, ...patch }));
          }
          setVL({ loading: false, found: true });
        } else {
          setVL({ loading: false, found: false });
        }
      } catch {
        setVL({ loading: false, found: false });
      }
    }, 700),
    [setInternalForm, setExternalForm]
  );

  // ── Field handlers ─────────────────────────────────────────────────────────
  const setInternal = (k, v) => { setInternalForm(p => ({ ...p, [k]: v })); if (k === "vehicleNumber") lookupVehicle(v, "internal"); clearErr(k); };
  const setExternal = (k, v) => { setExternalForm(p => ({ ...p, [k]: v })); if (k === "vehicleNumber") lookupVehicle(v, "external"); clearErr(k); };
  const clearErr    = k => setErrors(p => ({ ...p, [k]: "" }));

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateInternal = () => {
    const e = {};
    if (!internalForm.driverName)           e.driverName = "Required";
    if (!internalForm.vehicleNumber)         e.vehicleNumber = "Required";
    if (!internalForm.destinationFactoryId) e.destinationFactoryId = "Required";
    if (!internalForm.purpose)              e.purpose = "Required";
    if (!internalForm.materialType)         e.materialType = "Required";
    setErrors(e); return !Object.keys(e).length;
  };
  const validateExternal = () => {
    const e = {};
    if (!externalForm.driverName)   e.driverName = "Required";
    if (!externalForm.vehicleNumber) e.vehicleNumber = "Required";
    if (!externalForm.purpose)      e.purpose = "Required";
    if (!externalForm.materialType) e.materialType = "Required";
    if (externalForm.isInternalShifting && !externalForm.destinationFactoryId) e.destinationFactoryId = "Required";
    setErrors(e); return !Object.keys(e).length;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmitInternal = async () => {
    if (!validateInternal()) return message.error("Please fix errors");
    setSubmitting(true);
    try {
      await api.post("/new/internal-trip", { ...internalForm, sourceFactoryId: user.factory?._id, status: "inside_factory" });
      message.success("Internal vehicle entry created");
      onRefresh(); handleClose();
    } catch (e) { message.error(e.response?.data?.message || "Failed"); }
    finally { setSubmitting(false); }
  };

  const handleSubmitExternal = async () => {
    if (!validateExternal()) return message.error("Please fix errors");
    setSubmitting(true);
    try {
      await api.post("/new/external-trip", { ...externalForm, sourceFactoryId: user.factory?._id });
      message.success("External vehicle entry created — awaiting gate check-in");
      onRefresh(); handleClose();
    } catch (e) { message.error(e.response?.data?.message || "Failed"); }
    finally { setSubmitting(false); }
  };

  // ── Close: clears drafts ───────────────────────────────────────────────────
  const handleClose = () => {
    onClose();
    _setInternal(DEFAULT_INTERNAL); lsSet(LS_INTERNAL, DEFAULT_INTERNAL);
    _setExternal(DEFAULT_EXTERNAL); lsSet(LS_EXTERNAL, DEFAULT_EXTERNAL);
    lsDel(LS_TAB);
    setErrors({}); setVL({ loading: false, found: false }); setAutoSwitched(null);
    setHasDraft({ internal: false, external: false });
  };

  // ── Style tokens ───────────────────────────────────────────────────────────
  const g2  = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 };
  const g3  = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 };
  const col = { display: "flex", flexDirection: "column", gap: 2 };
  const LBL = { fontSize: 10, fontWeight: 600, color: "#4b5563" };
  const ERR = { fontSize: 8.5, color: "#dc2626", marginTop: 1 };
  const IB  = { borderRadius: 7, padding: "6px 9px", fontSize: 12, outline: "none", background: "#fafafa", color: "#111", width: "100%", boxSizing: "border-box", transition: "border-color .15s,box-shadow .15s", fontFamily: "inherit", height: 30 };

  const VEHICLE_TYPES  = [{ v: "truck", l: "Truck" }, { v: "miniTruck", l: "Mini Truck" }, { v: "containerTruck", l: "Container Truck" }, { v: "mixerTruck", l: "Mixer Truck" }, { v: "waterTanker", l: "Water Tanker" }, { v: "car", l: "Car" }];
  const ID_TYPES       = [{ v: "Aadhar", l: "Aadhar" }, { v: "PAN", l: "PAN" }, { v: "DL", l: "Driving Licence" }];
  const MATERIAL_TYPES = [{ v: "RM", l: "RM – Raw Material" }, { v: "FG", l: "FG – Finished Goods" }, { v: "Scrap", l: "Scrap" }, { v: "NewMachines", l: "New Machines" }, { v: "Others", l: "Others" }];
  const PURPOSE_OPTS   = [{ v: "Pickup", l: "Pickup" }, { v: "Delivery", l: "Delivery" }];
  const PASS_TYPE_OPTS = [{ v: "Incoming", l: "Incoming" }, { v: "Outgoing", l: "Outgoing" }];
  const factoryOpts    = factories.map(f => ({ v: f._id, l: `${f.name} – ${f.location}` }));

  // ── Field builders ─────────────────────────────────────────────────────────
  const inp = (key, label, value, onChange, type = "text", placeHolder, req = false) =>{ 
    const ruleKey = {
      driverContact: {maxLength: 10},
    }
    const placeholderRule = {
      driverContact: " _ _ _ _ _ _ _ _ _ _ ",
      driverName: "Enter Driver Name",
      driverIdNumber: "Enter ID Number",
      transporterName: "Enter Transporter Name",
      vehicleNumber: "e.g. MH12AB1234",
    }

    const fieldRule = ruleKey[key] || {};

   return (
    <div style={{ ...col }}>
      <label style={LBL}>
        {label}
        {req && <span style={{ color: "#6366f1", marginLeft: 2 }}>*</span>}
      </label>

      <div style={{
        display: "flex",
        alignItems: "center",
        border: errors[key] ? "1.5px solid #dc2626" : "1.5px solid #e5e7eb",
        borderRadius: 6,
        overflow: "hidden"
      }}>
        
        {/* Prefix */}
        {key === "driverContact" && (
          <span style={{
            padding: "0px 8px",
            background: "#f3f4f6",
            borderRight: "1px solid #e5e7eb",
            fontSize: 13,
            color: "#374151",
            height: "100%",
            display: "flex",
            alignItems: "center",
          }}>
            +91
          </span>
        )}

        {/* Input */}
        <input
          type={key === "driverContact" ? "text" : type}
          inputMode={key === "driverContact" ? "numeric" : "text"}
          value={value}
          maxLength={fieldRule.maxLength || undefined}
          onChange={e => {
            let val = e.target.value;

            if (key === "driverContact") {
              val = val.replace(/\D/g, "").slice(0, 10);
            } else {
              val = val.toUpperCase();
            }

            onChange(key, val);
            clearErr(key);
          }}
          placeholder={placeholderRule[key] || placeHolder}
          className=""
          style={{
            ...IB,
            border: "none",
            flex: 1
          }}
        />
      </div>

      {errors[key] && <span style={ERR}>{errors[key]}</span>}
    </div>
  )};

  const sel = (key, label, value, onChange, options, req = false) => (
    <div style={col}>
      <label style={LBL}>{label}{req && <span style={{ color: "#6366f1", marginLeft: 2 }}>*</span>}</label>
      <select value={value}
        onChange={e => { onChange(key, e.target.value); clearErr(key); }}
        className="veh-inp"
        style={{ ...IB, border: errors[key] ? "1.5px solid #dc2626" : "1.5px solid #e5e7eb", cursor: "pointer" }}
      >
        <option value="" hidden>Select…</option>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      {errors[key] && <span style={ERR}>{errors[key]}</span>}
    </div>
  );

  const vnField = (form, onChange) => (
    <div style={col}>
      <label style={LBL}>Vehicle Number<span style={{ color: "#6366f1", marginLeft: 2 }}>*</span></label>
      <div style={{ position: "relative" }}>
        <input type="text" value={form.vehicleNumber}
          onChange={e => { onChange("vehicleNumber", e.target.value.toUpperCase()); }}
          placeholder="e.g. MH12AB1234" className="veh-inp"
          style={{ ...IB, border: errors.vehicleNumber ? "1.5px solid #dc2626" : "1.5px solid #e5e7eb", paddingRight: 28, textTransform: "uppercase" }}
        />
        <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: vehicleLookup.loading ? "#6366f1" : "#9ca3af" }}>
          {vehicleLookup.loading ? Icon.spinner : Icon.search}
        </span>
      </div>
      {errors.vehicleNumber && <span style={ERR}>{errors.vehicleNumber}</span>}
    </div>
  );

  const submitRow = (label, onClick, gradient) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 10, borderTop: "1px solid #f0f0f0", marginTop: 4, flexShrink: 0 }}>
      <button className="veh-btn-p" onClick={onClick} disabled={submitting}
        style={{ background: gradient, color: "#fff", border: "none", borderRadius: 8, padding: "7px 18px", fontWeight: 700, fontSize: 11.5, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, display: "flex", alignItems: "center", gap: 5, boxShadow: "0 2px 8px rgba(0,0,0,.14)" }}>
        <span style={{ width: 12, height: 12 }}>{submitting ? Icon.spinner : Icon.check}</span>
        {label}
      </button>
      <button className="veh-btn-c" onClick={handleClose} disabled={submitting}
        style={{ background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, padding: "7px 14px", fontWeight: 600, fontSize: 11.5, cursor: "pointer" }}>
        Cancel
      </button>
      <div style={{ marginLeft: "auto" }}><DraftBadge show={draftSaved} /></div>
    </div>
  );

  const supplierOptions = SUPPLIERS.map((s) => ({
    value: s.v,
    label: s.l,
  }));

  console.log(SUPPLIERS.length, supplierOptions.length);

  return (
    <Modal open={open} onClose={handleClose} title="New Vehicle Entry">
      <TabBar active={activeTab} setActive={setActiveTab} autoSwitched={autoSwitched} hasDraft={hasDraft} />

      {/* ── INTERNAL TAB ── */}
      {activeTab === "internal" && (
        <div className="veh-sec">
          <div style={{ background: "linear-gradient(135deg,#eef2ff,#e0e7ff)", borderRadius: 8, padding: "6px 11px", marginBottom: 9, fontSize: 10, color: "#4338ca", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
            <Factory size={12} /> Internal vehicles default to <code style={{ background: "rgba(99,102,241,.12)", padding: "0 5px", borderRadius: 3, marginLeft: 2 }}>inside_factory</code> status.
          </div>
          <LookupBanner found={vehicleLookup.found} vehicleNumber={internalForm.vehicleNumber} />

          <SL label="Driver & Vehicle" />
          <div style={g3}>
            {vnField(internalForm, setInternal)}
            {inp("driverName", "Driver Name",                   internalForm.driverName, setInternal, "text", true)}
            {inp("driverContact", "Contact",                    internalForm.driverContact, setInternal, "text", "+91 _ _ _ _ _ _ _ _ _ _ ")}
          </div>
          <div style={g3}>
            {sel("driverIdType", "ID Type",                     internalForm.driverIdType, setInternal, ID_TYPES)}
            {inp("driverIdNumber", "ID Number",                 internalForm.driverIdNumber, setInternal)}
            {inp("transporterName", "Transporter",              internalForm.transporterName, setInternal)}
          </div>
          <div style={g2}>
            {sel("typeOfVehicle", "Vehicle Type",               internalForm.typeOfVehicle, setInternal, VEHICLE_TYPES)}
            {inp("PUCExpiry", "PUC Expiry",                     internalForm.PUCExpiry, setInternal, "date")}
          </div>

          <SL label="Trip Details" color="#4f46e5" />
          <div style={g3}>
            {sel("destinationFactoryId", "Destination Factory", internalForm.destinationFactoryId, setInternal,
              fetchingFactories ? [{ v: "", l: "Loading…" }] :  factoryOpts, true)}
            {sel("purpose", "Purpose",                          internalForm.purpose, setInternal, PURPOSE_OPTS, true)}
            {sel("materialType", "Material Type",               internalForm.materialType, setInternal, MATERIAL_TYPES, true)}
          </div>

          {submitRow("Create Internal Entry", handleSubmitInternal, "linear-gradient(135deg,#6366f1,#4f46e5)")}
        </div>
      )}

      {/* ── EXTERNAL TAB ── */}
      {activeTab === "external" && (
        <div className="veh-sec">
          <div style={{ background: "linear-gradient(135deg,#fffbeb,#fef3c7)", borderRadius: 8, padding: "6px 11px", marginBottom: 9, fontSize: 10, color: "#92400e", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
            <Truck size={12} /> External vehicles await <strong style={{ marginLeft: 2 }}>gate check-in</strong>. Material type reveals extra fields.
          </div>
          <LookupBanner found={vehicleLookup.found} vehicleNumber={externalForm.vehicleNumber} />

          {/* ── Premium Internal Shifting Toggle ── */}
          <div style={{ background: "linear-gradient(135deg,#f8faff,#eef2ff)", border: "1.5px solid #e0e7ff", borderRadius: 10, padding: "8px 14px", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 4px rgba(99,102,241,.07)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: externalForm.isInternalShifting ? "#ede9fe" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .2s" }}>
                <Factory size={14} color={externalForm.isInternalShifting ? "#6366f1" : "#9ca3af"} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 11.5, color: "#374151" }}>Internal Shifting</div>
                <div style={{ fontSize: 9.5, color: "#9ca3af", fontWeight: 400 }}>Plant to Plant transfer</div>
              </div>
            </div>

            {/* Premium toggle switch */}
            <div
              onClick={() => setExternalForm(p => ({ ...p, isInternalShifting: !p.isInternalShifting }))}
              style={{
                width: 44,  height: 24, borderRadius: 12,
                background: externalForm.isInternalShifting? "linear-gradient(135deg,#6366f1,#4f46e5)" : "#e5e7eb",
                position:   "relative", cursor: "pointer",
                transition: "background .25s",
                boxShadow:  externalForm.isInternalShifting ? "0 0 0 3px rgba(99,102,241,.2)" : "none",
                flexShrink: 0,
              }}
            >
              <div style={{
                position:     "absolute",
                width: 18,    height: 18,
                background:   "#fff",
                borderRadius: "50%",
                top: 3,
                left: externalForm.isInternalShifting ? 23 : 3,
                transition: "left .25s cubic-bezier(.4,0,.2,1)",
                boxShadow: "0 1px 4px rgba(0,0,0,.25)",
              }} />
            </div>
          </div>

          {externalForm.isInternalShifting && (
            <div style={{ ...g2, animation: "vehFade .18s ease", marginBottom: 9 }}>
              {sel("passType", "Pass Type",         externalForm.passType, setExternal, PASS_TYPE_OPTS, true)}
              {sel("destinationFactoryId", "Destination Factory", externalForm.destinationFactoryId, setExternal,
                fetchingFactories ? [{ v: "", l: "Loading…" }] : factoryOpts, true)}
            </div>
          )}

          <SL label="Driver & Vehicle" />
          <div style={g3}>
            {vnField(externalForm, setExternal)}
            {inp("driverName", "Driver Name",                 externalForm.driverName, setExternal, "text", true)}
            {inp("driverContact", "Contact",                  externalForm.driverContact, setExternal, "text")}
          </div>
          <div style={g3}>
            {sel("driverIdType", "ID Type",                   externalForm.driverIdType, setExternal, ID_TYPES)}
            {inp("driverIdNumber", "ID Number",               externalForm.driverIdNumber, setExternal)}
            {inp("transporterName", "Transporter",            externalForm.transporterName, setExternal)}
          </div>
          <div style={g2}>
            {sel("typeOfVehicle", "Vehicle Type",             externalForm.typeOfVehicle, setExternal, VEHICLE_TYPES)}
            {inp("PUCExpiry", "PUC Expiry",                   externalForm.PUCExpiry, setExternal, "date")}
          </div>

          <SL label="Trip Details" color="#d97706" />
          <div style={g2}>
            {sel("purpose", "Purpose",                        externalForm.purpose, setExternal, PURPOSE_OPTS, true)}
            {sel("materialType", "Material Type",             externalForm.materialType, setExternal, MATERIAL_TYPES, true)}
          </div>

          {externalForm.materialType === "RM" && (
            <div style={{ animation: "vehFade .18s ease" }}>
              <SL label="Raw Material Details" color="#059669" />
              <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
                <div style={g3}>
                  <div className="flex flex-col" >
                    <label className="text-[11px]">Supplier</label>
                      <Select
                        label="Supplier"
                        mode="tags"
                        showSearch
                        style={{ width: "100%", height: 32 }}
                        placeholder="Search or enter supplier"
                        value={externalForm.supplier ? [externalForm.supplier] : []}
                        onChange={(value) => setExternal("supplier", value[0])}
                        options={supplierOptions}
                      />                  
                  </div>
                    {inp("material", "Material Name",         externalForm.material, setExternal)}
                  {inp("quantity", "Quantity",                externalForm.quantity, setExternal, "number")}
                </div>
                <div style={g2}>
                  {inp("invoiceNo", "Invoice No.",            externalForm.invoiceNo, setExternal)}
                  {inp("invoiceAmount", "Invoice Amount (₹)", externalForm.invoiceAmount, setExternal, "number")}
                </div>
              </div>
            </div>
          )}

          {externalForm.materialType === "FG" && (
            <div style={{ animation: "vehFade .18s ease" }}>
              <SL label="Finished Goods Details" color="#2563eb" />
              <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
                <div style={g2}>
                  {sel("customer", "Customer",                externalForm.customer, setExternal, CUSTOMER, [{v: CUSTOMER.name, l: CUSTOMER.name}])}
                  {inp("invoiceNo", "Invoice No.",            externalForm.invoiceNo, setExternal)}
                </div>
                <div style={g2}>
                  {inp("quantity", "Quantity",                externalForm.quantity, setExternal, "number")}
                  {inp("invoiceAmount", "Invoice Amount (₹)", externalForm.invoiceAmount, setExternal, "number")}
                </div>
              </div>
            </div>
          )}

          {["Scrap", "NewMachines", "Others"].includes(externalForm.materialType) && (
            <div style={{ animation: "vehFade .18s ease" }}>
              <SL label="Additional Details" color="#7c3aed" />
              <div style={{ background: "#faf5ff", border: "1.5px solid #e9d5ff", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
                <div style={g2}>
                  {inp("material", "Material / Description", externalForm.material, setExternal)}
                  {inp("quantity", "Quantity",               externalForm.quantity, setExternal, "number")}
                </div>
              </div>
            </div>
          )}

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