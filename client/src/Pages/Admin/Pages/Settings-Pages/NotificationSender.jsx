import { useState, useEffect } from "react";
import {
  Form, Input, Button, Select, Table, Tag, Avatar, Space, Typography,
  Card, Row, Col, Divider, Badge, Steps, Alert, Tooltip, Empty,
  Statistic, message, Spin
} from "antd";
import {
  BellOutlined, SendOutlined, UserOutlined, ShopOutlined,
  EnvironmentOutlined, TeamOutlined, CheckCircleOutlined,
  FilterOutlined, EyeOutlined, ArrowLeftOutlined, ArrowRightOutlined
} from "@ant-design/icons";

import api from "../../../../../services/API/Api/api";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// ─── Constants matching your schema enums ────────────────────────────────────
const FACTORY_LOCATIONS = [
  { value: "NGM",  label: "NGM" },
  { value: "PGTL", label: "PGTL" },
];

const WORK_LOCATIONS = [
  { value: "atGate",       label: "At Gate" },
  { value: "storeSite",    label: "Store Site" },
  { value: "dispatchSite", label: "Dispatch Site" },
  { value: "pickupSite",   label: "Pickup Site" },
];

const TARGET_MODES = [
  { value: "all",                    label: "All Users",                icon: <TeamOutlined /> },
  { value: "by_factory",             label: "By Factory",               icon: <ShopOutlined /> },
  { value: "by_factory_worklocation",label: "Factory + Work Location",  icon: <EnvironmentOutlined /> },
  { value: "by_worklocation",        label: "By Work Location",         icon: <EnvironmentOutlined /> },
  { value: "selective",              label: "Selective Users",          icon: <UserOutlined /> },
];

const WORK_LOCATION_COLORS = {
  atGate:       "blue",
  storeSite:    "green",
  dispatchSite: "orange",
  pickupSite:   "purple",
};

// ─── Step 1: Target Selector ──────────────────────────────────────────────────
function TargetSelector({ factories, onPreview, loading }) {
  const [form]        = Form.useForm();
  const [mode, setMode] = useState(null);

  const handleFinish = (values) => onPreview(values);

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
      {/* Target Mode */}
      <Form.Item
        name="targetMode"
        label={<Text strong>Send To</Text>}
        rules={[{ required: true, message: "Select a target" }]}
      >
        <Select
          placeholder="Choose who receives this notification…"
          size="large"
          onChange={(v) => { setMode(v); form.setFieldsValue({ factoryIds: [], workLocations: [], factoryLocation: undefined }); }}
        >
          {TARGET_MODES.map(m => (
            <Option key={m.value} value={m.value}>
              <Space>{m.icon}{m.label}</Space>
            </Option>
          ))}
        </Select>
      </Form.Item>

      {/* By Factory */}
      {(mode === "by_factory" || mode === "by_factory_worklocation") && (
        <Form.Item
          name="factoryIds"
          label="Factories"
          rules={[{ required: true, message: "Select at least one factory" }]}
        >
          <Select mode="multiple" placeholder="Select factories…" size="large" optionFilterProp="children">
            {factories.map(f => (
              <Option key={f._id} value={f._id}>
                <Space><ShopOutlined style={{ color: "#94A3B8" }} />{f.name}{f.location && <Text type="secondary">— {f.location}</Text>}</Space>
              </Option>
            ))}
          </Select>
        </Form.Item>
      )}

      {/* By workLocation */}
      {(mode === "by_worklocation" || mode === "by_factory_worklocation") && (
        <Form.Item
          name="workLocations"
          label="Work Locations"
          rules={[{ required: true, message: "Select at least one work location" }]}
        >
          <Select mode="multiple" placeholder="Select work locations…" size="large">
            {WORK_LOCATIONS.map(l => (
              <Option key={l.value} value={l.value}>
                <Tag color={WORK_LOCATION_COLORS[l.value]}>{l.label}</Tag>
              </Option>
            ))}
          </Select>
        </Form.Item>
      )}

      <Form.Item style={{ marginBottom: 0 }}>
        <Button
          type="primary" htmlType="submit" icon={<EyeOutlined />}
          size="large" loading={loading} block
        >
          Preview Recipients
        </Button>
      </Form.Item>
    </Form>
  );
}

// ─── Step 2: Preview Recipients Table ────────────────────────────────────────
function RecipientsPreview({ users, onBack, onNext }) {
  const columns = [
    {
      title: "User",
      dataIndex: "name",
      key: "name",
      render: (name, r) => (
        <Space>
          <Avatar style={{ background: "linear-gradient(135deg,#3B82F6,#0EA5E9)", fontWeight: 700 }}>
            {name?.split(" ").map(n => n[0]).slice(0, 2).join("")}
          </Avatar>
          <div>
            <Text strong style={{ display: "block", fontSize: 13 }}>{name}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>{r.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Factory",
      key: "factory",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 13 }}>{r.factory?.name ?? "—"}</Text>
        </Space>    
      ),
    },
    {
      title: "Location",
      key: "factory",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Tag variant="border" style={{ fontSize: 10, color: "blue", border: "1px solid blue" }}>{r.factory?.location ?? "—"}</Tag>
        </Space>    
      ),
    },
    {
      title: "Work Location",
      dataIndex: "workLocation",
      key: "workLocation",
      render: (wl) => <Tag color={WORK_LOCATION_COLORS[wl]}>{WORK_LOCATIONS.find(l => l.value === wl)?.label ?? wl}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => <Badge status={s === "active" ? "success" : "default"} text={s} />,
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Space>
          <TeamOutlined style={{ color: "#3B82F6" }} />
          <Text strong>{users.length} recipient{users.length !== 1 ? "s" : ""} matched</Text>
        </Space>
      </div>

      {users.length === 0 ? (
        <Empty description="No users match the selected filters" style={{ padding: "40px 0" }} />
      ) : (
        <Table
          columns={columns}
          dataSource={users}
          rowKey="_id"
          size="small"
          pagination={{ pageSize: 6, size: "small" }}
          style={{ marginBottom: 16 }}
        />
      )}

      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>Change Target</Button>
        <Button
          type="primary" icon={<ArrowRightOutlined />}
          onClick={onNext} disabled={users.length === 0}
        >
          Compose Notification
        </Button>
      </Space>
    </div>
  );
}

// ─── Step 3: Compose & Send ───────────────────────────────────────────────────
function ComposeNotification({ users, targetPayload, onBack, onDone }) {
  const [form]    = Form.useForm();
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [result,  setResult]  = useState(null);

  const handleSend = async (values) => {
    setSending(true);
    try {
      const res = await api.post("/settings/notifications/send", {
        ...targetPayload,
        header:  values.header,
        message: values.message,
      });

        setSent(true);
        setResult(res.data);
        message.success(`Notification sent to ${res.data?.sentCount ?? users.length} users`);
     
    } catch (err) {
      message.error( err.res.data?.message || "Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <CheckCircleOutlined style={{ fontSize: 52, color: "#22C55E", marginBottom: 16 }} />
        <Title level={4} style={{ margin: "0 0 8px" }}>Notification Sent!</Title>
        <Text type="secondary">Successfully delivered to <Text strong>{result?.sentCount ?? users.length}</Text> users.</Text>
        {result?.failedCount > 0 && (
          <Alert
            type="warning" showIcon style={{ marginTop: 16, textAlign: "left" }}
            message={`${result.failedCount} user(s) could not be notified`}
          />
        )}
        <div style={{ marginTop: 28 }}>
          <Button type="primary" icon={<BellOutlined />} onClick={onDone}>
            Send Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form form={form} layout="vertical" onFinish={handleSend} requiredMark={false}>
      {/* Recipients summary */}
      <div style={{
        background: "#EFF6FF", border: "1px solid #DBEAFE", borderRadius: 8,
        padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10
      }}>
        <TeamOutlined style={{ color: "#3B82F6" }} />
        <Text style={{ fontSize: 13 }}>
          Sending to <Text strong style={{ color: "#2563EB" }}>{users.length} user{users.length !== 1 ? "s" : ""}</Text>
        </Text>
      </div>

      <Form.Item
        name="header"
        label="Notification Title"
        rules={[
          { required: true, message: "Title is required" },
          { max: 80, message: "Keep it under 80 characters" },
        ]}
      >
        <Input
          prefix={<BellOutlined style={{ color: "#94A3B8" }} />}
          placeholder="e.g. Scheduled Maintenance Tonight"
          size="large"
          showCount maxLength={80}
        />
      </Form.Item>

      <Form.Item
        name="message"
        label="Message"
        rules={[
          { required: true, message: "Message is required" },
          { max: 300, message: "Keep it under 300 characters" },
        ]}
      >
        <TextArea
          placeholder="Write your notification message here…"
          rows={4}
          showCount maxLength={300}
          size="large"
        />
      </Form.Item>

      <Divider style={{ margin: "16px 0" }} />

      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>Back</Button>
        <Button
          type="primary" htmlType="submit"
          icon={<SendOutlined />} loading={sending}
          size="large"
        >
          Send to {users.length} User{users.length !== 1 ? "s" : ""}
        </Button>
      </Space>
    </Form>
  );
}

// ─── Main Notification Sender ─────────────────────────────────────────────────
export default function NotificationSender() {
  const [step,          setStep]          = useState(0);
  const [factories,     setFactories]     = useState([]);
  const [previewUsers,  setPreviewUsers]  = useState([]);
  const [targetPayload, setTargetPayload] = useState(null);
  const [loadingFac,    setLoadingFac]    = useState(true);
  const [loadingPrev,   setLoadingPrev]   = useState(false);

  useEffect(() => {
    api.get("/factories")
      .then(r => setFactories(r.data?.factories ?? []))
      .catch(() => message.error("Failed to load factories"))
      .finally(() => setLoadingFac(false));
  }, []);

  const handlePreview = async (values) => {
    setLoadingPrev(true);
    setTargetPayload(values);
    try {
      const res = await api.post("/settings/notifications/preview", values);
        setPreviewUsers(res.data.users ?? []);
        setStep(1);
      
    } catch {
      message.error("Network error. Please try again.");
    } finally {
      setLoadingPrev(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setPreviewUsers([]);
    setTargetPayload(null);
  };

  const STEPS = [
    { title: "Target",   icon: <FilterOutlined /> },
    { title: "Preview",  icon: <EyeOutlined /> },
    { title: "Compose",  icon: <SendOutlined /> },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Title level={4} style={{ margin: "0 0 4px" }}>
          <BellOutlined style={{ marginRight: 8, color: "#3B82F6" }} />
          Send Notification
        </Title>
        <Text type="secondary">Push notifications to users by factory, work location, or individually.</Text>
      </div>

      {/* Steps indicator */}
      <Steps
        current={step}
        items={STEPS}
        size="large"
        style={{ marginBottom: 32 }}
      />

      {/* Step content */}
      <Card style={{ borderColor: "#E2E8F0", borderRadius: 12 }} bodyStyle={{ padding: 28 }}>
        {loadingFac ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            {step === 0 && (
              <TargetSelector
                factories={factories}
                onPreview={handlePreview}
                loading={loadingPrev}
              />
            )}
            {step === 1 && (
              <RecipientsPreview
                users={previewUsers}
                onBack={() => setStep(0)}
                onNext={() => setStep(2)}
              />
            )}
            {step === 2 && (
              <ComposeNotification
                users={previewUsers}
                targetPayload={targetPayload}
                onBack={() => setStep(1)}
                onDone={handleReset}
              />
            )}
          </>
        )}
      </Card>

      {/* Quick stats */}
      {step === 0 && !loadingFac && (
        <Row gutter={16} style={{ marginTop: 20 }}>
          <Col span={12}>
            <Card size="small" style={{ borderColor: "#DBEAFE", background: "#EFF6FF" }}>
              <Statistic
                title="Total Factories"
                value={factories.length}
                prefix={<ShopOutlined />}
                valueStyle={{ color: "#3B82F6", fontWeight: 800 }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" style={{ borderColor: "#DCFCE7", background: "#F0FDF4" }}>
              <Statistic
                title="Work Locations"
                value={WORK_LOCATIONS.length}
                prefix={<EnvironmentOutlined />}
                valueStyle={{ color: "#16A34A", fontWeight: 800 }}
              />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}