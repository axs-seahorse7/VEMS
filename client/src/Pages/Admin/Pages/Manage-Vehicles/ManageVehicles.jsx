import { useState, useEffect } from "react";
import api from "../../../../../services/API/Api/api"; // adjust path as needed

const VEHICLE_TYPES = [
  { v: "truck",          l: "Truck",           icon: "🚛" },
  { v: "miniTruck",      l: "Mini Truck",       icon: "🚚" },
  { v: "containerTruck", l: "Container Truck",  icon: "🚛" },
  { v: "mixerTruck",     l: "Mixer Truck",      icon: "🚜" },
  { v: "waterTanker",    l: "Water Tanker",     icon: "🚒" },
  { v: "tractor",        l: "Tractor",          icon: "🚜" },
  { v: "car",            l: "Car",              icon: "🚗" },
  { v: "bus",            l: "Bus",              icon: "🚌" },
  { v: "ambulance",      l: "Ambulance",        icon: "🚑" },
  { v: "van",            l: "Van",              icon: "🚐" },
  { v: "trailer",        l: "Trailer",          icon: "🚋" },
];

const OWNERSHIP_TYPES = ["internal", "external"];

const typeIcon = Object.fromEntries(VEHICLE_TYPES.map(t => [t.v, t.icon]));
const typeLabel = Object.fromEntries(VEHICLE_TYPES.map(t => [t.v, t.l]));

const defaultForm = {
  vehicleNumber:  "",
  type:           "internal",
  typeOfVehicle:  "truck",
  ownerFactoryId: "",
  driverName:     "",
  driverContact:  "",
  transporterName:"",
  driverIdNumber: "",
  PUCExpiry:      "",
  isActive:       true,
};

export default function ManageVehicles() {
  const [vehicles,        setVehicles]        = useState([]);
  const [factories,       setFactories]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [formOpen,        setFormOpen]        = useState(false);
  const [editingVehicle,  setEditingVehicle]  = useState(null);
  const [form,            setForm]            = useState(defaultForm);
  const [submitting,      setSubmitting]      = useState(false);
  const [error,           setError]           = useState("");
  const [success,         setSuccess]         = useState("");
  const [search,          setSearch]          = useState("");
  const [filterType,      setFilterType]      = useState("all");
  const [filterOwnership, setFilterOwnership] = useState("all");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [vRes, fRes] = await Promise.all([
        api.get("/vehicles"),
        api.get("/factories"),
      ]);
      setVehicles(vRes.data);
      setFactories(fRes.data.factories);
    } catch {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingVehicle(null);
    setForm(defaultForm);
    setError("");
    setFormOpen(true);
  };

  const openEdit = (v) => {
    setEditingVehicle(v);
    setForm({
      vehicleNumber:   v.vehicleNumber,
      type:            v.type,
      typeOfVehicle:   v.typeOfVehicle,
      ownerFactoryId:  v.ownerFactoryId?._id || v.ownerFactoryId || "",
      driverName:      v.driverName      || "",
      driverContact:   v.driverContact   || "",
      transporterName: v.transporterName || "",
      driverIdNumber:  v.driverIdNumber  || "",
      // format Date → "YYYY-MM-DD" for <input type="date">
      PUCExpiry:       v.PUCExpiry ? new Date(v.PUCExpiry).toISOString().split("T")[0] : "",
      isActive:        v.isActive,
    });
    setError("");
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        ...form,
        ownerFactoryId: form.ownerFactoryId || null,
        PUCExpiry:      form.PUCExpiry || null,
      };
      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle._id}`, payload);
        setSuccess("Vehicle updated successfully.");
      } else {
        await api.post("/vehicles", payload);
        setSuccess("Vehicle registered successfully.");
      }
      setFormOpen(false);
      fetchAll();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const getFactoryName = (id) => {
    if (!id) return "—";
    const f = factories.find(f => f._id === (id?._id || id));
    return f ? f.name : "Unknown";
  };

  const filtered = vehicles.filter(v => {
    const matchSearch =
      v.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
      (v.driverName      || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.transporterName || "").toLowerCase().includes(search.toLowerCase()) ||
      getFactoryName(v.ownerFactoryId).toLowerCase().includes(search.toLowerCase());
    const matchKind      = filterType      === "all" || v.typeOfVehicle === filterType;
    const matchOwnership = filterOwnership === "all" || v.type          === filterOwnership;
    return matchSearch && matchKind && matchOwnership;
  });

  // PUC status helper
  const pucStatus = (expiry) => {
    if (!expiry) return { label: "—", color: "#9ca3af", bg: "#f3f4f6" };
    const days = Math.ceil((new Date(expiry) - Date.now()) / 86400000);
    if (days < 0)  return { label: "Expired",          color: "#dc2626", bg: "#fef2f2" };
    if (days <= 30) return { label: `${days}d left`,   color: "#d97706", bg: "#fef3c7" };
    return               { label: "Valid",              color: "#16a34a", bg: "#dcfce7" };
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={styles.page}>

      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <p style={styles.breadcrumb}>Admin Panel · Fleet</p>
          <h1 style={styles.title}>Vehicle Registry</h1>
        </div>
        <button style={styles.primaryBtn} onClick={openCreate}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Register Vehicle
        </button>
      </div>

      {success && <div style={styles.toast}>{success}</div>}

      {/* ── Stats ── */}
      <div style={styles.statsRow}>
        {[
          { label: "Total",    value: vehicles.length,                                    color: "#0f172a" },
          { label: "Active",   value: vehicles.filter(v => v.isActive).length,            color: "#16a34a" },
          { label: "Internal", value: vehicles.filter(v => v.type === "internal").length, color: "#2563eb" },
          { label: "External", value: vehicles.filter(v => v.type === "external").length, color: "#9333ea" },
          { label: "PUC Expiring", value: vehicles.filter(v => {
              if (!v.PUCExpiry) return false;
              const d = Math.ceil((new Date(v.PUCExpiry) - Date.now()) / 86400000);
              return d >= 0 && d <= 30;
            }).length, color: "#d97706" },
        ].map(s => (
          <div key={s.label} style={styles.statCard}>
            <span style={{ ...styles.statNum, color: s.color }}>{s.value}</span>
            <span style={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={styles.filterBar}>
        <div style={styles.searchWrap}>
          <span style={styles.searchIcon}>⌕</span>
          <input
            style={styles.searchInput}
            placeholder="Search vehicle no., driver, transporter, factory…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={styles.filterTabs}>
          {["all", "internal", "external"].map(t => (
            <button key={t} style={{ ...styles.tab, ...(filterOwnership === t ? styles.tabActive : {}) }}
              onClick={() => setFilterOwnership(t)}>
              {t === "all" ? "All Ownership" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div style={styles.filterTabs}>
          {["all", ...VEHICLE_TYPES.map(t => t.v)].map(t => (
            <button key={t} style={{ ...styles.tab, ...(filterType === t ? styles.tabActive : {}) }}
              onClick={() => setFilterType(t)}>
              {t === "all" ? "All Kinds" : `${typeIcon[t]} ${typeLabel[t]}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={styles.tableWrap}>
        {loading ? (
          <div style={styles.emptyState}>Loading vehicles…</div>
        ) : filtered.length === 0 ? (
          <div style={styles.emptyState}>No vehicles found.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                {["Vehicle No.", "Ownership", "Kind", "Driver", "Transporter", "Factory", "PUC", "Status", ""].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => {
                const puc = pucStatus(v.PUCExpiry);
                return (
                  <tr key={v._id} style={{ ...styles.tr, background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                    <td style={styles.td}>
                      <span style={styles.vehicleNum}>{v.vehicleNumber}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, ...typeBadge(v.type) }}>{v.type}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.vehicleKind}>
                        {typeIcon[v.typeOfVehicle] || "🚗"} {typeLabel[v.typeOfVehicle] || v.typeOfVehicle}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{v.driverName || "—"}</div>
                      {v.driverContact && <div style={{ fontSize: 11, color: "#6b7280" }}>{v.driverContact}</div>}
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontSize: 13, color: "#374151" }}>{v.transporterName || "—"}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.factoryChip}>{getFactoryName(v.ownerFactoryId)}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.pucChip, background: puc.bg, color: puc.color }}>
                        {puc.label}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.dot, background: v.isActive ? "#22c55e" : "#e5e7eb" }} />
                      <span style={{ fontSize: 13, color: v.isActive ? "#15803d" : "#9ca3af" }}>
                        {v.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button style={styles.editBtn} onClick={() => openEdit(v)}>Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal ── */}
      {formOpen && (
        <div style={styles.overlay} onClick={() => setFormOpen(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>

            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editingVehicle ? "Edit Vehicle" : "Register Vehicle"}
              </h2>
              <button style={styles.closeBtn} onClick={() => setFormOpen(false)}>✕</button>
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}

            <form onSubmit={handleSubmit} style={styles.form}>

              {/* ── Vehicle identity ── */}
              <div style={styles.sectionHead}>Vehicle Details</div>
              <div style={styles.row2}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Vehicle Number *</label>
                  <input
                    style={{ ...styles.input, ...(editingVehicle ? styles.inputDisabled : {}) }}
                    value={form.vehicleNumber}
                    onChange={e => f("vehicleNumber", e.target.value.toUpperCase())}
                    placeholder="e.g. MH12AB1234"
                    required
                    disabled={!!editingVehicle}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Vehicle Kind *</label>
                  <select style={styles.input} value={form.typeOfVehicle}
                    onChange={e => f("typeOfVehicle", e.target.value)}>
                    {VEHICLE_TYPES.map(t => (
                      <option key={t.v} value={t.v}>{t.icon} {t.l}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.row2}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Ownership Type *</label>
                  <select style={styles.input} value={form.type}
                    onChange={e => f("type", e.target.value)}>
                    {OWNERSHIP_TYPES.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Owner Factory</label>
                  <select style={styles.input} value={form.ownerFactoryId}
                    onChange={e => f("ownerFactoryId", e.target.value)}>
                    <option value="">— No factory —</option>
                    {factories.map(fac => (
                      <option key={fac._id} value={fac._id}>{fac.name} · {fac.location}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Driver / Transporter ── */}
              <div style={styles.sectionHead}>Driver & Transporter</div>
              <div style={styles.row2}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Driver Name</label>
                  <input style={styles.input} value={form.driverName}
                    onChange={e => f("driverName", e.target.value)}
                    placeholder="Full name" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Driver Contact</label>
                  <input style={styles.input} type="tel" value={form.driverContact}
                    onChange={e => f("driverContact", e.target.value)}
                    placeholder="Mobile number" />
                </div>
              </div>
              <div style={styles.row2}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Driver ID Number</label>
                  <input style={styles.input} value={form.driverIdNumber}
                    onChange={e => f("driverIdNumber", e.target.value)}
                    placeholder="Aadhar / DL / PAN…" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Transporter Name</label>
                  <input style={styles.input} value={form.transporterName}
                    onChange={e => f("transporterName", e.target.value)}
                    placeholder="Transport company" />
                </div>
              </div>

              {/* ── Compliance ── */}
              <div style={styles.sectionHead}>Compliance</div>
              <div style={styles.row2}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>PUC Expiry Date</label>
                  <input style={styles.input} type="date" value={form.PUCExpiry}
                    onChange={e => f("PUCExpiry", e.target.value)} />
                  {form.PUCExpiry && (() => {
                    const p = pucStatus(form.PUCExpiry);
                    return (
                      <span style={{ fontSize: 11, fontWeight: 600, color: p.color, marginTop: 2 }}>
                        {p.label === "Expired" ? "⚠️ PUC has expired" : p.label === "—" ? "" : `✅ ${p.label}`}
                      </span>
                    );
                  })()}
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Status</label>
                  <label style={styles.checkLabel}>
                    <input type="checkbox" checked={form.isActive}
                      onChange={e => f("isActive", e.target.checked)}
                      style={{ marginRight: 8 }} />
                    Active vehicle
                  </label>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" style={styles.cancelBtn} onClick={() => setFormOpen(false)}>
                  Cancel
                </button>
                <button type="submit" style={styles.primaryBtn} disabled={submitting}>
                  {submitting ? "Saving…" : editingVehicle ? "Update" : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const typeBadge = (type) => ({
  background: type === "internal" ? "#dbeafe" : "#f3e8ff",
  color:      type === "internal" ? "#1d4ed8" : "#7e22ce",
});

const styles = {
  page: {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    background: "#f4f5f7",
    minHeight: "100vh",
    padding: "32px 40px",
    color: "#111",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 28,
  },
  breadcrumb: {
    fontSize: 12,
    color: "#9ca3af",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    margin: "0 0 4px",
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    margin: 0,
    letterSpacing: "-0.5px",
    color: "#0f172a",
  },
  primaryBtn: {
    background: "#0f172a",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    letterSpacing: "0.01em",
  },
  toast: {
    background: "#dcfce7",
    color: "#15803d",
    border: "1px solid #bbf7d0",
    borderRadius: 8,
    padding: "10px 16px",
    fontSize: 14,
    marginBottom: 16,
    fontWeight: 500,
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "14px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  statNum: {
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: "-1px",
  },
  statLabel: {
    fontSize: 12,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  filterBar: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
  },
  searchWrap: {
    position: "relative",
    flex: 1,
    minWidth: 260,
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: 18,
    color: "#9ca3af",
  },
  searchInput: {
    width: "100%",
    padding: "9px 12px 9px 36px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    fontSize: 14,
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
    color: "#111",
  },
  filterTabs: {
    display: "flex",
    gap: 4,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 4,
    flexWrap: "wrap",
  },
  tab: {
    padding: "5px 12px",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 500,
    color: "#6b7280",
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
  tabActive: {
    background: "#0f172a",
    color: "#fff",
  },
  tableWrap: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    overflow: "auto",
  },
  emptyState: {
    padding: 48,
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 14,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 900,
  },
  th: {
    padding: "12px 14px",
    fontSize: 11,
    fontWeight: 600,
    color: "#6b7280",
    textAlign: "left",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #f3f4f6",
  },
  td: {
    padding: "12px 14px",
    fontSize: 13,
    verticalAlign: "middle",
  },
  vehicleNum: {
    fontWeight: 700,
    fontFamily: "monospace",
    fontSize: 13,
    letterSpacing: "0.04em",
    color: "#0f172a",
    background: "#f1f5f9",
    padding: "3px 8px",
    borderRadius: 5,
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 20,
    padding: "3px 10px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  vehicleKind: {
    fontSize: 13,
    color: "#374151",
  },
  factoryChip: {
    fontSize: 12,
    background: "#f0fdf4",
    color: "#166534",
    padding: "3px 9px",
    borderRadius: 20,
    fontWeight: 500,
    border: "1px solid #bbf7d0",
    whiteSpace: "nowrap",
  },
  pucChip: {
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 9px",
    borderRadius: 20,
    whiteSpace: "nowrap",
  },
  dot: {
    display: "inline-block",
    width: 7,
    height: 7,
    borderRadius: "50%",
    marginRight: 6,
  },
  editBtn: {
    fontSize: 12,
    fontWeight: 600,
    padding: "5px 14px",
    borderRadius: 6,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    color: "#374151",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(2px)",
  },
  modal: {
    background: "#fff",
    borderRadius: 14,
    width: "100%",
    maxWidth: 540,
    padding: "28px 30px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
    color: "#0f172a",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 16,
    cursor: "pointer",
    color: "#9ca3af",
    padding: 4,
  },
  sectionHead: {
    fontSize: 10,
    fontWeight: 800,
    color: "#6366f1",
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingBottom: 6,
    borderBottom: "1px solid #ede9fe",
    marginBottom: 12,
    marginTop: 4,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  row2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#374151",
  },
  input: {
    padding: "9px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    fontSize: 13,
    outline: "none",
    background: "#f9fafb",
    color: "#111",
    width: "100%",
    boxSizing: "border-box",
  },
  inputDisabled: {
    background: "#f1f5f9",
    color: "#6b7280",
    cursor: "not-allowed",
  },
  checkLabel: {
    fontSize: 13,
    color: "#374151",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    fontWeight: 500,
    marginTop: 22,        // align roughly with adjacent date input
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
    paddingTop: 14,
    borderTop: "1px solid #f0f0f0",
  },
  cancelBtn: {
    padding: "9px 20px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    color: "#374151",
  },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    marginBottom: 12,
  },
};