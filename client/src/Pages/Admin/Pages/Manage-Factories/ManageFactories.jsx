// ManageFactory.jsx  — Factory list + Add factory
// Pass activePage="factory-list" | "factory-create"

import { useEffect, useState } from "react";
import api from "../../../../../services/API/Api/api";
import { message } from "antd";

// ── Seed data (mirrors your Factory schema) ───────────────────────────────────
const SEED_FACTORIES = [
  {
    _id: "f1",
    name: "NGM Plant",
    location: "Nashik, Maharashtra",
    contactNumber: "0253-2345678",
    email: "ngm@vantrack.in",
    vans: ["v001", "v002", "v005"],
    factoryGioLocation: "20.0059,73.7898",
    createdAt: "2023-06-01T00:00:00Z",
    status: "active",
  },
  {
    _id: "f2",
    name: "PGTL Facility",
    location: "Pune, Maharashtra",
    contactNumber: "020-27654321",
    email: "pgtl@vantrack.in",
    vans: ["v003", "v004"],
    factoryGioLocation: "18.5204,73.8567",
    createdAt: "2024-01-15T00:00:00Z",
    status: "active",
  },
  {
    _id: "f3",
    name: "Mumbai Hub",
    location: "Thane, Maharashtra",
    contactNumber: "022-25001122",
    email: "mumbai@vantrack.in",
    vans: [],
    factoryGioLocation: "19.2183,72.9781",
    createdAt: "2024-09-10T00:00:00Z",
    status: "inactive",
  },
];

const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// ── Shared atoms ──────────────────────────────────────────────────────────────
const Badge = ({ children, color }) => {
  const map = {
    active: { bg: "#dcfce7", c: "#15803d" },
    inactive: { bg: "#f3f4f6", c: "#6b7280" },
  };
  const s = map[color] || map.active;
  return <span style={{ background: s.bg, color: s.c, fontSize: 11.5, fontWeight: 700, borderRadius: 6, padding: "3px 9px" }}>{children}</span>;
};

const Modal = ({ open, onClose, title, children, width = 560 }) => {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.4)",
      backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#fff", borderRadius: 18, width: "100%", maxWidth: width,
        maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 25px 80px rgba(0,0,0,0.22)", animation: "mf-up .2s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #f0f0f0" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#111" }}>{title}</h3>
          <button onClick={onClose} style={{ border: "none", background: "#f3f4f6", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 16, color: "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", padding: "20px 24px 24px" }}>{children}</div>
      </div>
    </div>
  );
};

const FLabel = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{label}</label>
    {children}
  </div>
);

const FInput = ({ value, onChange, type = "text", placeholder = "" }) => (
  <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{
    border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "9px 12px",
    fontSize: 13.5, color: "#111", outline: "none", fontFamily: "inherit", width: "100%", background: "#fff",
  }} />
);

// ── Factory Detail Modal ──────────────────────────────────────────────────────
function FactoryDetail({ factory, onClose, onEdit }) {
  if (!factory) return null;
  const D = ({ label, value }) => (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: .5, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: "#111" }}>{value || "—"}</div>
    </div>
  );
  return (
    <Modal open={!!factory} onClose={onClose} title={factory.name}>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <Badge color={factory.status}>{factory.status}</Badge>
        <span style={{ fontSize: 12.5, color: "#9ca3af" }}>Since {fmtDate(factory.createdAt)}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
        <D label="Location" value={factory.location} />
        <D label="Contact" value={factory.contactNumber} />
        <D label="Email" value={factory.email} />
        <D label="Vans Linked" value={`${factory.vans.length} van(s)`} />
        <D label="Geo Location" value={factory.factoryGioLocation} />
      </div>

      {/* Map placeholder */}
      {factory.factoryGioLocation && (
        <div style={{
          background: "#f1f5f9", borderRadius: 12, height: 120,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "1.5px dashed #cbd5e1", marginBottom: 20, flexDirection: "column", gap: 6,
        }}>
          <span style={{ fontSize: 24 }}>🗺️</span>
          <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>{factory.factoryGioLocation}</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
        <button onClick={() => { onEdit(factory); onClose(); }} style={{
          background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none",
          borderRadius: 9, padding: "9px 20px", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
        }}>Edit Factory</button>
        <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: 9, padding: "9px 16px", fontWeight: 600, fontSize: 13.5, cursor: "pointer", color: "#374151" }}>Close</button>
      </div>
    </Modal>
  );
}

// ── Add / Edit Factory Form ───────────────────────────────────────────────────
function FactoryForm({ initial, onSave, onCancel, title }) {
  const blank = { name: "", location: "", contactNumber: "", email: "", factoryGioLocation: "", status: "active" };
  const [form, setForm] = useState(initial || blank);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    console.log("Submitting factory form:", form);

    try {
      if (!form.name || !form.location) {
        return message.error("Name and location are required");
      }

      const response = await api.post("/factory", form);

      message.success("Factory saved successfully");
      setForm(blank);

    } catch (error) {
      const data = error?.response?.data;

      if (data?.code === 11000 || data?.message?.includes("duplicate key")) {
        message.error("A factory with this name already exists");
      } else {
        console.error("Error saving factory:", error);
        message.error(data?.message || "Error saving factory");
      }
    }
  };

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "28px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 6px" }}>{title}</h2>
      <p style={{ fontSize: 13.5, color: "#6b7280", margin: "0 0 24px" }}>Fill in the factory details below.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <FLabel label="Factory Name">
          <FInput value={form.name} onChange={(v) => set("name", v)} placeholder="NGM Plant" />
        </FLabel>
        <FLabel label="Location">
          <FInput value={form.location} onChange={(v) => set("location", v)} placeholder="Nashik, Maharashtra" />
        </FLabel>
        <FLabel label="Contact Number">
          <FInput value={form.contactNumber} onChange={(v) => set("contactNumber", v)} placeholder="0253-2345678" />
        </FLabel>
        <FLabel label="Email">
          <FInput value={form.email} onChange={(v) => set("email", v)} type="email" placeholder="factory@vantrack.in" />
        </FLabel>
        <FLabel label="Geo Location (lat,lng)">
          <FInput value={form.factoryGioLocation} onChange={(v) => set("factoryGioLocation", v)} placeholder="20.0059,73.7898" />
        </FLabel>
        <FLabel label="Status">
          <select value={form.status} onChange={(e) => set("status", e.target.value)} style={{
            border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "9px 12px",
            fontSize: 13.5, color: "#111", background: "#fff", outline: "none", cursor: "pointer", fontFamily: "inherit",
          }}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </FLabel>
      </div>

      <div style={{ display: "flex", gap: 10, paddingTop: 18, borderTop: "1px solid #f0f0f0" }}>
        <button onClick={handleSubmit} style={{
          background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none",
          borderRadius: 10, padding: "11px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer",
          boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
        }}>
          {initial ? "Save Changes" : "Add Factory"}
        </button>
        <button onClick={onCancel} style={{ background: "#f3f4f6", border: "none", borderRadius: 10, padding: "11px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer", color: "#374151" }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Factory List ──────────────────────────────────────────────────────────────
function FactoryList({ onAddClick }) {
  const [factories, setFactories] = useState([]);
  const [detail, setDetail] = useState(null);
  const [editFactory, setEditFactory] = useState(null);

  const saveFactory = (f) => {
    setFactories((p) => p.some((x) => x._id === f._id) ? p.map((x) => x._id === f._id ? f : x) : [...p, f]);
    setEditFactory(null);
  };

  const handleGetFactories = async () => {
    try {
      const response = await api.get("/factories");
      setFactories(response.data.factories);
    } catch (error) {
      console.error("Error fetching factories:", error);
      message.error("Error fetching factories");
    }
  };

  useEffect(() => {
    handleGetFactories();
  }, []);



  return (
    <>
      <style>{`@keyframes mf-up { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none} }`}</style>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: "0 0 4px" }}>Factory Management</h2>
          <p style={{ fontSize: 13.5, color: "#6b7280", margin: 0 }}>All registered factory locations.</p>
        </div>
        <button onClick={onAddClick} style={{
          background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none",
          borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
          boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
        }}>＋ Add Factory</button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 22 }}>
        {[
          { label: "Total", value: factories.length, color: "#6366f1" },
          { label: "Active", value: factories.filter(f => f.status === "active").length, color: "#15803d" },
          { label: "Inactive", value: factories.filter(f => f.status === "inactive").length, color: "#6b7280" },
          { label: "Total Vans", value: factories.reduce((a, f) => a + f.vans.length, 0), color: "#7c3aed" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#6b7280" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
        {factories.map((f) => (
          <div key={f._id} style={{
            background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden",
            transition: "box-shadow .18s, transform .18s", cursor: "pointer",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 8px 30px rgba(99,102,241,0.12), 0 0 0 1.5px #6366f1"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; e.currentTarget.style.transform = ""; }}
            onClick={() => setDetail(f)}
          >
            {/* Colored top bar */}
            <div style={{ height: 5, background: f.status === "active" ? "linear-gradient(90deg,#6366f1,#818cf8)" : "#e5e7eb" }} />

            <div style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>{f.name}</div>
                  <div style={{ fontSize: 12.5, color: "#9ca3af", marginTop: 2 }}>📍 {f.location}</div>
                </div>
                <Badge color={f.status}>{f.status}</Badge>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ display: "flex", gap: 8, fontSize: 12.5, color: "#374151" }}>
                  <span style={{ color: "#9ca3af" }}>📞</span>{f.contactNumber}
                </div>
                <div style={{ display: "flex", gap: 8, fontSize: 12.5, color: "#374151" }}>
                  <span style={{ color: "#9ca3af" }}>✉️</span>{f.email}
                </div>
                <div style={{ display: "flex", gap: 8, fontSize: 12.5, color: "#374151" }}>
                  <span style={{ color: "#9ca3af" }}>🚛</span>{f.vans.length} van{f.vans.length !== 1 ? "s" : ""} linked
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 16, paddingTop: 14, borderTop: "1px solid #f0f0f0" }}>
                <button onClick={(e) => { e.stopPropagation(); setEditFactory(f); }} style={{
                  flex: 1, background: "#ede9fe", border: "none", borderRadius: 8,
                  padding: "7px 0", fontSize: 12.5, fontWeight: 700, color: "#6366f1", cursor: "pointer",
                }}>Edit</button>
                <button onClick={(e) => { e.stopPropagation(); setDetail(f); }} style={{
                  flex: 1, background: "#f1f5f9", border: "none", borderRadius: 8,
                  padding: "7px 0", fontSize: 12.5, fontWeight: 700, color: "#475569", cursor: "pointer",
                }}>View</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <FactoryDetail factory={detail} onClose={() => setDetail(null)} onEdit={setEditFactory} />

      {editFactory && (
        <Modal open={!!editFactory} onClose={() => setEditFactory(null)} title="Edit Factory" width={640}>
          <FactoryForm initial={editFactory} onSave={saveFactory} onCancel={() => setEditFactory(null)} title="" />
        </Modal>
      )}
    </>
  );
}

// ── Exported router ───────────────────────────────────────────────────────────
export default function ManageFactory({ activePage = "factory-list" }) {
  const [page, setPage] = useState(activePage);

  if (page === "factory-create") {
    return (
      <div style={{ maxWidth: 700 }}>
        <button onClick={() => setPage("factory-list")} style={{
          background: "none", border: "none", cursor: "pointer", fontSize: 13.5,
          color: "#6366f1", fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginBottom: 20,
          fontFamily: "inherit", padding: 0,
        }}>← Back to Factory List</button>
        <FactoryForm
          title="Add New Factory"
          onSave={(f) => { setPage("factory-list"); }}
          onCancel={() => setPage("factory-list")}
        />
      </div>
    );
  }

  return <FactoryList onAddClick={() => setPage("factory-create")} />;
}