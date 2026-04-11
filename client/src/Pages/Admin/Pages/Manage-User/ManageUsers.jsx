import { useState } from "react";
import api from "../../../../../services/API/Api/api";
import {message} from "antd";
import { useEffect } from "react";

// ── Seed data (mirrors your User schema) ─────────────────────────────────────
const SEED_USERS = [
  { _id: "u1", name: "Arjun Sharma", email: "arjun@vantrack.in", role: "Gate Operator", isSystemAdmin: false, factoryLocation: "NGM", workLocation: "atGate", status: "active", createdAt: "2024-11-01T09:00:00Z" },
  { _id: "u2", name: "Priya Kulkarni", email: "priya@vantrack.in", role: "Pickup Supervisor", isSystemAdmin: false, factoryLocation: "PGTL", workLocation: "pickupSite", status: "active", createdAt: "2024-12-10T10:30:00Z" },
  { _id: "u3", name: "Rohit Desai", email: "rohit@vantrack.in", role: "Drop Officer", isSystemAdmin: false, factoryLocation: "NGM", workLocation: "dropSite", status: "blocked", createdAt: "2025-01-05T08:00:00Z" },
  { _id: "u4", name: "System Admin", email: "admin@vantrack.in", role: "System Admin", isSystemAdmin: true, factoryLocation: "NGM", workLocation: "atGate", status: "active", createdAt: "2024-09-01T07:00:00Z" },
  { _id: "u5", name: "Meena Patil", email: "meena@vantrack.in", role: "Gate Operator", isSystemAdmin: false, factoryLocation: "PGTL", workLocation: "atGate", status: "active", createdAt: "2025-02-14T11:00:00Z" },
  { _id: "u6", name: "Kiran Jadhav", email: "kiran@vantrack.in", role: "Pickup Supervisor", isSystemAdmin: false, factoryLocation: "NGM", workLocation: "pickupSite", status: "inactive", createdAt: "2025-03-01T09:45:00Z" },
];

const ROLES = [
  { id: "r1", name: "System Admin", permissions: ["all"] },
  { id: "r2", name: "Gate Operator", permissions: ["van:read", "van:create", "van:entry"] },
  { id: "r3", name: "Pickup Supervisor", permissions: ["van:read", "van:pickup"] },
  { id: "r4", name: "Drop Officer", permissions: ["van:read", "van:drop"] },
];

const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// ── Shared UI atoms ───────────────────────────────────────────────────────────
const Badge = ({ children, color }) => {
  const map = {
    active: { bg: "#dcfce7", c: "#15803d" },
    blocked: { bg: "#fef2f2", c: "#dc2626" },
    inactive: { bg: "#f3f4f6", c: "#6b7280" },
    admin: { bg: "#ede9fe", c: "#6366f1" },
    default: { bg: "#f0f9ff", c: "#0369a1" },
  };
  const s = map[color] || map.default;
  return (
    <span style={{ background: s.bg, color: s.c, fontSize: 11.5, fontWeight: 700, borderRadius: 6, padding: "3px 9px" }}>
      {children}
    </span>
  );
};

const Modal = ({ open, onClose, title, children, width = 520 }) => {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.4)",
      backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#fff", borderRadius: 18, width: "100%", maxWidth: width,
        maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 25px 80px rgba(0,0,0,0.22)",
        animation: "mu-fadeUp .2s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #f0f0f0" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#111" }}>{title}</h3>
          <button onClick={onClose} style={{ border: "none", background: "#f3f4f6", borderRadius: 8, width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#374151" }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", padding: "20px 24px 24px" }}>{children}</div>
      </div>
    </div>
  );
};

// ── Input helper ──────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{label}</label>
    {children}
  </div>
);

const inp = (val, set, type = "text", placeholder = "") => (
  <input type={type} value={val} onChange={(e) => set(e.target.value)} placeholder={placeholder} style={{
    border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "9px 12px",
    fontSize: 13.5, color: "#111", background: "#fff", outline: "none", width: "100%",
    fontFamily: "inherit",
  }} />
);

const sel = (val, set, options) => (
  <select
    value={val || ""}   // ✅ important
    onChange={(e) => {
      console.log("Selected:", e.target.value); // debug
      set(e.target.value);
    }}
    style={{
      border: "1.5px solid #e5e7eb",
      borderRadius: 8,
      padding: "9px 12px",
      fontSize: 13.5,
      color: "#111",
      background: "#fff",
      outline: "none",
      cursor: "pointer",
      fontFamily: "inherit",
    }}
  >
    <option value="">Select Factory</option> {/* ✅ important */}
    {options.map((o) => (
      <option key={o.v} value={o.v}>
        {o.l}
      </option>
    ))}
  </select>
);

// ── Create User Modal ─────────────────────────────────────────────────────────
function CreateUserModal({ open, onClose, onSave, factories }) {
  console.log("Factories:", factories);
  const blank = { name: "", email: "", password: "", factory:null, factoryLocation: "NGM", workLocation: "atGate", isSystemAdmin: false };
  const [form, setForm] = useState(blank);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
        if (!form.name || !form.email || !form.password || !form.factory) return message.error("Please fill all required fields");
        const payload = {
          ...form,
          factory: form.factory || undefined
        };
        try {await api.post("/auth/register", payload);
            onSave({ ...form, _id: "u" + Date.now(), status: "active", createdAt: new Date().toISOString() });
            message.success("User created successfully");
            onClose();
            setForm(blank);
        } catch (error) {
            // console.error("Error creating user:", error);
            message.error("Failed to create user");
        }
    };

  return (
    <Modal open={open} onClose={() => { onClose(); setForm(blank); }} title="Create New User" width={560}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Full Name">{inp(form.name, (v) => set("name", v), "text", "Enter full name")}</Field>
        <Field label="Email">{inp(form.email, (v) => set("email", v), "email", "Enter email")}</Field>
        <Field label="Password">{inp(form.password, (v) => set("password", v), "password", "Enter password")}</Field>
        <Field label="Factory">{
          sel(form.factory, (v) => set("factory", v), factories.map((f) => ({ v: f._id, l: f.name })))}
        </Field>
        <Field label="Work Location">{sel(form.workLocation, (v) => set("workLocation", v), [
          { v: "atGate", l: "Security Gate" }, { v: "storeSite", l: "Store Site" }, { v: "dispatchSite", l: "Dispatch Site" }
        ])}</Field>
        <Field label="Status">{sel(form.status, (v) => set("status", v), [{ v: "active", l: "Active" }, { v: "inactive", l: "Inactive" }])}</Field>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
        <button onClick={handleSubmit} style={{
          background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none",
          borderRadius: 9, padding: "10px 22px", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
        }}>Create User</button>
        <button onClick={() => { onClose(); setForm(blank); }} style={{ background: "#f3f4f6", border: "none", borderRadius: 9, padding: "10px 18px", fontWeight: 600, fontSize: 13.5, cursor: "pointer", color: "#374151" }}>Cancel</button>
      </div>
    </Modal>
  );
}

// ── Edit User Modal ───────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState(user || {});
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Modal open={!!user} onClose={onClose} title={`Edit — ${user?.name}`} width={540}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Full Name">{inp(form.name, (v) => set("name", v))}</Field>
        <Field label="Email">{inp(form.email, (v) => set("email", v), "email")}</Field>
        <Field label="Role">{sel(form.role, (v) => set("role", v), ROLES.map((r) => ({ v: r.name, l: r.name })))}</Field>
        <Field label="Factory Location">{sel(form.factoryLocation, (v) => set("factoryLocation", v), [{ v: "NGM", l: "NGM" }, { v: "PGTL", l: "PGTL" }])}</Field>
        <Field label="Work Location" >{sel(form.workLocation, (v) => set("workLocation", v), [
          { v: "atGate", l: "Security Gate" }, { v: "storeSite", l: "Store Site" }, { v: "dispatchSite", l: "Dispatch Site" }, { v: "pickupSite", l: "Pickup Site" }
        ])}</Field>
        <Field label="Status">{sel(form.status, (v) => set("status", v), [{ v: "active", l: "Active" }, { v: "blocked", l: "Blocked" }, { v: "inactive", l: "Inactive" }])}</Field>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
        <button onClick={() => { onSave(form); onClose(); }} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>Save Changes</button>
        <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: 9, padding: "10px 18px", fontWeight: 600, fontSize: 13.5, cursor: "pointer", color: "#374151" }}>Cancel</button>
      </div>
    </Modal>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ open, onClose, onConfirm, title, message, danger }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={420}>
      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, margin: "0 0 20px" }}>{message}</p>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => { onConfirm(); onClose(); }} style={{
          background: danger ? "#dc2626" : "linear-gradient(135deg,#6366f1,#4f46e5)",
          color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontWeight: 700, fontSize: 13.5, cursor: "pointer"
        }}>{danger ? "Yes, Delete" : "Confirm"}</button>
        <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: 9, padding: "10px 18px", fontWeight: 600, fontSize: 13.5, cursor: "pointer", color: "#374151" }}>Cancel</button>
      </div>
    </Modal>
  );
}

// ── User Detail Drawer ────────────────────────────────────────────────────────
function UserDetail({ user, onClose }) {
  if (!user) return null;
  const Detail = ({ label, value }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: .5 }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: "#111" }}>{value || "—"}</span>
    </div>
  );
  return (
    <Modal open={!!user} onClose={onClose} title="User Details">
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22, paddingBottom: 18, borderBottom: "1px solid #f0f0f0" }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "linear-gradient(135deg,#6366f1,#818cf8)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 20, fontWeight: 800,
        }}>{user.name[0]}</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#111" }}>{user.name}</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>{user.email}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <Badge color={user.status}>{user.status}</Badge>
            {user.isSystemAdmin && <Badge color="admin">System Admin</Badge>}
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Detail label="Factory" value={user.factory?.name || "Not assigned"} />
        <Detail label="Work Location" value={{ atGate: "Security Gate", storeSite: "Store Site", dispatchSite: "Dispatch Site", pickupSite: "Pickup Site" }[user.workLocation]} />
        <Detail label="Member Since" value={fmtDate(user.createdAt)} />
      </div>
    </Modal>
  );
}


// ── Roles Page ────────────────────────────────────────────────────────────────
function RolesPage() {
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: "0 0 4px" }}>Roles &amp; Permissions</h2>
        <p style={{ fontSize: 13.5, color: "#6b7280" }}>Manage what each role can access in the system.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {ROLES.map((r) => (
          <div key={r.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: "18px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#111" }}>{r.name}</div>
              <button style={{ background: "#ede9fe", border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 12.5, fontWeight: 700, color: "#6366f1", cursor: "pointer" }}>Edit Role</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {r.permissions.map((p) => (
                <span key={p} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, color: "#475569", fontFamily: "monospace" }}>{p}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Users List Page ───────────────────────────────────────────────────────────
function UsersList({ onCreateClick }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFactory, setFilterFactory] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [blockUser, setBlockUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [factories, setFactories] = useState([]);
  console.log(users);
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchStatus = filterStatus === "all" || u.status === filterStatus;
    const matchFactory = filterFactory === "all" || u.factoryLocation === filterFactory;
    return  matchStatus && matchFactory;
  });

  const toggleBlock = (id) => {
    setUsers((p) => p.map((u) => u._id === id ? { ...u, status: u.status === "blocked" ? "active" : "blocked" } : u));
  };
  const deleteU = (id) => setUsers((p) => p.filter((u) => u._id !== id));
  const saveEdit = (updated) => setUsers((p) => p.map((u) => u._id === updated._id ? updated : u));
  const createUser = (u) => setUsers((p) => [...p, u]);

  const statsBar = [
    { label: "Total", value: users.length, color: "#6366f1" },
    { label: "Active", value: users.filter(u => u.status === "active").length, color: "#15803d" },
    { label: "Blocked", value: users.filter(u => u.status === "blocked").length, color: "#dc2626" },
    { label: "Inactive", value: users.filter(u => u.status === "inactive").length, color: "#6b7280" },
    { label: "Admins", value: users.filter(u => u.isSystemAdmin).length, color: "#7c3aed" },
  ];

  const ActionBtn = ({ label, color, bg, onClick }) => (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} style={{
      background: bg, color, border: "none", borderRadius: 7,
      padding: "4px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
    }}>{label}</button>
  );

  const getUsers = () => {
    try {
        api.get("/users").then((res) => {
            setUsers(res.data.users);
        }).catch((err) => {            
            console.error("Error fetching users:", err);
            message.error("Failed to fetch users");
        });
    } catch (error) {        
        console.error("Error fetching users:", error);
        message.error("Failed to fetch users");
    }
  };

  useEffect (() => {
    getUsers();
  }, []);

  useEffect(() => {
    api.get("/factories").then((res) => {
      setFactories(res.data.factories);
    }).catch((err) => {
      console.error("Error fetching factories:", err);
      message.error("Failed to fetch factories");
    }
    );
  }, []);

  const handleDelete = async (id) => {
    try {      
      await api.delete(`/user/${id}`);
      deleteU(id);
      message.success("User deleted successfully");
    } catch (error) {      
      console.error("Error deleting user:", error);
      message.error("Failed to delete user");
    }
  };



  return (
    <>
      <style>{`@keyframes mu-fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: "0 0 4px" }}>User Management</h2>
          <p style={{ fontSize: 13.5, color: "#6b7280", margin: 0 }}>Manage all operator accounts and access control.</p>
        </div>
        <button onClick={() => setCreateOpen(true)} style={{
          background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff",
          border: "none", borderRadius: 10, padding: "10px 20px",
          fontWeight: 700, fontSize: 13.5, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 7,
          boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
        }}>＋ Create User</button>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        {statsBar.map((s) => (
          <div key={s.label} style={{
            background: "#fff", borderRadius: 12, padding: "14px 20px",
            border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 10, flex: "1 1 100px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#6b7280" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍  Search name, email, role…" style={{
          border: "1.5px solid #e5e7eb", borderRadius: 9, padding: "8px 14px",
          fontSize: 13.5, color: "#111", background: "#fff", outline: "none", flex: "1 1 200px",
          fontFamily: "inherit", minWidth: 180,
        }} />
        {[["all", "All Status"], ["active", "Active"], ["blocked", "Blocked"], ["inactive", "Inactive"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilterStatus(v)} style={{
            border: filterStatus === v ? "1.5px solid #6366f1" : "1.5px solid #e5e7eb",
            background: filterStatus === v ? "#ede9fe" : "#fff",
            color: filterStatus === v ? "#6366f1" : "#374151",
            borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: filterStatus === v ? 700 : 500,
            cursor: "pointer", fontFamily: "inherit",
          }}>{l}</button>
        ))}
        <select value={filterFactory} onChange={(e) => setFilterFactory(e.target.value)} style={{
          border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "7px 12px",
          fontSize: 12.5, color: "#374151", background: "#fff", cursor: "pointer", fontFamily: "inherit",
        }}>
          <option value="all">All Factories</option>
          {factories.map((f) => (
            <option key={f._id} value={f.name}>{f.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["User", "Role", "Factory", "Work Location", "Status", "Joined", "Actions"].map((h) => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "#6b7280", letterSpacing: .5, textTransform: "uppercase", borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af", fontSize: 14 }}>No users found</td></tr>
            ) : filtered.map((u) => (
              <tr key={u._id} style={{ cursor: "pointer", borderBottom: "1px solid #f5f5f5" }}
                onMouseEnter={(e) => { Array.from(e.currentTarget.cells).forEach(c => c.style.background = "#f8f9ff"); }}
                onMouseLeave={(e) => { Array.from(e.currentTarget.cells).forEach(c => c.style.background = ""); }}
                onClick={() => setSelectedUser(u)}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: u.isSystemAdmin ? "linear-gradient(135deg,#6366f1,#818cf8)" : "linear-gradient(135deg,#e0e7ff,#c7d2fe)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: u.isSystemAdmin ? "#fff" : "#6366f1", fontWeight: 800, fontSize: 14, flexShrink: 0,
                    }}>{u.name[0]}</div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#111" }}>{u.name}</div>
                      <div style={{ fontSize: 11.5, color: "#9ca3af" }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{u.role}</span>
                  {u.isSystemAdmin && <div><Badge color="admin">Admin</Badge></div>}
                </td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: "#374151", fontWeight: 600 }}>{u.factory?.name || "Not Assigned"}</td>
                <td style={{ padding: "12px 16px", fontSize: 12.5, color: "#6b7280" }}>
                  {{ atGate: "At Gate", pickupSite: "Pickup Site", dropSite: "Drop Site" }[u.workLocation]}
                </td>
                <td style={{ padding: "12px 16px" }}><Badge color={u.status}>{u.status}</Badge></td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "#9ca3af" }}>{fmtDate(u.createdAt)}</td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 5, flexWrap: "nowrap" }}>
                    <ActionBtn label="Edit" color="#6366f1" bg="#ede9fe" onClick={() => setEditUser(u)} />
                    <ActionBtn
                      label={u.status === "blocked" ? "Unblock" : "Block"}
                      color={u.status === "blocked" ? "#15803d" : "#92400e"}
                      bg={u.status === "blocked" ? "#dcfce7" : "#fef9c3"}
                      onClick={() => setBlockUser(u)}
                    />
                    <ActionBtn label="Reset PW" color="#0369a1" bg="#e0f2fe" onClick={() => setResetUser(u)} />
                    {!u.isSystemAdmin && (
                      <ActionBtn label="Delete" color="#dc2626" bg="#fef2f2" onClick={() => setDeleteUser(u)} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "10px 16px", borderTop: "1px solid #f0f0f0", fontSize: 12, color: "#9ca3af" }}>
          Showing {filtered.length} of {users.length} users
        </div>
      </div>

      {/* Modals */}
      <UserDetail user={selectedUser} onClose={() => setSelectedUser(null)} />
      <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSave={saveEdit} />
      <CreateUserModal factories={factories} open={createOpen} onClose={() => setCreateOpen(false)} onSave={createUser} />
      <ConfirmModal
        open={!!deleteUser} onClose={() => setDeleteUser(null)}
        onConfirm={() => handleDelete(deleteUser._id)}
        title="Delete User Account"
        message={`Are you sure you want to permanently delete "${deleteUser?.name}"? This action cannot be undone.`}
        danger
      />
      <ConfirmModal
        open={!!blockUser} onClose={() => setBlockUser(null)}
        onConfirm={() => toggleBlock(blockUser._id)}
        title={blockUser?.status === "blocked" ? "Unblock User" : "Block User"}
        message={blockUser?.status === "blocked"
          ? `Unblock "${blockUser?.name}"? They will regain access to the system.`
          : `Block "${blockUser?.name}"? They won't be able to log in until unblocked.`}
      />
      <ConfirmModal
        open={!!resetUser} onClose={() => setResetUser(null)}
        onConfirm={() => {}}
        title="Reset Password"
        message={`Send a password reset link to "${resetUser?.email}"?`}
      />
    </>
  );
}

// ── Exported router ───────────────────────────────────────────────────────────
export default function ManageUsers({ activePage = "users-list" }) {
  const [page, setPage] = useState(activePage);
  if (page === "users-roles") return <RolesPage />;
  return <UsersList onCreateClick={() => setPage("users-create")} />;
}