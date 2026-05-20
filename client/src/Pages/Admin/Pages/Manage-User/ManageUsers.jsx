import { useState, useEffect } from "react";
import api from "../../../../../services/API/Api/api";
import { message } from "antd";

const ROLES = [
  { id: "r1", name: "System Admin", permissions: ["all"] },
  { id: "r2", name: "Gate Operator", permissions: ["van:read", "van:create", "van:entry"] },
  { id: "r3", name: "Pickup Supervisor", permissions: ["van:read", "van:pickup"] },
  { id: "r4", name: "Drop Officer", permissions: ["van:read", "van:drop"] },
];

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// ── Shared UI atoms ───────────────────────────────────────────────────────────
const Badge = ({ children, color }) => {
  const map = {
    active:   { bg: "#dcfce7", c: "#15803d" },
    blocked:  { bg: "#fef2f2", c: "#dc2626" },
    inactive: { bg: "#f3f4f6", c: "#6b7280" },
    admin:    { bg: "#ede9fe", c: "#6366f1" },
    default:  { bg: "#f0f9ff", c: "#0369a1" },
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
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(3px)", display: "flex", alignItems: "center",
        justifyContent: "center", padding: 20,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#fff", borderRadius: 18, width: "100%", maxWidth: width,
        maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 25px 80px rgba(0,0,0,0.22)", animation: "mu-fadeUp .2s ease",
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

const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{label}</label>
    {children}
  </div>
);

const inputStyle = {
  border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "9px 12px",
  fontSize: 13.5, color: "#111", background: "#fff", outline: "none",
  width: "100%", fontFamily: "inherit", boxSizing: "border-box",
};

const selectStyle = {
  ...inputStyle, cursor: "pointer",
};

const Inp = ({ value, onChange, type = "text", placeholder = "" }) => (
  <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder} style={inputStyle} />
);

const Sel = ({ value, onChange, options, placeholder = "Select…" }) => (
  <select value={value || ""} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
    <option value="" disabled>{placeholder}</option>
    {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
  </select>
);

// ── Create User Modal ─────────────────────────────────────────────────────────
function CreateUserModal({ open, onClose, onSave, factories }) {
  const blank = { name: "", email: "", password: "", factory: "", workLocation: "atGate", status: "active" };
  const [form, setForm] = useState(blank);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password || !form.factory)
      return message.error("Please fill all required fields");
    try {
      await api.post("/auth/register", form);
      onSave({ ...form, _id: "u" + Date.now(), status: "active", createdAt: new Date().toISOString() });
      message.success("User created successfully");
      onClose();
      setForm(blank);
    } catch {
      message.error("Failed to create user");
    }
  };

  return (
    <Modal open={open} onClose={() => { onClose(); setForm(blank); }} title="Create New User" width={560}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Full Name *">
          <Inp value={form.name} onChange={(v) => set("name", v)} placeholder="Enter full name" />
        </Field>
        <Field label="Email *">
          <Inp value={form.email} onChange={(v) => set("email", v)} type="email" placeholder="Enter email" />
        </Field>
        <Field label="Password *">
          <Inp value={form.password} onChange={(v) => set("password", v)} type="password" placeholder="Enter password" />
        </Field>
        <Field label="Factory *">
          <Sel value={form.factory} onChange={(v) => set("factory", v)}
            options={factories.map((f) => ({ v: f._id, l: f.name }))} placeholder="Select Factory" />
        </Field>
        <Field label="Work Location">
          <Sel value={form.workLocation} onChange={(v) => set("workLocation", v)} options={[
            { v: "atGate", l: "Security Gate" },
            { v: "storeSite", l: "Store Site" },
            { v: "dispatchSite", l: "Dispatch Site" },
            { v: "pickupSite", l: "Pickup Site" },
          ]} />
        </Field>
        <Field label="Status">
          <Sel value={form.status} onChange={(v) => set("status", v)} options={[
            { v: "active", l: "Active" },
            { v: "inactive", l: "Inactive" },
          ]} />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
        <button onClick={handleSubmit} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
          Create User
        </button>
        <button onClick={() => { onClose(); setForm(blank); }} style={{ background: "#f3f4f6", border: "none", borderRadius: 9, padding: "10px 18px", fontWeight: 600, fontSize: 13.5, cursor: "pointer", color: "#374151" }}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

// ── Edit User Modal ───────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onSave, factories }) {
  const [form, setForm] = useState({});
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Sync form when a different user is opened
  useEffect(() => {
    if (user) {
      setForm({
        ...user,
        // factory may be a populated object; keep _id for the select
        factory: user.factory?._id || user.factory || "",
      });
    }
  }, [user]);

  const handleSave = () => {
    onSave({ ...form, factory: form.factory });
    onClose();
  };

  return (
    <Modal open={!!user} onClose={onClose} title={`Edit — ${user?.name}`} width={540}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Full Name">
          <Inp value={form.name || ""} onChange={(v) => set("name", v)} />
        </Field>
        <Field label="Email">
          <Inp value={form.email || ""} onChange={(v) => set("email", v)} type="email" />
        </Field>
        <Field label="Factory">
          <Sel value={form.factory || ""} onChange={(v) => set("factory", v)}
            options={factories.map((f) => ({ v: f._id, l: f.name }))} placeholder="Select Factory" />
        </Field>
        <Field label="Work Location">
          <Sel value={form.workLocation || ""} onChange={(v) => set("workLocation", v)} options={[
            { v: "atGate", l: "Security Gate" },
            { v: "storeSite", l: "Store Site" },
            { v: "dispatchSite", l: "Dispatch Site" },
            { v: "pickupSite", l: "Pickup Site" },
          ]} />
        </Field>
        <Field label="Status">
          <Sel value={form.status || ""} onChange={(v) => set("status", v)} options={[
            { v: "active", l: "Active" },
            { v: "inactive", l: "Inactive" },
          ]} />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
        <button onClick={handleSave} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
          Save Changes
        </button>
        <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: 9, padding: "10px 18px", fontWeight: 600, fontSize: 13.5, cursor: "pointer", color: "#374151" }}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ open, onClose, onConfirm, title, message: msg, danger }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={420}>
      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, margin: "0 0 20px" }}>{msg}</p>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => { onConfirm(); onClose(); }} style={{
          background: danger ? "#dc2626" : "linear-gradient(135deg,#6366f1,#4f46e5)",
          color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px",
          fontWeight: 700, fontSize: 13.5, cursor: "pointer",
        }}>
          {danger ? "Yes, Delete" : "Confirm"}
        </button>
        <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: 9, padding: "10px 18px", fontWeight: 600, fontSize: 13.5, cursor: "pointer", color: "#374151" }}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

// ── User Detail Modal ─────────────────────────────────────────────────────────
function UserDetail({ user, onClose }) {
  if (!user) return null;
  const Detail = ({ label, value }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: .5 }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: "#111" }}>{value || "—"}</span>
    </div>
  );
  const workLabelMap = { atGate: "Security Gate", storeSite: "Store Site", dispatchSite: "Dispatch Site", pickupSite: "Pickup Site" };
  return (
    <Modal open={!!user} onClose={onClose} title="User Details">
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22, paddingBottom: 18, borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 800 }}>
          {user.name[0]}
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#111" }}>{user.name}</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>{user.email}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <Badge color={user.isBlocked ? "blocked" : user.status}>{user.isBlocked ? "blocked" : user.status}</Badge>
            {user.isSystemAdmin && <Badge color="admin">System Admin</Badge>}
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Detail label="Factory" value={user.factory?.name || "Not assigned"} />
        <Detail label="Work Location" value={workLabelMap[user.workLocation]} />
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
function UsersList() {
  const [users, setUsers] = useState([]);
  const [factories, setFactories] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFactory, setFilterFactory] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [blockUser, setBlockUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  // ── Data fetching ───────────────────────────────────────────────────────────
  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data.users);
    } catch {
      message.error("Failed to fetch users");
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    api.get("/factories")
      .then((res) => setFactories(res.data.factories))
      .catch(() => message.error("Failed to fetch factories"));
  }, []);

  // ── Filters ─────────────────────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || u.status === filterStatus || (filterStatus === "blocked" && u.isBlocked);
    const matchFactory = filterFactory === "all" || u.factory?.name === filterFactory || u.factory?._id === filterFactory;
    return matchSearch && matchStatus && matchFactory;
  });

  // ── Handlers ────────────────────────────────────────────────────────────────

  // Create: just prepend the new user (or refetch)
  const handleCreate = (newUser) => {
    setUsers((p) => [newUser, ...p]);
    fetchUsers(); // refetch to get populated factory
  };

  // Update: call API, replace in local state
  const handleUpdateUser = async (form) => {
    try {
      const payload = {
        name: form.name,
        email: form.email,
        factoryLocation: form.factoryLocation,
        workLocation: form.workLocation,
        factory: form.factory || null,
        status: form.status,
      };
      const res = await api.put(`/user/${form._id}`, payload);
      setUsers((p) => p.map((u) => u._id === form._id ? res.data.user : u));
      message.success("User updated successfully");
    } catch {
      message.error("Failed to update user");
    }
  };

  // Soft delete: call API, remove from local state
  const handleDelete = async (id) => {
    try {
      await api.delete(`/user/${id}`);
      setUsers((p) => p.filter((u) => u._id !== id));
      message.success("User deleted successfully");
    } catch {
      message.error("Failed to delete user");
    }
  };

  // Block/Unblock: call API, update local state
  const handleToggleBlock = async (user) => {
    try {
      const res = await api.patch(`/user/${user._id}/block`);
      setUsers((p) => p.map((u) => u._id === user._id ? res.data.user : u));
      message.success(res.data.message);
    } catch {
      message.error("Failed to update block status");
    }
  };

  // ── Stats ───────────────────────────────────────────────────────────────────
  const statsBar = [
    { label: "Total",    value: users.length,                                     color: "#6366f1" },
    { label: "Active",   value: users.filter(u => u.status === "active" && !u.isBlocked).length, color: "#15803d" },
    { label: "Blocked",  value: users.filter(u => u.isBlocked).length,            color: "#dc2626" },
    { label: "Inactive", value: users.filter(u => u.status === "inactive").length, color: "#6b7280" },
  ];

  const ActionBtn = ({ label, color, bg, onClick }) => (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} style={{
      background: bg, color, border: "none", borderRadius: 7,
      padding: "4px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
    }}>{label}</button>
  );

  const workLabelMap = { atGate: "At Gate", storeSite: "Store Site", dispatchSite: "Dispatch Site", pickupSite: "Pickup Site" };

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
          background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none",
          borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 7, boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
        }}>＋ Create User</button>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        {statsBar.map((s) => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "14px 20px", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 10, flex: "1 1 100px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#6b7280" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍  Search name or email…" style={{
          border: "1.5px solid #e5e7eb", borderRadius: 9, padding: "8px 14px", fontSize: 13.5,
          color: "#111", background: "#fff", outline: "none", flex: "1 1 200px", fontFamily: "inherit", minWidth: 180,
        }} />
        {[["all", "All Status"], ["active", "Active"], ["blocked", "Blocked"], ["inactive", "Inactive"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilterStatus(v)} style={{
            border: filterStatus === v ? "1.5px solid #6366f1" : "1.5px solid #e5e7eb",
            background: filterStatus === v ? "#ede9fe" : "#fff",
            color: filterStatus === v ? "#6366f1" : "#374151",
            borderRadius: 8, padding: "7px 14px", fontSize: 12.5,
            fontWeight: filterStatus === v ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
          }}>{l}</button>
        ))}
        <select value={filterFactory} onChange={(e) => setFilterFactory(e.target.value)} style={{
          border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "7px 12px",
          fontSize: 12.5, color: "#374151", background: "#fff", cursor: "pointer", fontFamily: "inherit",
        }}>
          <option value="all">All Factories</option>
          {factories.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["User", "Factory", "Work Location", "Status", "Joined", "Actions"].map((h) => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "#6b7280", letterSpacing: .5, textTransform: "uppercase", borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af", fontSize: 14 }}>No users found</td></tr>
            ) : filtered.map((u) => (
              <tr key={u._id} style={{ cursor: "pointer", borderBottom: "1px solid #f5f5f5" }}
                onMouseEnter={(e) => Array.from(e.currentTarget.cells).forEach(c => c.style.background = "#f8f9ff")}
                onMouseLeave={(e) => Array.from(e.currentTarget.cells).forEach(c => c.style.background = "")}
                onClick={() => setSelectedUser(u)}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#e0e7ff,#c7d2fe)", display: "flex", alignItems: "center", justifyContent: "center", color: "#6366f1", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                      {u.name[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#111" }}>{u.name}</div>
                      <div style={{ fontSize: 11.5, color: "#9ca3af" }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: "#374151", fontWeight: 600 }}>{u.factory?.name || "Not Assigned"}</td>
                <td style={{ padding: "12px 16px", fontSize: 12.5, color: "#6b7280" }}>{workLabelMap[u.workLocation] || u.workLocation}</td>
                <td style={{ padding: "12px 16px" }}>
                  <Badge color={u.isBlocked ? "blocked" : u.status}>
                    {u.isBlocked ? "blocked" : u.status}
                  </Badge>
                </td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "#9ca3af" }}>{fmtDate(u.createdAt)}</td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 5, flexWrap: "nowrap" }}>
                    <ActionBtn label="Edit" color="#6366f1" bg="#ede9fe" onClick={() => setEditUser(u)} />
                    <ActionBtn
                      label={u.isBlocked ? "Unblock" : "Block"}
                      color={u.isBlocked ? "#15803d" : "#92400e"}
                      bg={u.isBlocked ? "#dcfce7" : "#fef9c3"}
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

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreate}
        factories={factories}
      />

      <EditUserModal
        user={editUser}
        onClose={() => setEditUser(null)}
        onSave={handleUpdateUser}
        factories={factories}
      />

      <ConfirmModal
        open={!!deleteUser} onClose={() => setDeleteUser(null)}
        onConfirm={() => handleDelete(deleteUser._id)}
        title="Delete User Account"
        message={`Are you sure you want to permanently delete "${deleteUser?.name}"? This action cannot be undone.`}
        danger
      />

      <ConfirmModal
        open={!!blockUser} onClose={() => setBlockUser(null)}
        onConfirm={() => handleToggleBlock(blockUser)}
        title={blockUser?.isBlocked ? "Unblock User" : "Block User"}
        message={
          blockUser?.isBlocked
            ? `Unblock "${blockUser?.name}"? They will regain access to the system.`
            : `Block "${blockUser?.name}"? They won't be able to log in until unblocked.`
        }
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