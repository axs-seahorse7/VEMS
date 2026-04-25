import { useEffect, useState } from "react";
import { Modal, Popconfirm, message } from "antd";
import {
  ArrowRightLeft,
  Factory,
  Users,
  MapPin,
  ChevronRight,
  X,
  CheckCircle2,
  Building2,
  Truck,
    CircleX,
} from "lucide-react";
import api from "../../../services/API/Api/api";



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
  { v: "Other", l: "Other", type: "customer" },


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

export function useChangeRouteModal({ onConfirmInternal, onConfirmExternal }) {
  const [open, setOpen]       = useState(false);
  const [trip, setTrip]       = useState(null);
  const [step, setStep]       = useState("select");    // "select" | "internal" | "external"
  const [selected, setSelected] = useState(null); 
  const customers = [...CUSTOMER, ...SUPPLIERS].sort((a, b) => a.l.localeCompare(b.l)); // sort alphabetically by label

  const openChangeRouteModal = (tripData) => {
    setTrip(tripData);
    setStep("select");
    setSelected(null);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setTimeout(() => { setStep("select"); setSelected(null); setTrip(null); }, 300);
  };

    const handleConfirmInternal = async () => {
        await onConfirmInternal?.(selected, trip);
        close();
    };

    const handleConfirmExternal = async () => {
        await onConfirmExternal?.(selected, trip);
        close();
    };



  return {
    openChangeRouteModal,
    modalProps: {
      open, trip, step, setStep, selected, setSelected, customers,
      onClose: close,
      onConfirmInternal: handleConfirmInternal,
      onConfirmExternal: handleConfirmExternal,
    },
  };
}

/* ═══════════════════════════════════════════════════════════════
   ChangeRouteModal — the actual modal component
═══════════════════════════════════════════════════════════════ */
export default function ChangeRouteModal({open, trip, step, setStep, selected, setSelected, onClose, onConfirmInternal, onConfirmExternal}) {
  const isInternal = step === "internal";
  const isExternal = step === "external";
  const inSelectStep = step === "select";
  const [factories, setFactories] = useState([])  
  const [searchText, setSearchText] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([...CUSTOMER, ...SUPPLIERS])   // factory obj or customer string


    const handleFilterCustomers = (value) => {
        setSearchText(value);
            const regex = new RegExp(value, "i"); // case-insensitive

            const custs = customers.filter(c => regex.test(c.l));
            setFilteredCustomers(custs);
    };

    const handleClearSearch = () => {
        setSearchText("");
        setFilteredCustomers(customers);
    };


    useEffect(() => {
        try {
            const fetchFactories = async () => {
                const res = await api.get("/factories");
                setFactories(res.data.factories);
            };
            
            fetchFactories();
        } catch (error) {
            message.error("Failed to fetch factories");
        }
        
    }, []);


  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .cr-modal .ant-modal-content {
          border-radius: 20px !important;
          padding: 0 !important;
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05) !important;
          font-family: 'DM Sans', sans-serif;
        }
        .cr-modal .ant-modal-body { padding: 0 !important; }
        .cr-modal .ant-modal-close {
          top: 14px !important; right: 14px !important;
          color: #6b7280 !important;
          background: #f9fafb !important;
          border-radius: 8px !important;
          width: 30px !important; height: 30px !important;
        }
        .cr-modal .ant-modal-close:hover { background: #f3f4f6 !important; color: #111 !important; }

        .cr-route-card {
          border: 1.5px solid #e5e7eb;
          border-radius: 14px;
          padding: 18px 20px;
          cursor: pointer;
          transition: all 0.18s ease;
          background: #fff;
          display: flex; align-items: center; gap: 16px;
          position: relative; overflow: hidden;
        }
        .cr-route-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          opacity: 0; transition: opacity 0.18s;
        }
        .cr-route-card:hover { border-color: #6366f1; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99,102,241,0.12); }
        .cr-route-card:hover::before { opacity: 1; }
        .cr-route-card.internal:hover { border-color: #6366f1; box-shadow: 0 8px 24px rgba(99,102,241,0.12); }
        .cr-route-card.internal::before { background: linear-gradient(90deg,#6366f1,#818cf8); }
        .cr-route-card.external:hover { border-color: #f59e0b; box-shadow: 0 8px 24px rgba(245,158,11,0.12); }
        .cr-route-card.external::before { background: linear-gradient(90deg,#f59e0b,#fbbf24); }

        .cr-list-item {
          display: flex; align-items: center; gap: 12px;
          padding: 11px 14px;
          border-radius: 10px;
          cursor: pointer;
          border: 1.5px solid transparent;
          transition: all 0.15s ease;
          background: #fafafa;
          margin-bottom: 6px;
        }
        .cr-list-item:hover { background: #f5f3ff; border-color: #c4b5fd; }
        .cr-list-item.selected { background: #ede9fe; border-color: #6366f1; }

        .cr-list-item-ext {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 14px;
          border-radius: 10px;
          cursor: pointer;
          border: 1.5px solid transparent;
          transition: all 0.15s ease;
          background: #fafafa;
          margin-bottom: 6px;
        }
        .cr-list-item-ext:hover { background: #fffbeb; border-color: #fcd34d; }
        .cr-list-item-ext.selected { background: #fef3c7; border-color: #f59e0b; }

        @keyframes crSlideIn { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }
        .cr-step { animation: crSlideIn 0.2s ease; }

        .cr-confirm-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px 24px; border-radius: 10px; border: none;
          font-family: 'DM Sans', sans-serif; font-weight: 700; font-size: 13px;
          cursor: pointer; transition: all 0.15s ease;
        }
        .cr-confirm-btn:hover { transform: translateY(-1px); filter: brightness(1.06); }
        .cr-confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
      `}</style>

      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width={480}
        className="cr-modal"
        closeIcon={<X size={14} />}
        destroyOnClose
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{
          padding: "22px 24px 18px",
          borderBottom: "1px solid #f3f4f6",
          background: "linear-gradient(135deg, #f8f9ff 0%, #fff 100%)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
            }}>
              <ArrowRightLeft size={18} color="#fff" strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", letterSpacing: "-0.3px" }}>
                Change Route
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>
                {inSelectStep ? "Select the movement type to continue" :
                 isInternal   ? "Choose destination factory" :
                                "Choose customer"}
              </div>
            </div>
          </div>

          {/* Breadcrumb / step indicator */}
          {!inSelectStep && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
              <button
                onClick={() => { setStep("select"); setSelected(null); }}
                style={{ fontSize: 12, color: "#6366f1", border: "1px solid #6366f1", fontWeight: 600, background: "none", cursor: "pointer", padding: "2px 12px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}
              >
                ← Back
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>Movement Type</span>
                <ChevronRight size={12} color="#9ca3af" />
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                  background: isInternal ? "#ede9fe" : "#fef3c7",
                  color: isInternal ? "#4f46e5" : "#92400e",
                }}>
                  {isInternal ? "Internal" : "External"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div style={{ padding: "20px 24px 24px" }}>

          {/* ── Step 1: Select type ── */}
          {inSelectStep && (
            <div className="cr-step" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 4px", fontWeight: 500 }}>
                Where should this vehicle be routed?
              </p>

              {/* Internal Movement Card */}
              <div className="cr-route-card internal" onClick={() => setStep("internal")}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Building2 size={20} color="#6366f1" strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Internal Movement</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Transfer to another factory within the group</div>
                </div>
                <ChevronRight size={16} color="#9ca3af" />
              </div>

              {/* External Movement Card */}
              <div className="cr-route-card external" onClick={() => setStep("external")}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Truck size={20} color="#d97706" strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>External Movement</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Deliver to an external customer</div>
                </div>
                <ChevronRight size={16} color="#9ca3af" />
              </div>
            </div>
          )}

          {/* ── Step 2a: Internal — pick factory ── */}
          {isInternal && (
            <div className="cr-step">
              <div style={{
                maxHeight: 300, overflowY: "auto", marginBottom: 16,
                paddingRight: 2,
              }}>
                {factories.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af", fontSize: 13 }}>
                    No factories available
                  </div>
                ) : factories.map(f => (
                  <div
                    key={f._id}
                    className={`cr-list-item${selected?._id === f._id ? " selected" : ""}`}
                    onClick={() => setSelected(f)}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                      background: selected?._id === f._id ? "#ede9fe" : "#f3f4f6",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Factory size={15} color={selected?._id === f._id ? "#6366f1" : "#9ca3af"} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{f.name}</div>
                      <div style={{ fontSize: 10, color: "#6b7280", display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                        <MapPin size={9} />{f.location}
                      </div>
                    </div>
                    {selected?._id === f._id && (
                      <CheckCircle2 size={16} color="#6366f1" strokeWidth={2.5} />
                    )}
                  </div>
                ))}
              </div>

              {/* Confirm button with Popconfirm */}
              <Popconfirm
                title={
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13 }}>
                    Confirm route change?
                  </span>
                }
                description={
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#6b7280" }}>
                    Vehicle will be routed to <strong>{selected?.name}</strong>
                    {selected?.location ? ` (${selected.location})` : ""}.
                  </span>
                }
                onConfirm={onConfirmInternal}
                okText="Yes, change route"
                cancelText="Cancel"
                okButtonProps={{ style: { background: "#6366f1", borderColor: "#6366f1", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 } }}
                disabled={!selected}
                placement="top"
              >
                <button
                  className="cr-confirm-btn"
                  disabled={!selected}
                  style={{
                    width: "100%",
                    background: selected ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "#e5e7eb",
                    color: selected ? "#fff" : "#9ca3af",
                    boxShadow: selected ? "0 4px 14px rgba(99,102,241,0.35)" : "none",
                  }}
                >
                  <ArrowRightLeft size={14} />
                  Change Route{selected ? ` → ${selected.name}` : ""}
                </button>
              </Popconfirm>
            </div>
          )}

          {/* ── Step 2b: External — pick customer ── */}
          {isExternal && (
            <div className="cr-step">

                <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }} className="border border-gray-400 rounded-full pl-4 pr-2 py-1">
                   <input 
                    type="text" 
                    placeholder="Search customers..."  
                    className="outline-none w-full" 
                    value={searchText}
                    onChange={(e) => handleFilterCustomers(e.target.value)}
                    />
                    {searchText.length ? <button onClick={handleClearSearch} className="cursor-pointer" ><CircleX size={22}  color="gray" /></button> : null}
                </div>

              <div style={{
                maxHeight: 300, overflowY: "auto", marginBottom: 16,
                paddingRight: 2,
              }}>
                {filteredCustomers.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af", fontSize: 13 }}>
                    No customers available
                  </div>
                ) : filteredCustomers.map(c => {
                  const val = c.value ?? c.v;
                  const lbl = c.label ?? c.l;
                  return (
                    <div
                      key={val}
                      className={`cr-list-item-ext${selected === val ? " selected" : ""}`}
                      onClick={() => setSelected(val)}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                        background: selected === val ? "#fef3c7" : "#f3f4f6",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Users size={15} color={selected === val ? "#d97706" : "#9ca3af"} />
                      </div>
                      <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#111827" }}>{lbl}</div>
                      {selected === val && (
                        <CheckCircle2 size={16} color="#f59e0b" strokeWidth={2.5} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Confirm button with Popconfirm */}
              <Popconfirm
                title={
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13 }}>
                    Confirm route change?
                  </span>
                }
                description={
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#6b7280" }}>
                    Vehicle will be redirected to customer <strong>{selected}</strong>.
                  </span>
                }
                onConfirm={onConfirmExternal}
                okText="Yes, change route"
                cancelText="Cancel"
                okButtonProps={{ style: { background: "#f59e0b", borderColor: "#f59e0b", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: "#fff" } }}
                disabled={!selected}
                placement="top"
              >
                <button
                  className="cr-confirm-btn"
                  disabled={!selected}
                  style={{
                    width: "100%",
                    background: selected ? "linear-gradient(135deg, #f59e0b, #d97706)" : "#e5e7eb",
                    color: selected ? "#fff" : "#9ca3af",
                    boxShadow: selected ? "0 4px 14px rgba(245,158,11,0.3)" : "none",
                  }}
                >
                  <ArrowRightLeft size={14} />
                  Change Route{selected ? ` → ${selected}` : ""}
                </button>
              </Popconfirm>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}