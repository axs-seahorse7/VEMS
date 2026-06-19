import { useState } from "react";
import {
  Typography, Button, Form, Input, Space, Card, message,
  Table, Tag, Modal, Avatar, Empty, Row, Col, Tooltip
} from "antd";
import {
  LockOutlined, SafetyOutlined, UserOutlined, SearchOutlined,
  ArrowLeftOutlined, KeyOutlined, MailOutlined, ShopOutlined,
  CheckCircleOutlined, EditOutlined,
} from "@ant-design/icons";

import api from "../../../../../services/API/Api/api.js";

const { Title, Text } = Typography;

// ─── Option Picker Cards ──────────────────────────────────────────────────────
function SecurityHome({ onSelect }) {
  const options = [
    {
      key: "changePassword",
      icon: <LockOutlined style={{ fontSize: 22 }} />,
      title: "Change Password",
      desc: "Update your own admin account password.",
      color: "#3B82F6",
      bg: "#EFF6FF",
    },
    {
      key: "manageUsers",
      icon: <UserOutlined style={{ fontSize: 22 }} />,
      title: "Manage User Credentials",
      desc: "Search and update passwords for users in your factory.",
      color: "#7C3AED",
      bg: "#F5F3FF",
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Security</Title>
        <Text type="secondary">Manage account access and credentials.</Text>
      </div>
      <Row gutter={16}>
        {options.map(o => (
          <Col span={12} key={o.key}>
            <Card
              hoverable
              onClick={() => onSelect(o.key)}
              style={{ borderRadius: 12, height: "100%" }}
              styles={{ body: { padding: 24 } }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 10, background: o.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: o.color, marginBottom: 16,
              }}>
                {o.icon}
              </div>
              <Title level={5} style={{ margin: 0, marginBottom: 4 }}>{o.title}</Title>
              <Text type="secondary" style={{ fontSize: 13 }}>{o.desc}</Text>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}

// ─── Change Password ──────────────────────────────────────────────────────────
function ChangePassword({ onBack }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      },
      {
         skipAuthRedirect: true 
      });
      message.success("Password changed successfully");
      form.resetFields();
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420 }}>
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack} style={{ marginBottom: 16, paddingLeft: 0 }}>
        Back to Security
      </Button>

    <Card style={{ borderRadius: 12, padding: 24, }} bodyStyle={{ padding: 0 }}>
      <Title level={4} style={{ margin: 0 }}>Change Password</Title>
      <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
        Update the password used to log in to your admin account.
      </Text>

      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
        <Form.Item
          name="currentPassword"
          label="Current Password"
          rules={[{ required: true, message: "Current password is required" }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Enter current password" size="large" />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="New Password"
          rules={[
            { required: true, message: "New password is required" },
            { min: 6, message: "Password must be at least 6 characters" },
          ]}
          hasFeedback
        >
          <Input.Password prefix={<KeyOutlined />} placeholder="Enter new password" size="large" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm New Password"
          dependencies={["newPassword"]}
          hasFeedback
          rules={[
            { required: true, message: "Please confirm your new password" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) return Promise.resolve();
                return Promise.reject(new Error("Passwords do not match"));
              },
            }),
          ]}
        >
          <Input.Password prefix={<KeyOutlined />} placeholder="Re-enter new password" size="large" />
        </Form.Item>

        <Form.Item style={{ marginTop: 8, marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={loading} icon={<CheckCircleOutlined />} block size="large">
            Update Password
          </Button>
        </Form.Item>
      </Form>
    </Card>
    </div>
  );
}

// ─── Reset Password Modal (for a selected user) ───────────────────────────────
function ResetUserPasswordModal({ open, user, onClose, onSuccess }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      await api.patch(`/auth/users/${user._id}/password`, { newPassword: values.newPassword });
      message.success(`Password updated for ${user.name}`);
      form.resetFields();
      onSuccess();
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      footer={null}
      destroyOnClose
      title={
        <Space>
          <KeyOutlined style={{ color: "#7C3AED" }} />
          <span>Reset Password — {user?.name}</span>
        </Space>
      }
      width={420}
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 20 }}>
        Set a new password for <strong>{user?.email}</strong>. The user will need to use this new password on their next login.
      </Text>

      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
        <Form.Item
          name="newPassword"
          label="New Password"
          rules={[
            { required: true, message: "New password is required" },
            { min: 6, message: "Password must be at least 6 characters" },
          ]}
        >
          <Input.Password prefix={<KeyOutlined />} placeholder="Enter new password" size="large" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm Password"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: "Please confirm the password" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) return Promise.resolve();
                return Promise.reject(new Error("Passwords do not match"));
              },
            }),
          ]}
        >
          <Input.Password prefix={<KeyOutlined />} placeholder="Re-enter new password" size="large" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={() => { form.resetFields(); onClose(); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading} icon={<KeyOutlined />}>
              Update Password
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ─── Manage User Credentials ──────────────────────────────────────────────────
function ManageUserCredentials({ onBack }) {
  const [emailQuery, setEmailQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);

  const handleSearch = async () => {
    if (!emailQuery.trim()) {
      message.warning("Enter an email to search");
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      // Backend should scope this query to users belonging to the admin's own factory
      const res = await api.get("/auth/users/search", { params: { email: emailQuery.trim() } });
      console.log("Search results:", res.data);
      setResults(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (error) {
      message.error(error.response?.data?.message || "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "User",
      key: "user",
      render: (_, record) => (
        <Space>
          <Avatar style={{ background: "#7C3AED" }}>{record.name?.[0]?.toUpperCase()}</Avatar>
          <div>
            <Text strong style={{ display: "block" }}>{record.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <MailOutlined style={{ marginRight: 4 }} />{record.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Factory",
      dataIndex: "factoryName",
      key: "factory",
      render: (name) => name ? (
        <Space>
          <ShopOutlined style={{ color: "#94A3B8" }} />
          <Text style={{ fontSize: 13 }}>{name}</Text>
        </Space>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role) => role ? <Tag color="purple">{role}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: "",
      key: "actions",
      render: (_, record) => (
        <Tooltip title="Reset Password">
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => setResetTarget(record)}
          >
            Reset Password
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack} style={{ marginBottom: 16, paddingLeft: 0 }}>
        Back to Security
      </Button>

      <Title level={4} style={{ margin: 0 }}>Manage User Credentials</Title>
      <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
        Search for a user by email to reset their password. Results are limited to users in your factory.
      </Text>

      <Space.Compact style={{ width: "100%", maxWidth: 480, marginBottom: 24 }}>
        <Input
          size="large"
          placeholder="Search by email…"
          prefix={<SearchOutlined style={{ color: "#94A3B8" }} />}
          value={emailQuery}
          onChange={(e) => setEmailQuery(e.target.value)}
          onPressEnter={handleSearch}
          allowClear
        />
        <Button type="primary" size="large" onClick={handleSearch} loading={loading}>
          Search
        </Button>
      </Space.Compact>

      {searched && (
        <Table
          columns={columns}
          dataSource={results}
          rowKey="_id"
          loading={loading}
          size="middle"
          pagination={{ pageSize: 6, size: "small" }}
          locale={{ emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No users found in your factory with that email"
            />
          )}}
        />
      )}

      <ResetUserPasswordModal
        open={!!resetTarget}
        user={resetTarget}
        onClose={() => setResetTarget(null)}
        onSuccess={() => setResetTarget(null)}
      />
    </div>
  );
}

// ─── Security Section (root) ──────────────────────────────────────────────────
export default function SecurityManager() {
  const [view, setView] = useState("home"); // "home" | "changePassword" | "manageUsers"

  if (view === "changePassword") return <ChangePassword onBack={() => setView("home")} />;
  if (view === "manageUsers") return <ManageUserCredentials onBack={() => setView("home")} />;
  return <SecurityHome onSelect={setView} />;
}