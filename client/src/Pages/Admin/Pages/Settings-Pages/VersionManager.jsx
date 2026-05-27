import { useState, useEffect } from "react";
import {
  Table, Button, Modal, Form, Input, InputNumber, Switch, Select,
  Tag, Space, Typography, Popconfirm, Tooltip, Badge, Divider,
  message, Card, Row, Col, Statistic, Empty
} from "antd";
import {
  RocketOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  ThunderboltOutlined, BugOutlined, CheckCircleOutlined,
  CodeOutlined, GlobalOutlined, AndroidOutlined, AppleOutlined,
  ExclamationCircleOutlined, PlusCircleOutlined, MinusCircleOutlined
} from "@ant-design/icons";
import api from "../../../../../services/API/Api/api";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PLATFORM_META = {
  web:     { color: "blue",   icon: <GlobalOutlined />,  label: "Web"     },
  android: { color: "green",  icon: <AndroidOutlined />, label: "Android" },
  ios:     { color: "default",icon: <AppleOutlined />,   label: "iOS"     },
};

const platformTag = (p) => {
  const m = PLATFORM_META[p] ?? PLATFORM_META.web;
  return <Tag color={m.color} icon={m.icon}>{m.label}</Tag>;
};

// ─── Version Form Modal ───────────────────────────────────────────────────────
function VersionFormModal({ open, editingVersion, onSave, onClose }) {
  const [form]    = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingVersion) {
        form.setFieldsValue({
          ...editingVersion,
          releaseDate: editingVersion.releaseDate?.split("T")[0],
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, editingVersion]);

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      const res = editingVersion
        ? await api.patch(`/settings/versions/${editingVersion._id}`, values)
        : await api.post("/settings/versions", values);

        message.success(editingVersion ? "Version updated" : "Version created");
        form.resetFields();
        onSave(res.data, !!editingVersion);
    } catch {
      message.error("Network error");
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
          <RocketOutlined style={{ color: "#6366f1" }} />
          <span>{editingVersion ? "Edit Version" : "Release New Version"}</span>
        </Space>
      }
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="versionNumber" label="Version Number"
              rules={[{ required: true, message: "Required" }]}>
              <Input prefix={<CodeOutlined />} placeholder="e.g. 1.4.2" size="large" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="buildNumber" label="Build Number">
              <InputNumber placeholder="e.g. 142" size="large" style={{ width: "100%" }} min={1} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="platform" label="Platform" initialValue="web"
              rules={[{ required: true, message: "Required" }]}>
              <Select size="large">
                {Object.entries(PLATFORM_META).map(([v, m]) => (
                  <Option key={v} value={v}><Space>{m.icon}{m.label}</Space></Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="releaseDate" label="Release Date">
              <Input type="date" size="large" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="title" label="Release Title"
          rules={[{ required: true, message: "Required" }]}>
          <Input placeholder="e.g. Performance & Stability Update" size="large" />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <TextArea rows={3} placeholder="What changed in this release?" />
        </Form.Item>

        {/* Features */}
        <Divider orientation="left" style={{ fontSize: 12, color: "#6b7280" }}>
          <ThunderboltOutlined /> Features
        </Divider>
        <Form.List name="features">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...rest }) => (
                <Row key={key} gutter={8} style={{ marginBottom: 8 }}>
                  <Col span={10}>
                    <Form.Item {...rest} name={[name, "title"]} style={{ marginBottom: 0 }}>
                      <Input placeholder="Feature title" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item {...rest} name={[name, "description"]} style={{ marginBottom: 0 }}>
                      <Input placeholder="Short description" />
                    </Form.Item>
                  </Col>
                  <Col span={2}>
                    <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                  </Col>
                </Row>
              ))}
              <Button type="dashed" onClick={() => add()} icon={<PlusCircleOutlined />} size="small" block>
                Add Feature
              </Button>
            </>
          )}
        </Form.List>

        {/* Bug Fixes */}
        <Divider orientation="left" style={{ fontSize: 12, color: "#6b7280", marginTop: 16 }}>
          <BugOutlined /> Bug Fixes
        </Divider>
        <Form.List name="bugFixes">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...rest }) => (
                <Row key={key} gutter={8} style={{ marginBottom: 8 }}>
                  <Col span={22}>
                    <Form.Item {...rest} name={name} style={{ marginBottom: 0 }}>
                      <Input placeholder="Describe the bug fix…" />
                    </Form.Item>
                  </Col>
                  <Col span={2}>
                    <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                  </Col>
                </Row>
              ))}
              <Button type="dashed" onClick={() => add()} icon={<PlusCircleOutlined />} size="small" block>
                Add Bug Fix
              </Button>
            </>
          )}
        </Form.List>

        <Divider style={{ margin: "16px 0" }} />

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="isForceUpdate" label="Force Update" valuePropName="checked">
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}>
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={() => { form.resetFields(); onClose(); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}
              icon={editingVersion ? <EditOutlined /> : <RocketOutlined />}>
              {editingVersion ? "Update Version" : "Release"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ─── Version Detail Drawer (inline expand) ───────────────────────────────────
function VersionDetail({ version }) {
  return (
    <div style={{ padding: "12px 24px", background: "#fafafa", borderRadius: 8 }}>
      {version.description && (
        <Paragraph style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>
          {version.description}
        </Paragraph>
      )}
      <Row gutter={24}>
        {version.features?.length > 0 && (
          <Col span={12}>
            <Text strong style={{ fontSize: 12, color: "#6366f1" }}>
              <ThunderboltOutlined /> Features
            </Text>
            <ul style={{ paddingLeft: 16, marginTop: 8 }}>
              {version.features.map((f, i) => (
                <li key={i} style={{ fontSize: 12, marginBottom: 4 }}>
                  <Text strong>{f.title}</Text>
                  {f.description && <Text type="secondary"> — {f.description}</Text>}
                </li>
              ))}
            </ul>
          </Col>
        )}
        {version.bugFixes?.length > 0 && (
          <Col span={12}>
            <Text strong style={{ fontSize: 12, color: "#ef4444" }}>
              <BugOutlined /> Bug Fixes
            </Text>
            <ul style={{ paddingLeft: 16, marginTop: 8 }}>
              {version.bugFixes.map((b, i) => (
                <li key={i} style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{b}</li>
              ))}
            </ul>
          </Col>
        )}
      </Row>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VersionManager() {
  const [versions,     setVersions]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editingVer,   setEditingVer]   = useState(null);
  const [expandedRows, setExpandedRows] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/settings/versions");
      console.log("Loaded versions:", res.data.data);
       setVersions(res.data.data ?? []);
    } catch { message.error("Failed to load versions"); }
    finally  { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = (saved, isEdit) => {
    setVersions(prev =>
      isEdit
        ? prev.map(v => v._id === saved._id ? saved : v)
        : [saved, ...prev]
    );
    setModalOpen(false);
    setEditingVer(null);
  };

  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/settings/versions/${id}`);
        setVersions(prev => prev.filter(v => v._id !== id));
        message.success("Version deleted");
      
    } catch (err) { message.error( err?.res?.data?.message || "Failed to delete"); }
  };

  const handleSetActive = async (id) => {
    try {
      const res = await api.patch(`/settings/versions/${id}/set-active`);
        // mark only this version as active, others inactive (single active per platform)
        setVersions(prev => prev.map(v => ({
          ...v,
          isActive: v._id === id ? true : (v.platform === res.data.platform ? false : v.isActive)
        })));
       
    } catch (err) { message.error( err?.res?.data?.message || "Failed to set active"); }
  };

  const activeWeb = versions?.find(v => v.platform === "web" && v.isActive);

  const columns = [
    {
      title: "Version",
      key: "version",
      render: (_, r) => (
        <Space>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: r.isActive ? "linear-gradient(135deg,#6366f1,#818cf8)" : "#f3f4f6",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: r.isActive ? "#fff" : "#9ca3af", fontSize: 10, fontWeight: 800,
          }}>
            {r.versionNumber}
          </div>
          <div>
            <Space>
              <Text strong style={{ fontSize: 13 }}>v{r.versionNumber}</Text>
              {r.isActive && <Tag color="purple" style={{ fontSize: 10 }}>ACTIVE</Tag>}
              {r.isForceUpdate && (
                <Tooltip title="Force update enabled">
                  <Tag color="red" icon={<ExclamationCircleOutlined />} style={{ fontSize: 10 }}>FORCE</Tag>
                </Tooltip>
              )}
            </Space>
            <Text type="secondary" style={{ display: "block", fontSize: 11 }}>{r.title}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Build",
      dataIndex: "buildNumber",
      key: "build",
      render: (b) => b ? <Text style={{ fontSize: 12 }}>#{b}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: "Platform",
      dataIndex: "platform",
      key: "platform",
      render: platformTag,
    },
    {
      title: "Release Date",
      dataIndex: "releaseDate",
      key: "releaseDate",
      render: (d) => <Text style={{ fontSize: 12 }}>{d ? new Date(d).toLocaleDateString() : "—"}</Text>,
    },
    {
      title: "Changes",
      key: "changes",
      render: (_, r) => (
        <Space size={4}>
          {r.features?.length > 0 && (
            <Tag color="blue" icon={<ThunderboltOutlined />} style={{ fontSize: 10 }}>
              {r.features.length} feature{r.features.length !== 1 ? "s" : ""}
            </Tag>
          )}
          {r.bugFixes?.length > 0 && (
            <Tag color="red" icon={<BugOutlined />} style={{ fontSize: 10 }}>
              {r.bugFixes.length} fix{r.bugFixes.length !== 1 ? "es" : ""}
            </Tag>
          )}
          {!r.features?.length && !r.bugFixes?.length && <Text type="secondary" style={{ fontSize: 11 }}>—</Text>}
        </Space>
      ),
    },
    {
      title: "",
      key: "actions",
      render: (_, r) => (
        <Space>
          {!r.isActive && (
            <Tooltip title="Set as active version">
              <Button
                size="small" type="default" icon={<CheckCircleOutlined />}
                style={{ color: "#6366f1", borderColor: "#6366f1" }}
                onClick={() => handleSetActive(r._id)}
              >
                Set Active
              </Button>
            </Tooltip>
          )}
          <Button size="small" icon={<EditOutlined />}
            onClick={() => { setEditingVer(r); setModalOpen(true); }} />
          <Popconfirm
            title="Delete this version?"
            description="This cannot be undone."
            onConfirm={() => handleDelete(r._id)}
            okText="Delete" okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: "0 0 4px" }}>
            <RocketOutlined style={{ marginRight: 8, color: "#6366f1" }} />Version Manager
          </Title>
          <Text type="secondary">Manage app releases. Setting a version active triggers update notifications to users.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => { setEditingVer(null); setModalOpen(true); }}
          style={{ background: "#6366f1", borderColor: "#6366f1" }}>
          New Release
        </Button>
      </div>

      {/* Active version banner */}
      {activeWeb && (
        <Card size="small" style={{ marginBottom: 20, borderColor: "#e0e7ff", background: "#eef2ff" }}>
          <Row align="middle" justify="space-between">
            <Col>
              <Space>
                <CheckCircleOutlined style={{ color: "#6366f1", fontSize: 16 }} />
                <Text strong>Current Active Version</Text>
                <Tag color="purple">v{activeWeb.versionNumber}</Tag>
                {activeWeb.buildNumber && <Text type="secondary">Build #{activeWeb.buildNumber}</Text>}
                <Text type="secondary">· {activeWeb.title}</Text>
              </Space>
            </Col>
            {activeWeb.isForceUpdate && (
              <Col><Tag color="red" icon={<ExclamationCircleOutlined />}>Force Update On</Tag></Col>
            )}
          </Row>
        </Card>
      )}

      {/* Stats */}
      <Row gutter={12} style={{ marginBottom: 20 }}>
        {[
          { label: "Total Releases", value: versions.length,                              color: "#6366f1", bg: "#eef2ff", border: "#e0e7ff" },
          { label: "Force Updates",  value: versions.filter(v => v.isForceUpdate).length, color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
          { label: "Platforms",      value: [...new Set(versions.map(v => v.platform))].length, color: "#16a34a", bg: "#f0fdf4", border: "#dcfce7" },
        ].map(s => (
          <Col span={8} key={s.label}>
            <Card size="small" style={{ borderColor: s.border, background: s.bg }}>
              <Statistic title={s.label} value={s.value} valueStyle={{ color: s.color, fontWeight: 800 }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={versions}
        rowKey="_id"
        loading={loading}
        size="middle"
        expandable={{
          expandedRowRender: (r) => <VersionDetail version={r} />,
          expandedRowKeys: expandedRows,
          onExpand: (expanded, r) =>
            setExpandedRows(expanded ? [r._id] : expandedRows.filter(k => k !== r._id)),
          rowExpandable: (r) => r.features?.length > 0 || r.bugFixes?.length > 0 || !!r.description,
        }}
        locale={{ emptyText: <Empty description="No versions yet" style={{ padding: "40px 0" }} /> }}
        pagination={{ pageSize: 8, size: "small" }}
      />

      <VersionFormModal
        open={modalOpen}
        editingVersion={editingVer}
        onSave={handleSave}
        onClose={() => { setModalOpen(false); setEditingVer(null); }}
      />
    </div>
  );
}