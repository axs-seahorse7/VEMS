// ManageFactory.jsx — Factory table + Add/Edit factory
import { useEffect, useState } from "react";
import api from "../../../../../services/API/Api/api";
import {
  Table, Tag, Button, Modal, Form, Input, Select, Card, Statistic,
  Popconfirm, Descriptions, message, Typography, Row, Col, Tooltip, Space, Switch,
} from "antd";
import {
  PlusOutlined, EditOutlined, EyeOutlined, DeleteOutlined,
  EnvironmentOutlined, PhoneOutlined, MailOutlined, CarOutlined,
} from "@ant-design/icons";

import {useUser} from "../../../../Global/User-Context/UserContext.jsx";

const { Title, Text } = Typography;

const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });


function FactoryForm({ open, initial, onSave, onCancel, siteOptions }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const selectedSiteIds = Form.useWatch("allowedSites", form) || [];

  // No longer filtered by isIntraMovementAllowed — all sites are always eligible,
  // whether or not they support blocks.
  const eligibleSites = siteOptions;

  useEffect(() => {
    if (open) {
      if (initial) {
        form.setFieldsValue({
          ...initial,
          isIntraMovementAllowed: !!initial.isIntraMovementAllowed,
          allowedSites: (initial.allowedSites || []).map((s) => s?._id || s),
        });
      } else {
        form.setFieldsValue({ status: "active", isIntraMovementAllowed: false, allowedSites: [] });
      }
    }
  }, [open, initial, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      let response;
      if (initial?._id) {
        response = await api.put(`/factory/${initial._id}`, values);
        message.success("Factory updated successfully");
      } else {
        response = await api.post("/factory", values);
        message.success("Factory added successfully");
      }
      onSave(response.data.factory);
      form.resetFields();
    } catch (error) {
      if (error?.errorFields) return; // validation error, antd already shows it
      const data = error?.response?.data;
      if (data?.code === 11000 || data?.message?.includes("duplicate key")) {
        message.error("A factory with this name already exists");
      } else {
        message.error(data?.message || "Error saving factory");
      }
    } finally {
      setLoading(false);
    }
  };

  // Selected sites with their resolved block names, for the summary panel
  const selectedSitesDetail = selectedSiteIds
    .map((id) => siteOptions.find((s) => s._id === id))
    .filter(Boolean);

  return (
    <Modal
      open={open}
      title={initial ? "Edit Factory" : "Add New Factory"}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText={initial ? "Save Changes" : "Add Factory"}
      confirmLoading={loading}
      destroyOnClose
      width={640}
    >
      <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 12 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="name" label="Factory Name" rules={[{ required: true, message: "Required" }]}>
              <Input placeholder="NGM Plant" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="location" label="Location" rules={[{ required: true, message: "Required" }]}>
              <Input placeholder="Nashik, Maharashtra" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="contactNumber" label="Contact Number">
              <Input placeholder="0253-2345678" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="email" label="Email" rules={[{ type: "email", message: "Invalid email" }]}>
              <Input placeholder="factory@vantrack.in" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="factoryGioLocation" label="Geo Location (lat,lng)">
              <Input placeholder="20.0059,73.7898" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="status" label="Status">
              <Select
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item
              name="isIntraMovementAllowed"
              label="Enable Intra Movement on this Factory"
              valuePropName="checked"
              tooltip="When enabled, this factory allows intra-plant trips. Site selection is unaffected by this setting."
            >
              <Switch />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item
              name="allowedSites"
              label="Allowed Sites"
              tooltip="All sites are selectable, whether or not they support blocks."
            >
              <Select
                mode="multiple"
                placeholder="Select allowed sites"
                showSearch
                optionFilterProp="label"
                options={eligibleSites.map((s) => ({
                  label: s.supportsBlocks ? `${s.name} (blocks)` : s.name,
                  value: s._id,
                }))}
              />
            </Form.Item>
          </Col>

          {/* Summary panel: shows blocks allowed per selected site */}
          {selectedSitesDetail.length > 0 && (
            <Col span={24}>
              <div
                style={{
                  border: "1px solid #f0f0f0",
                  borderRadius: 8,
                  padding: 12,
                  background: "#fafafa",
                }}
              >
                <Text type="secondary" style={{ fontSize: 12.5 }}>
                  Blocks allowed via selected sites
                </Text>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  {selectedSitesDetail.map((site) => (
                    <div key={site._id}>
                      <Text strong style={{ fontSize: 13 }}>{site.name}</Text>{" "}
                      {!site.supportsBlocks ? (
                        <Tag color="default">No blocks</Tag>
                      ) : (site.allowedBlocks || []).length === 0 ? (
                        <Tag color="orange">Supports blocks, none assigned yet</Tag>
                      ) : (
                        <Space size={[4, 4]} wrap style={{ marginLeft: 4 }}>
                          {(site.allowedBlocks || []).map((b) => (
                            <Tag key={b?._id || b} color="blue">{b?.name || b}</Tag>
                          ))}
                        </Space>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Col>
          )}
        </Row>
      </Form>
    </Modal>
  );
}
// ── Factory Detail Modal (antd Descriptions) ─────────────────────────────────
function FactoryDetail({ factory, onClose, onEdit }) {
  const { user } = useUser();
  const isSystemAdmin = user?.isSystemAdmin;

  return (
    <Modal open={!!factory} onCancel={onClose} title={factory?.name} footer={null}>
      {factory && (
        <>
          <Space style={{ marginBottom: 16 }}>
            <Tag color={factory.status === "active" ? "green" : "default"}>
              {factory.status}
            </Tag>
            <Tag color={factory.isIntraMovementAllowed ? "blue" : "default"}>
              {factory.isIntraMovementAllowed ? "Intra Movement Enabled" : "Intra Movement Disabled"}
            </Tag>
          </Space>
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12.5 }}>Since {fmtDate(factory.createdAt)}</Text>

          <Descriptions column={1} size="small" style={{ marginTop: 16 }} bordered>
            <Descriptions.Item label="Location">{factory.location || "—"}</Descriptions.Item>
            <Descriptions.Item label="Contact">{factory.contactNumber || "—"}</Descriptions.Item>
            <Descriptions.Item label="Email">{factory.email || "—"}</Descriptions.Item>
            <Descriptions.Item label="Geo Location">{factory.factoryGioLocation || "—"}</Descriptions.Item>
            <Descriptions.Item label="Vans Linked">{(factory.vehicles || []).length} van(s)</Descriptions.Item>
            <Descriptions.Item label="Allowed Sites">
              {(factory.allowedSites || []).length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {factory.allowedSites.map((s) => (
                    <div key={s?._id || s}>
                      <Tag color="purple">{s?.name || s}</Tag>
                      {s?.supportsBlocks && (s.allowedBlocks || []).length > 0 && (
                        <Space size={[4, 4]} wrap style={{ marginLeft: 4 }}>
                          {s.allowedBlocks.map((b) => (
                            <Tag key={b?._id || b} color="blue">{b?.name || b}</Tag>
                          ))}
                        </Space>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                "—"
              )}
            </Descriptions.Item>
          </Descriptions>

          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <Button
              type="primary"
              icon={<EditOutlined />}
              disabled={!isSystemAdmin}
              onClick={() => { onEdit(factory); onClose(); }}
            >
              Edit Factory
            </Button>
            <Button onClick={onClose}>Close</Button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Factory List (antd Table) ─────────────────────────────────────────────────
export default function ManageFactory() {
  const [factories, setFactories] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editFactory, setEditFactory] = useState(null);
  const { user } = useUser();
  const isSystemAdmin = user?.isSystemAdmin;

  const fetchFactories = async () => {
    setLoading(true);
    try {
      const response = await api.get("/factories");
      setFactories(response.data.factories);
    } catch (error) {
      console.error("Error fetching factories:", error);
      message.error("Error fetching factories");
    } finally {
      setLoading(false);
    }
  };

  // Sites must come back with allowedBlocks populated (name field at least)
  // so the factory form can show block names per site without extra calls.
  const fetchSites = async () => {
    try {
      const response = await api.get("/sites");
      setSites(response.data?.data || []);
    } catch (error) {
      message.error("Error fetching sites");
    }
  };

  useEffect(() => {
    fetchFactories();
    fetchSites();
  }, []);

  const handleSaved = (updatedFactory) => {
    setFactories((prev) =>
      prev.some((x) => x._id === updatedFactory._id)
        ? prev.map((x) => (x._id === updatedFactory._id ? updatedFactory : x))
        : [...prev, updatedFactory]
    );
    setFormOpen(false);
    setEditFactory(null);
  };

  const handleToggleStatus = async (factory) => {
    try {
      const response = await api.patch(`/factory/${factory._id}/status`);
      const updated = response.data.factory;
      setFactories((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
      message.success(`Factory marked as ${updated.status}`);
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async (factory) => {
    try {
      await api.delete(`/factory/${factory._id}`);
      setFactories((prev) => prev.filter((x) => x._id !== factory._id));
      message.success("Factory deleted");
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to delete factory");
    }
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name) => <Text strong>{name}</Text>,
    },
    {
      title: "Location",
      dataIndex: "location",
      key: "location",
      render: (v) => <span><EnvironmentOutlined style={{ color: "#9ca3af", marginRight: 6 }} />{v || "—"}</span>,
    },
    {
      title: "Contact",
      dataIndex: "contactNumber",
      key: "contactNumber",
      render: (v) => <span><PhoneOutlined style={{ color: "#9ca3af", marginRight: 6 }} />{v || "—"}</span>,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (v) => <span><MailOutlined style={{ color: "#9ca3af", marginRight: 6 }} />{v || "—"}</span>,
    },
    {
      title: "Intra Movement",
      dataIndex: "isIntraMovementAllowed",
      key: "isIntraMovementAllowed",
      align: "center",
      render: (v) => <Tag color={v ? "blue" : "default"}>{v ? "Enabled" : "Disabled"}</Tag>,
    },
    {
      title: "Allowed Sites",
      dataIndex: "allowedSites",
      key: "allowedSites",
      align: "center",
      render: (list) => (list || []).length,
    },
    {
      title: "Vans",
      key: "vans",
      align: "center",
      render: (_, f) => <span><CarOutlined style={{ color: "#9ca3af", marginRight: 6 }} />{(f.vehicles || []).length}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      filters: [
        { text: "Active", value: "active" },
        { text: "Inactive", value: "inactive" },
      ],
      onFilter: (value, f) => f.status === value,
      render: (status) => <Tag color={status === "active" ? "green" : "default"}>{status}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      render: (_, f) => (
        <div style={{ display: "flex", gap: 6 }}>
          <Tooltip title="View">
            <Button size="small" icon={<EyeOutlined />} onClick={() => setDetail(f)} />
          </Tooltip>
          <Tooltip title={isSystemAdmin ? "Edit" : "Only system admins can edit"}>
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={!isSystemAdmin}
              onClick={() => { setEditFactory(f); setFormOpen(true); }}
            />
          </Tooltip>
          <Tooltip title={isSystemAdmin ? (f.status === "active" ? "Mark Inactive" : "Mark Active") : "Only system admins can change status"}>
            <Button
              size="small"
              disabled={!isSystemAdmin}
              onClick={() => handleToggleStatus(f)}
            >
              {f.status === "active" ? "Deactivate" : "Activate"}
            </Button>
          </Tooltip>
          <Popconfirm
            title={`Delete "${f.name}"?`}
            description="This cannot be undone."
            okText="Delete"
            okButtonProps={{ danger: true }}
            disabled={!isSystemAdmin}
            onConfirm={() => handleDelete(f)}
          >
            <Tooltip title={isSystemAdmin ? "Delete" : "Only system admins can delete"}>
              <Button size="small" danger icon={<DeleteOutlined />} disabled={!isSystemAdmin} />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const total = factories.length;
  const active = factories.filter((f) => f.status === "active").length;
  const inactive = total - active;
  const totalVans = factories.reduce((a, f) => a + (f.vehicles?.length || 0), 0);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Factory Management</Title>
          <Text type="secondary">All registered factory locations.</Text>
        </div>
        <Tooltip title={isSystemAdmin ? "" : "Only system admins can add a factory"}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!isSystemAdmin}
            onClick={() => { setEditFactory(null); setFormOpen(true); }}
          >
            Add Factory
          </Button>
        </Tooltip>
      </div>

      {/* KPI row — sticky, sits just below the 60px navbar */}
      <div
        style={{
          position: "sticky",
          top: 60,
          zIndex: 90,
          background: "#f1f5f9",
          padding: "12px 0",
          marginBottom: 8,
        }}
      >
        <Row gutter={16}>
          <Col span={6}><Card size="small"><Statistic title="Total" value={total} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="Active" value={active} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="Inactive" value={inactive} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="Total Vans" value={totalVans} /></Card></Col>
        </Row>
      </div>

      <Table
        rowKey="_id"
        loading={loading}
        columns={columns}
        dataSource={factories}
        onRow={(f) => ({ onClick: () => setDetail(f), style: { cursor: "pointer" } })}
        pagination={{ pageSize: 10 }}
        sticky={{ offsetHeader: 160 }} // header + KPI row
      />

      <FactoryDetail factory={detail} onClose={() => setDetail(null)} onEdit={(f) => { setEditFactory(f); setFormOpen(true); }} />

      <FactoryForm
        open={formOpen}
        initial={editFactory}
        onSave={handleSaved}
        onCancel={() => { setFormOpen(false); setEditFactory(null); }}
        siteOptions={sites}
      />
    </div>
  )
}