// ManageFactory.jsx — Factory table + Add/Edit factory
import { useEffect, useState } from "react";
import api from "../../../../../services/API/Api/api";
import {
  Table, Tag, Button, Modal, Form, Input, Select, Card, Statistic,
  Popconfirm, Descriptions, message, Typography, Row, Col, Tooltip,
} from "antd";
import {
  PlusOutlined, EditOutlined, EyeOutlined, DeleteOutlined,
  EnvironmentOutlined, PhoneOutlined, MailOutlined, CarOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const user = JSON.parse(localStorage.getItem("user"));
const isSystemAdmin = !!user?.isSystemAdmin;

// ── Add / Edit Factory Form (antd Form) ──────────────────────────────────────
function FactoryForm({ open, initial, onSave, onCancel }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) form.setFieldsValue(initial || { status: "active" });
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

  return (
    <Modal
      open={open}
      title={initial ? "Edit Factory" : "Add New Factory"}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText={initial ? "Save Changes" : "Add Factory"}
      confirmLoading={loading}
      destroyOnClose
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
        </Row>
      </Form>
    </Modal>
  );
}

// ── Factory Detail Modal (antd Descriptions) ─────────────────────────────────
function FactoryDetail({ factory, onClose, onEdit }) {
  return (
    <Modal open={!!factory} onCancel={onClose} title={factory?.name} footer={null}>
      {factory && (
        <>
          <Tag color={factory.status === "active" ? "green" : "default"} style={{ marginBottom: 16 }}>
            {factory.status}
          </Tag>
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12.5 }}>Since {fmtDate(factory.createdAt)}</Text>

          <Descriptions column={1} size="small" style={{ marginTop: 16 }} bordered>
            <Descriptions.Item label="Location">{factory.location || "—"}</Descriptions.Item>
            <Descriptions.Item label="Contact">{factory.contactNumber || "—"}</Descriptions.Item>
            <Descriptions.Item label="Email">{factory.email || "—"}</Descriptions.Item>
            <Descriptions.Item label="Geo Location">{factory.factoryGioLocation || "—"}</Descriptions.Item>
            <Descriptions.Item label="Vans Linked">{(factory.vans || []).length} van(s)</Descriptions.Item>
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
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editFactory, setEditFactory] = useState(null);

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

  useEffect(() => { fetchFactories(); }, []);

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
      title: "Vans",
      key: "vans",
      align: "center",
      render: (_, f) => <span><CarOutlined style={{ color: "#9ca3af", marginRight: 6 }} />{(f.vans || []).length}</span>,
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
  const totalVans = factories.reduce((a, f) => a + (f.vans?.length || 0), 0);

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
      />
    </div>
  )
}