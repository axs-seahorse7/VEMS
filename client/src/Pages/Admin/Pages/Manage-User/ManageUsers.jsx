import { useState, useEffect } from "react";
import api from "../../../../../services/API/Api/api";
import {
  Table, Input, Select, Button, Modal, Form, Switch, Tag, Space,
  Avatar, Tooltip, Popconfirm, message, Card, Statistic, Row, Col, Badge
} from "antd";
import {
  UserOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  LockOutlined, UnlockOutlined, KeyOutlined, SearchOutlined,
  CrownOutlined, TeamOutlined, StopOutlined, CheckCircleOutlined,
} from "@ant-design/icons";

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const workLabelMap = {
  atGate: "Security Gate",
  storeSite: "Store Site",
  dispatchSite: "Dispatch Site",
  pickupSite: "Pickup Site",
};

const workLocationOptions = [
  { value: "atGate",       label: "Security Gate"  },
  { value: "storeSite",    label: "Store Site"     },
  { value: "dispatchSite", label: "Dispatch Site"  },
  { value: "pickupSite",   label: "Pickup Site"    },
];

const locationOptions = [
  { value: "supa",       label: "Supa, MH"  },
  { value: "Bhiwadi",    label: "Bhiwadi, RJ"     },
  { value: "Karoli", label: "Karoli, DL"  },
];

// ── Status tag ────────────────────────────────────────────────────────────────
const StatusTag = ({ user }) => {
  if (user.isBlocked)          return <Tag color="error">Blocked</Tag>;
  if (user.status === "active") return <Tag color="success">Active</Tag>;
  return <Tag color="default">Inactive</Tag>;
};

// ── Create User Modal ─────────────────────────────────────────────────────────
function CreateUserModal({ open, onClose, onSave, factories }) {
  const [form] = Form.useForm();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const payload = { ...values, role: isAdmin ? "admin" : "user" };
      await api.post("/auth/register", payload);
      onSave({ ...payload, _id: "u" + Date.now(), status: "active", createdAt: new Date().toISOString() });
      message.success("User created successfully");
      form.resetFields();
      setIsAdmin(false);
      onClose();
    } catch (err) {
      if (err?.errorFields) return; // validation error, don't show message
      message.error("Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setIsAdmin(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={
        <Space>
          <PlusOutlined style={{ color: "#6366f1" }} />
          <span style={{ fontWeight: 800 }}>Create New User</span>
        </Space>
      }
      footer={null}
      width={580}
      destroyOnClose
    >
      {/* Admin Toggle */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: isAdmin ? "#ede9fe" : "#f8fafc",
        border: `1.5px solid ${isAdmin ? "#6366f1" : "#e5e7eb"}`,
        borderRadius: 10, padding: "12px 16px", marginBottom: 20,
        transition: "all 0.2s",
      }}>
        <Space>
          <CrownOutlined style={{ color: isAdmin ? "#6366f1" : "#9ca3af", fontSize: 16 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: isAdmin ? "#6366f1" : "#374151" }}>
              System Administrator
            </div>
            <div style={{ fontSize: 11.5, color: "#9ca3af" }}>
              Admin users have full access to all modules
            </div>
          </div>
        </Space>
        <Switch
          checked={isAdmin}
          onChange={setIsAdmin}
          style={{ background: isAdmin ? "#6366f1" : undefined }}
        />
      </div>

      <Form form={form} layout="vertical" requiredMark={false}>
        <Row gutter={14}>
          <Col span={12}>
            <Form.Item label="Full Name" name="name" rules={[{ required: true, message: "Required" }]}>
              <Input prefix={<UserOutlined style={{ color: "#9ca3af" }} />} placeholder="Enter full name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Email" name="email" rules={[{ required: true, type: "email", message: "Valid email required" }]}>
              <Input placeholder="Enter email address" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Password" name="password" rules={[{ required: true, min: 6, message: "Min 6 characters" }]}>
              <Input.Password placeholder="Enter password" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Factory" name="factory" rules={[{ required: true, message: "Required" }]}>
              <Select placeholder="Select factory" options={factories.map(f => ({ value: f._id, label: f.name }))} />
            </Form.Item>
          </Col>
          {isAdmin || form?.role === "admin" ? (
            <Col span={12}>
              <Form.Item label="Location" name="location" initialValue="supa">
                <Select options={locationOptions} />
              </Form.Item>
            </Col>
          ) : (
            <Col span={12}>
              <Form.Item label="Work Location" name="workLocation" initialValue="atGate">
                <Select options={workLocationOptions} disabled={isAdmin} />
              </Form.Item>
            </Col>
          ) }
            <Col span={12}>
              <Form.Item label="Status" name="status" initialValue="active">
                <Select options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
              </Form.Item>
            </Col>
        </Row>
      </Form>

      <div style={{ display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
        <Button
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          style={{ background: "#6366f1", borderColor: "#6366f1", fontWeight: 700 }}
          icon={<PlusOutlined />}
        >
          Create User
        </Button>
        <Button onClick={handleClose}>Cancel</Button>
      </div>
    </Modal>
  );
}

// ── Edit User Modal ───────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onSave, factories }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        ...user,
        factory: user.factory?._id || user.factory || "",
      });
    }
  }, [user, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await onSave({ ...values, _id: user._id });
      onClose();
    } catch {
      // validation handled by antd
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={!!user}
      onCancel={onClose}
      title={
        <Space>
          <EditOutlined style={{ color: "#6366f1" }} />
          <span style={{ fontWeight: 800 }}>Edit — {user?.name}</span>
        </Space>
      }
      footer={null}
      width={560}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 16 }}>
        <Row gutter={14}>
          <Col span={12}>
            <Form.Item label="Full Name" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Email" name="email" rules={[{ required: true, type: "email" }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Factory" name="factory">
              <Select options={factories.map(f => ({ value: f._id, label: f.name }))} placeholder="Select factory" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Work Location" name="workLocation">
              <Select options={workLocationOptions} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Status" name="status">
              <Select options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <div style={{ display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
        <Button
          type="primary"
          loading={loading}
          onClick={handleSave}
          style={{ background: "#6366f1", borderColor: "#6366f1", fontWeight: 700 }}
        >
          Save Changes
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </div>
    </Modal>
  );
}

// ── User Detail Drawer ────────────────────────────────────────────────────────
function UserDetailModal({ user, onClose }) {
  return (
    <Modal
      open={!!user}
      onCancel={onClose}
      title={<span style={{ fontWeight: 800 }}>User Details</span>}
      footer={null}
      width={480}
    >
      {user && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #f0f0f0" }}>
            <Avatar size={52} style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)", fontSize: 20, fontWeight: 800 }}>
              {user.name?.[0]}
            </Avatar>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>{user.name}</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>{user.email}</div>
              <Space style={{ marginTop: 6 }}>
                <StatusTag user={user} />
                {user.isSystemAdmin && <Tag color="purple" icon={<CrownOutlined />}>System Admin</Tag>}
              </Space>
            </div>
          </div>

          <Row gutter={[16, 16]}>
            {[
              { label: "Factory",       value: user.factory?.name || "Not assigned" },
              { label: "Work Location", value: workLabelMap[user.workLocation] || user.workLocation },
              { label: "Member Since",  value: fmtDate(user.createdAt) },
              { label: "Role",          value: user.role || "user" },
            ].map(({ label, value }) => (
              <Col span={12} key={label}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#111" }}>{value}</div>
              </Col>
            ))}
          </Row>
        </div>
      )}
    </Modal>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ManageUsers() {
  const [users, setUsers]               = useState([]);
  const [factories, setFactories]       = useState([]);
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFactory, setFilterFactory] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [editUser, setEditUser]         = useState(null);
  const [createOpen, setCreateOpen]     = useState(false);
  const [loading, setLoading]           = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(res.data.users);
    } catch {
      message.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    api.get("/factories")
      .then(res => setFactories(res.data.factories))
      .catch(() => message.error("Failed to fetch factories"));
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch  = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchStatus  = filterStatus === "all" || u.status === filterStatus || (filterStatus === "blocked" && u.isBlocked);
    const matchFactory = filterFactory === "all" || u.factory?._id === filterFactory;
    return matchSearch && matchStatus && matchFactory;
  });

  const handleCreate = () => fetchUsers();

  const handleUpdateUser = async (form) => {
    try {
      const res = await api.put(`/user/${form._id}`, form);
      setUsers(p => p.map(u => u._id === form._id ? res.data.user : u));
      message.success("User updated");
    } catch {
      message.error("Failed to update user");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/user/${id}`);
      setUsers(p => p.filter(u => u._id !== id));
      message.success("User deleted");
    } catch {
      message.error("Failed to delete user");
    }
  };

  const handleToggleBlock = async (user) => {
    try {
      const res = await api.patch(`/user/${user._id}/block`);
      setUsers(p => p.map(u => u._id === user._id ? res.data.user : u));
      message.success(res.data.message);
    } catch {
      message.error("Failed to update block status");
    }
  };

  const stats = [
    { label: "Total Users",    value: users.length,                                                  color: "#6366f1", icon: <TeamOutlined /> },
    { label: "Active",         value: users.filter(u => u.status === "active" && !u.isBlocked).length, color: "#15803d", icon: <CheckCircleOutlined /> },
    { label: "Blocked",        value: users.filter(u => u.isBlocked).length,                         color: "#dc2626", icon: <StopOutlined /> },
    { label: "Inactive",       value: users.filter(u => u.status === "inactive").length,              color: "#6b7280", icon: <UserOutlined /> },
  ];

  const columns = [
    {
      title: "User",
      dataIndex: "name",
      key: "name",
      render: (_, u) => (
        <Space>
          <Avatar style={{ background: "linear-gradient(135deg,#e0e7ff,#c7d2fe)", color: "#6366f1", fontWeight: 800 }}>
            {u.name?.[0]}
          </Avatar>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>{u.name}</div>
            <div style={{ fontSize: 11.5, color: "#9ca3af" }}>{u.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "Factory",
      dataIndex: ["factory", "name"],
      key: "factory",
      render: (v) => v || <span style={{ color: "#9ca3af" }}>Not assigned</span>,
    },
    {
      title: "Work Location",
      dataIndex: "workLocation",
      key: "workLocation",
      render: (v) => workLabelMap[v] || v,
    },
    {
      title: "Status",
      key: "status",
      render: (_, u) => <StatusTag user={u} />,
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (v, u) => u.isSystemAdmin || v === "admin"
        ? <Tag icon={<CrownOutlined />} color="purple">Admin</Tag>
        : <Tag color="default">User</Tag>,
    },
    {
      title: "Joined",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v) => <span style={{ fontSize: 12, color: "#9ca3af" }}>{fmtDate(v)}</span>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, u) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={e => { e.stopPropagation(); setEditUser(u); }}
              style={{ color: "#6366f1", borderColor: "#e0e7ff", background: "#ede9fe" }} />
          </Tooltip>
          <Tooltip title={u.isBlocked ? "Unblock" : "Block"}>
            <Button size="small"
              icon={u.isBlocked ? <UnlockOutlined /> : <LockOutlined />}
              onClick={e => { e.stopPropagation(); handleToggleBlock(u); }}
              style={{
                color: u.isBlocked ? "#15803d" : "#92400e",
                borderColor: u.isBlocked ? "#bbf7d0" : "#fef08a",
                background: u.isBlocked ? "#dcfce7" : "#fef9c3",
              }}
            />
          </Tooltip>
          <Tooltip title="Reset Password">
            <Button size="small" icon={<KeyOutlined />} onClick={e => e.stopPropagation()}
              style={{ color: "#0369a1", borderColor: "#bae6fd", background: "#e0f2fe" }} />
          </Tooltip>
          {!u.isSystemAdmin && (
            <Tooltip title="Delete">
              <Popconfirm
                title="Delete user?"
                description={`Permanently delete "${u.name}"?`}
                onConfirm={e => { handleDelete(u._id); }}
                onCancel={e => e?.stopPropagation()}
                okText="Delete"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger icon={<DeleteOutlined />} onClick={e => e.stopPropagation()}
                  style={{ background: "#fef2f2" }} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: "0 0 4px" }}>User Management</h2>
          <p style={{ fontSize: 13.5, color: "#6b7280", margin: 0 }}>Manage all operator accounts and access control.</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
          style={{ background: "#6366f1", borderColor: "#6366f1", fontWeight: 700, height: 38, borderRadius: 9 }}
        >
          Create User
        </Button>
      </div>

      {/* Stats */}
      <Row gutter={14} style={{ marginBottom: 20 }}>
        {stats.map(s => (
          <Col key={s.label} xs={12} sm={6}>
            <Card size="small" style={{ borderRadius: 12, border: "1px solid #e5e7eb" }} bodyStyle={{ padding: "14px 18px" }}>
              <Statistic
                title={<span style={{ fontSize: 12, color: "#6b7280" }}>{s.label}</span>}
                value={s.value}
                valueStyle={{ color: s.color, fontSize: 22, fontWeight: 800 }}
                prefix={s.icon}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16, borderRadius: 12, border: "1px solid #e5e7eb" }} bodyStyle={{ padding: "12px 16px" }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
            placeholder="Search name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 220, borderRadius: 8 }}
            allowClear
          />
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 140 }}
            options={[
              { value: "all",      label: "All Status"  },
              { value: "active",   label: "Active"      },
              { value: "blocked",  label: "Blocked"     },
              { value: "inactive", label: "Inactive"    },
            ]}
          />
          <Select
            value={filterFactory}
            onChange={setFilterFactory}
            style={{ width: 180 }}
            options={[
              { value: "all", label: "All Factories" },
              ...factories.map(f => ({ value: f._id, label: f.name })),
            ]}
          />
        </Space>
      </Card>

      {/* Table */}
      <Card style={{ borderRadius: 12, border: "1px solid #e5e7eb" }} bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="_id"
          loading={loading}
          size="middle"
          pagination={{ pageSize: 10, showTotal: (t, r) => `Showing ${r[0]}–${r[1]} of ${t} users`, showSizeChanger: false }}
          onRow={u => ({ onClick: () => setSelectedUser(u), style: { cursor: "pointer" } })}
        />
      </Card>

      {/* Modals */}
      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreate} factories={factories} />
      <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSave={handleUpdateUser} factories={factories} />
    </div>
  );
}