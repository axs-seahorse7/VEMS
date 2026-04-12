import { useState, useEffect, useCallback, useRef } from "react";
import api from "../../../../services/API/Api/api";
import { message } from "antd";
import { Factory, Truck } from "lucide-react";

// ─── LocalStorage Helpers ─────────────────────────────────────────────────────
const LS_INTERNAL = "veh_modal_internal_draft";
const LS_EXTERNAL = "veh_modal_external_draft";
const LS_TAB      = "veh_modal_active_tab";

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
  const [draftSaved, setDraftSaved]     = useState(false);

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
  const inp = (key, label, value, onChange, type = "text", req = false) => (
    <div style={col}>
      <label style={LBL}>{label}{req && <span style={{ color: "#6366f1", marginLeft: 2 }}>*</span>}</label>
      <input type={type} value={value}
        onChange={e => { onChange(key, e.target.value); clearErr(key); }}
        className="veh-inp"
        style={{ ...IB, border: errors[key] ? "1.5px solid #dc2626" : "1.5px solid #e5e7eb" }}
      />
      {errors[key] && <span style={ERR}>{errors[key]}</span>}
    </div>
  );

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
            {inp("driverName", "Driver Name", internalForm.driverName, setInternal, "text", true)}
            {inp("driverContact", "Contact", internalForm.driverContact, setInternal)}
          </div>
          <div style={g3}>
            {sel("driverIdType", "ID Type", internalForm.driverIdType, setInternal, ID_TYPES)}
            {inp("driverIdNumber", "ID Number", internalForm.driverIdNumber, setInternal)}
            {inp("transporterName", "Transporter", internalForm.transporterName, setInternal)}
          </div>
          <div style={g2}>
            {sel("typeOfVehicle", "Vehicle Type", internalForm.typeOfVehicle, setInternal, VEHICLE_TYPES)}
            {inp("PUCExpiry", "PUC Expiry", internalForm.PUCExpiry, setInternal, "date")}
          </div>

          <SL label="Trip Details" color="#4f46e5" />
          <div style={g3}>
            {sel("destinationFactoryId", "Destination Factory", internalForm.destinationFactoryId, setInternal,
              fetchingFactories ? [{ v: "", l: "Loading…" }] : factoryOpts, true)}
            {sel("purpose", "Purpose", internalForm.purpose, setInternal, PURPOSE_OPTS, true)}
            {sel("materialType", "Material Type", internalForm.materialType, setInternal, MATERIAL_TYPES, true)}
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
                width: 44, height: 24, borderRadius: 12,
                background: externalForm.isInternalShifting
                  ? "linear-gradient(135deg,#6366f1,#4f46e5)"
                  : "#e5e7eb",
                position: "relative", cursor: "pointer",
                transition: "background .25s",
                boxShadow: externalForm.isInternalShifting ? "0 0 0 3px rgba(99,102,241,.2)" : "none",
                flexShrink: 0,
              }}
            >
              <div style={{
                position: "absolute",
                width: 18, height: 18,
                background: "#fff",
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
              {sel("passType", "Pass Type", externalForm.passType, setExternal, PASS_TYPE_OPTS, true)}
              {sel("destinationFactoryId", "Destination Factory", externalForm.destinationFactoryId, setExternal,
                fetchingFactories ? [{ v: "", l: "Loading…" }] : factoryOpts, true)}
            </div>
          )}

          <SL label="Driver & Vehicle" />
          <div style={g3}>
            {vnField(externalForm, setExternal)}
            {inp("driverName", "Driver Name", externalForm.driverName, setExternal, "text", true)}
            {inp("driverContact", "Contact", externalForm.driverContact, setExternal)}
          </div>
          <div style={g3}>
            {sel("driverIdType", "ID Type", externalForm.driverIdType, setExternal, ID_TYPES)}
            {inp("driverIdNumber", "ID Number", externalForm.driverIdNumber, setExternal)}
            {inp("transporterName", "Transporter", externalForm.transporterName, setExternal)}
          </div>
          <div style={g2}>
            {sel("typeOfVehicle", "Vehicle Type", externalForm.typeOfVehicle, setExternal, VEHICLE_TYPES)}
            {inp("PUCExpiry", "PUC Expiry", externalForm.PUCExpiry, setExternal, "date")}
          </div>

          <SL label="Trip Details" color="#d97706" />
          <div style={g2}>
            {sel("purpose", "Purpose", externalForm.purpose, setExternal, PURPOSE_OPTS, true)}
            {sel("materialType", "Material Type", externalForm.materialType, setExternal, MATERIAL_TYPES, true)}
          </div>

          {externalForm.materialType === "RM" && (
            <div style={{ animation: "vehFade .18s ease" }}>
              <SL label="Raw Material Details" color="#059669" />
              <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
                <div style={g3}>
                  {sel("supplier", "Supplier", externalForm.supplier, setExternal, [{ v: "supplier1", l: "Supplier A" }, { v: "supplier2", l: "Supplier B" }, { v: "other", l: "Other" }])}
                  {inp("material", "Material Name", externalForm.material, setExternal)}
                  {inp("quantity", "Quantity", externalForm.quantity, setExternal)}
                </div>
                <div style={g2}>
                  {inp("invoiceNo", "Invoice No.", externalForm.invoiceNo, setExternal)}
                  {inp("invoiceAmount", "Invoice Amount (₹)", externalForm.invoiceAmount, setExternal)}
                </div>
              </div>
            </div>
          )}

          {externalForm.materialType === "FG" && (
            <div style={{ animation: "vehFade .18s ease" }}>
              <SL label="Finished Goods Details" color="#2563eb" />
              <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
                <div style={g2}>
                  {inp("customer", "Customer", externalForm.customer, setExternal)}
                  {inp("invoiceNo", "Invoice No.", externalForm.invoiceNo, setExternal)}
                </div>
                <div style={g2}>
                  {inp("quantity", "Quantity", externalForm.quantity, setExternal)}
                  {inp("invoiceAmount", "Invoice Amount (₹)", externalForm.invoiceAmount, setExternal)}
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
                  {inp("quantity", "Quantity", externalForm.quantity, setExternal)}
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