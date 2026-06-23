import { useState, useEffect } from "react";
import {
  Layout, Menu, Typography, Button, Table, Tag, Popconfirm,
  Modal, Form, Input, Select, Space, Badge, Statistic, Row, Col,
  Card, message, Tooltip, Divider, InputNumber
} from "antd";
import {
  MailOutlined, GlobalOutlined, SafetyOutlined, PlusOutlined,
  DeleteOutlined, BellOutlined, ShopOutlined, UserOutlined,
  SettingOutlined, ExclamationCircleOutlined, EnvironmentOutlined,
  EditOutlined, PauseCircleOutlined, PlayCircleOutlined,
} from "@ant-design/icons";

import api from "../../../../../services/API/Api/api";
import NotificationSender from "../Settings-Pages/NotificationSender";
import VersionManager from "../Settings-Pages/VersionManager";
import SecurityManager from "../Settings-Pages/SecurityManager";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const SETTINGS_SECTIONS = [
  { key: "alerts",   label: "Email Alerts",   icon: <MailOutlined />,   component: "AlertsSection"  },
  { key: "notifications",   label: "Notifications",   icon: <BellOutlined />,   component: "NotificationsSection" },
  { key: "security", label: "Security", icon: <SafetyOutlined />, component: "SecurityManager" },
  { key: "general",  label: "General",  icon: <GlobalOutlined />, component: "ComingSoon",   disabled: true },
  { key: "versions", label: "Versions", icon: <SettingOutlined />, component: "VersionManager" },
];

const ALERT_SUBSCRIPTION_OPTIONS = [
  { label: "Trip Cancelled", value: "tripCancelled" },
  { label: "Delay 4h+",      value: "delay4h" },
  { label: "Delay 12h+",     value: "delay12h" },
  { label: "Delay 24h+",     value: "delay24h" },
  { label: "Vehicle Entry",  value: "vehicleEntry" },
  { label: "Vehicle Exit",   value: "vehicleExit" },
];

// ─── Add / Edit Alert User Modal ──────────────────────────────────────────────
function AlertUserModal({ open, mode, factories, initialValues, onSave, onClose }) {
  const [form]    = Form.useForm();
  const [loading, setLoading] = useState(false);
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;
    if (isEdit && initialValues) {
      form.setFieldsValue({
        name: initialValues.name,
        email: initialValues.email,
        factoryId: typeof initialValues.factoryId === "object" ? initialValues.factoryId?._id : initialValues.factoryId,
        alertSubscriptions: initialValues.alertSubscriptions ?? ["tripCancelled"],
      });
    } else {
      form.resetFields();
    }
  }, [open, isEdit, initialValues, form]);

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      if (isEdit) {
        const res = await api.patch(`/settings/alert-users/${initialValues._id}`, values);
        message.success("Alert recipient updated successfully");
        onSave(res.data.data);
      } else {
        const res = await api.post("/settings/alert-users", values);
        message.success("Alert recipient added successfully");
        onSave(res.data.data);
      }
      form.resetFields();
    } catch (error) {
      message.error(error.response?.data?.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      footer={null}
      title={
        <Space>
          <BellOutlined style={{ color: "#3B82F6" }} />
          <span>{isEdit ? "Edit Alert Recipient" : "Add Alert Recipient"}</span>
        </Space>
      }
      width={480}
      destroyOnClose
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
        This user will receive automated system alert emails for the selected alert types.
      </Text>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        requiredMark={false}
        initialValues={{ alertTypes: ["tripCancelled"], alertInterval: 15 }}
      >
        <Form.Item
          name="name"
          label="Full Name"
          rules={[{ required: true, message: "Name is required" }]}
        >
          <Input prefix={<UserOutlined />} placeholder="e.g. Ravi Sharma" size="large" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email Address"
          rules={[
            { required: true, message: "Email is required" },
            { type: "email",  message: "Enter a valid email" },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="e.g. ravi@company.com" size="large" />
        </Form.Item>

        <Form.Item
          name="factoryId"
          label="Factory"
          rules={[{ required: true, message: "Please select a factory" }]}
        >
          <Select
            placeholder="Select a factory…"
            size="large"
            showSearch
            optionFilterProp="children"
          >
            {factories.map(f => (
              <Option key={f._id} value={f._id}>
                <Space>
                  <ShopOutlined style={{ color: "#94A3B8" }} />
                  <span>{f.name}</span>
                  {f.location && <Text type="secondary" style={{ fontSize: 12 }}>— {f.location}</Text>}
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="alertSubscriptions"
          label="Alert Subscriptions"
          rules={[{ required: true, message: "Select at least one subscription" }]}
        >
          <Select
            mode="multiple"
            placeholder="Select alert subscriptions…"
            size="large"
            options={ALERT_SUBSCRIPTION_OPTIONS}
          />
        </Form.Item>

        <Divider style={{ margin: "16px 0" }} />

        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={() => { form.resetFields(); onClose(); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading} icon={isEdit ? <EditOutlined /> : <PlusOutlined />}>
              {isEdit ? "Save Changes" : "Save Recipient"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ─── Alerts Section ───────────────────────────────────────────────────────────
function AlertsSection() {
  const [users,       setUsers]       = useState([]);
  const [factories,   setFactories]   = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [modalState,  setModalState]  = useState({ open: false, mode: "add", record: null });
  const [filterFac,   setFilterFac]   = useState("all");
  const [updateLoading, setupdateLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingData(true);
      try {
        const [facRes, usersRes] = await Promise.all([
          api.get("/factories"),
          api.get("/settings/alert-users"),
        ]);
        setFactories(facRes.data.factories);
        setUsers(Array.isArray(usersRes.data.data) ? usersRes.data.data : []);
      } catch {
        message.error("Failed to load data");
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, []);

  const handlePauseToggle = async (id, isPaused) => {
    try {
      setupdateLoading(true);
      await api.patch(`/settings/alert-users/${id}/pause`, { isPaused: !isPaused });
      setUsers(prev => prev.map(x => x._id === id ? { ...x, isPaused: !isPaused } : x));
      message.success(`Recipient ${!isPaused ? "paused" : "resumed"}`);
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setupdateLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/settings/alert-users/${id}`);
      setUsers(prev => prev.filter(x => x._id !== id));
      message.success("Recipient removed");
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to delete recipient");
    }
  };

  const getFactory = (id) => factories.find(f => f._id === id);

  const displayed = filterFac === "all"
    ? users
    : users.filter(u => {
        const fid = typeof u.factoryId === "object" ? u.factoryId?._id : u.factoryId;
        return fid === filterFac;
      });

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, record) => (
        <Space>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: !record.isPaused ? "linear-gradient(135deg, #3B82F6, #0EA5E9)" : "#E2E8F0",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: !record.isPaused ? "#fff" : "#94A3B8", fontWeight: 700, fontSize: 13
          }}>
            {name?.split(" ").map(n => n[0]).slice(0, 2).join("")}
          </div>
          <div>
            <Text strong style={{ display: "block" }}>{name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <MailOutlined style={{ marginRight: 4 }} />{record.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Factory",
      dataIndex: "factoryId",
      key: "factory",
      render: (factoryId) => {
        const id = typeof factoryId === "object" ? factoryId?._id : factoryId;
        const f = getFactory(id);
        return f ? (
          <Space>
            <ShopOutlined style={{ color: "#94A3B8" }} />
            <Text style={{ fontSize: 13 }}>{f.name}</Text>
          </Space>
        ) : <Text type="secondary">—</Text>;
      },
    },
    {
      title: "Location",
      dataIndex: "factoryId",
      key: "location",
      render: (factoryId) => {
        const id = typeof factoryId === "object" ? factoryId?._id : factoryId;
        const f = getFactory(id);
        return f ? (
          <Space>
            <EnvironmentOutlined style={{ color: "#94A3B8" }} />
            <Text style={{ fontSize: 13 }}>{f.location}</Text>
          </Space>
        ) : <Text type="secondary">—</Text>;
      },
    },
    {
      title: "Subscriptions",
      dataIndex: "alertSubscriptions",
      key: "alertSubscriptions",
      render: (subs) => (
        <Space size={4} wrap>
          {(subs ?? []).map(s => (
            <Tag key={s} color="blue" style={{ fontSize: 11 }}>
              {ALERT_SUBSCRIPTION_OPTIONS.find(o => o.value === s)?.label ?? s}
            </Tag>
          ))}
        </Space>
      ),
    },
    // "Interval" column removed
    {
      title: "Status",
      dataIndex: "isPaused",
      key: "status",
      render: (isPaused) => (
        <Badge
          status={isPaused ? "default" : "success"}
          text={<Tag color={isPaused ? "default" : "green"}>{isPaused ? "Paused" : "Active"}</Tag>}
        />
      ),
    },
    {
      title: "Added",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d) => <Text type="secondary" style={{ fontSize: 12 }}>{new Date(d).toLocaleDateString()}</Text>,
    },
    {
      title: "",
      key: "actions",
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => setModalState({ open: true, mode: "edit", record })}
            />
          </Tooltip>
          <Tooltip title={record.isPaused ? "Resume" : "Pause"}>
            <Button
              type="text"
              icon={record.isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
              size="small"
              loading={updateLoading}
              onClick={() => handlePauseToggle(record._id, record.isPaused)}
            />
          </Tooltip>
          <Popconfirm
            title="Remove recipient"
            description="Are you sure you want to remove this alert recipient?"
            icon={<ExclamationCircleOutlined style={{ color: "#EF4444" }} />}
            onConfirm={() => handleDelete(record._id)}
            okText="Remove"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
          >
            <Tooltip title="Remove">
              <Button type="text" danger icon={<DeleteOutlined />} size="small" />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loadingData) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
        <Title level={4}>Loading Alert Recipients...</Title>
        <Text type="secondary">Please wait while we fetch the data.</Text>
      </div>
    );
  }

  return (
    <>
      <AlertUserModal
        open={modalState.open}
        mode={modalState.mode}
        factories={factories}
        initialValues={modalState.record}
        onSave={(u) => {
          const normalized = { ...u, factoryId: u.factoryId?._id ?? u.factoryId };
          setUsers(prev => {
            const exists = prev.some(x => x._id === normalized._id);
            return exists ? prev.map(x => x._id === normalized._id ? normalized : x) : [...prev, normalized];
          });
          setModalState({ open: false, mode: "add", record: null });
        }}
        onClose={() => setModalState({ open: false, mode: "add", record: null })}
      />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Alert Recipients</Title>
          <Text style={{ fontSize: 14, color: "#FF5722" }}>
            Users will receive automated alert emails for the selected alert types at the factory.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalState({ open: true, mode: "add", record: null })}
        >
          Add Alert User
        </Button>
      </div>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card size="small" style={{ borderColor: "#DBEAFE", background: "#EFF6FF" }}>
            <Statistic title="Total" value={Array.isArray(users) ? users.length : 0} valueStyle={{ color: "#3B82F6", fontWeight: 800 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderColor: "#DCFCE7", background: "#F0FDF4" }}>
            <Statistic title="Active" value={Array.isArray(users) ? users.filter(u => !u.isPaused).length : 0} valueStyle={{ color: "#16A34A", fontWeight: 800 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderColor: "#FEF3C7", background: "#FFFBEB" }}>
            <Statistic title="Paused" value={Array.isArray(users) ? users.filter(u => u.isPaused).length : 0} valueStyle={{ color: "#D97706", fontWeight: 800 }} />
          </Card>
        </Col>
      </Row>

      {/* Factory Filter */}
      <Space wrap style={{ marginBottom: 16 }}>
        {["all", ...factories.map(f => f._id)].map(fid => {
          const label = fid === "all" ? "All Factories" : (getFactory(fid)?.name ?? fid);
          return (
            <Button
              key={fid}
              size="small"
              type={filterFac === fid ? "primary" : "default"}
              onClick={() => setFilterFac(fid)}
              style={{ borderRadius: 20 }}
            >
              {label}
            </Button>
          );
        })}
      </Space>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={displayed}
        rowKey="_id"
        loading={loadingData}
        size="middle"
        pagination={{ pageSize: 8, size: "small" }}
        locale={{ emptyText: (
          <Space direction="vertical" style={{ padding: "32px 0" }}>
            <MailOutlined style={{ fontSize: 32, color: "#CBD5E1" }} />
            <Text type="secondary">No alert recipients yet!</Text>
          </Space>
        )}}
      />
    </>
  );
}

// ─── Coming Soon Placeholder ──────────────────────────────────────────────────
function ComingSoon({ label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
      <Text style={{ fontSize: 44, display: "block", marginBottom: 16 }}>🚧</Text>
      <Title level={4}>{label} Settings</Title>
      <Text type="secondary">This section is under construction and will be available soon.</Text>
    </div>
  );
}

// ─── Main Settings Panel ──────────────────────────────────────────────────────
export default function SettingsPanel() {
  const [activeSection, setActiveSection] = useState("alerts");
  const user = JSON.parse(localStorage.getItem("user")) || {};

  const renderSection = () => {
    const section = SETTINGS_SECTIONS.find(s => s.key === activeSection);
    if (!section) return null;
    if (section.component === "AlertsSection" && user.isSystemAdmin) return <AlertsSection />;
    if (section.component === "NotificationsSection" && user.isSystemAdmin) return <NotificationSender />;
    if (section.component === "VersionManager" && user.isSystemAdmin) return <VersionManager />;
    if (section.component === "SecurityManager") return <SecurityManager />;
    return <ComingSoon label={section.label} />;
  };

  const menuItems = SETTINGS_SECTIONS.map(s => ({
    key:      s.key,
    icon:     s.icon,
    label:    s.disabled ? <Space>{s.label}<Tag style={{ fontSize: 9, padding: "0 5px", lineHeight: "16px" }}>soon</Tag></Space> : s.label,
    disabled: s.disabled || (s.component === "AlertsSection" && !user.isSystemAdmin) || (s.component === "NotificationsSection" && !user.isSystemAdmin) || (s.component === "VersionManager" && !user.isSystemAdmin),
  }));

  return (
    <Layout style={{ height: "calc(100vh - 80px)", background: "#F1F5F9" }}>
      <Sider width={224} style={{ background: "#fff", borderRight: "1px solid #E2E8F0", overflow: "hidden" }}>
        <div style={{ padding: "28px 20px 16px" }}>
          <Text style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#CBD5E1", display: "block", marginBottom: 4 }}>
            Admin Panel
          </Text>
          <Title level={4} style={{ margin: 0 }}>
            <SettingOutlined style={{ marginRight: 8, color: "#3B82F6" }} />
            Settings
          </Title>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[activeSection]}
          items={menuItems}
          onClick={({ key }) => !SETTINGS_SECTIONS.find(s => s.key === key)?.disabled && setActiveSection(key)}
          style={{ border: "none", padding: "0 8px" }}
        />

        <div style={{
          position: "absolute", bottom: 16, left: 12, right: 12,
          padding: "10px 12px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0"
        }}>
          <Text style={{ fontSize: 11, color: "#CBD5E1", lineHeight: 1.6, display: "block" }}>
            Add sections via <code style={{ fontSize: 10, color: "#94A3B8" }}>SETTINGS_SECTIONS</code>
          </Text>
        </div>
      </Sider>

      <Content style={{ padding: "36px 40px", overflowY: "auto", background: "#fff" }}>
        {renderSection()}
      </Content>
    </Layout>
  );
}