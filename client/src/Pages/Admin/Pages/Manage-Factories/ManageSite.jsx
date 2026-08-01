// src/pages/Settings/ManageSite/ManageSite.jsx
import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Popconfirm,
  message,
  Tag,
  Card,
  Typography,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import api from "../../../../../services/API/Api/api";

const { Title, Text } = Typography;

const ManageSite = () => {
  const [sites, setSites] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const supportsBlocks = Form.useWatch("supportsBlocks", form);

  const fetchSites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/sites");
      setSites(res.data?.data || []);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to fetch sites");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBlocks = useCallback(async () => {
    try {
      const res = await api.get("/blocks");
      setBlocks(res.data?.data || []);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to fetch blocks");
    }
  }, []);

  useEffect(() => {
    fetchSites();
    fetchBlocks();
  }, [fetchSites, fetchBlocks]);

  const openCreateModal = () => {
    setEditingSite(null);
    form.resetFields();
    form.setFieldsValue({ status: "active", supportsBlocks: false, allowedBlocks: [] });
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingSite(record);
    form.setFieldsValue({
      name: record.name,
      supportsBlocks: !!record.supportsBlocks,
      allowedBlocks: (record.allowedBlocks || []).map((b) => b?._id || b),
      status: record.status,
    });
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingSite(null);
    form.resetFields();
  };

  const handleSupportsBlocksChange = (checked) => {
    if (!checked) {
      form.setFieldsValue({ allowedBlocks: [] });
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      // if site doesn't support blocks, never send stale allowedBlocks
      if (!values.supportsBlocks) values.allowedBlocks = [];
      setSubmitting(true);

      if (editingSite) {
        await api.put(`/site/${editingSite._id}`, values);
        message.success("Site updated successfully");
      } else {
        await api.post("/site", values);
        message.success("Site created successfully");
      }

      handleModalClose();
      fetchSites();
    } catch (err) {
      if (err?.errorFields) return; // form validation error
      message.error(err?.response?.data?.message || "Failed to save site");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/site/${id}`);
      message.success("Site deleted successfully");
      fetchSites();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to delete site");
    }
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Supports Blocks",
      dataIndex: "supportsBlocks",
      key: "supportsBlocks",
      render: (v) => <Tag color={v ? "blue" : "default"}>{v ? "Yes" : "No"}</Tag>,
    },
    {
      title: "Allowed Blocks",
      dataIndex: "allowedBlocks",
      key: "allowedBlocks",
      render: (list, record) => {
        if (!record.supportsBlocks) return <Text type="secondary">—</Text>;
        if (!list?.length) return <Text type="secondary">None selected</Text>;
        return (
          <Space size={[4, 4]} wrap>
            {list.map((b) => (
              <Tag key={b?._id || b}>{b?.name || b}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "active" ? "green" : "red"}>
          {status === "active" ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          />
          <Popconfirm
            title="Delete this site?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Manage Sites
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          Add Site
        </Button>
      </Space>

      <Table
        rowKey="_id"
        columns={columns}
        dataSource={sites}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingSite ? "Edit Site" : "Add Site"}
        open={modalOpen}
        onCancel={handleModalClose}
        onOk={handleSubmit}
        confirmLoading={submitting}
        okText={editingSite ? "Update" : "Create"}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Site Name"
            name="name"
            rules={[{ required: true, message: "Please enter site name" }]}
          >
            <Input placeholder="Enter site name" />
          </Form.Item>

          <Form.Item
            label="Supports Blocks"
            name="supportsBlocks"
            valuePropName="checked"
          >
            <Switch onChange={handleSupportsBlocksChange} />
          </Form.Item>

          <Form.Item
            label="Allowed Blocks"
            name="allowedBlocks"
            tooltip="Blocks that vehicles/trips under this site are permitted to use"
          >
            <Select
              mode="multiple"
              placeholder={supportsBlocks ? "Select allowed blocks" : "Enable 'Supports Blocks' first"}
              disabled={!supportsBlocks}
              showSearch
              optionFilterProp="children"
              options={blocks.map((b) => ({
                label: b.name,
                value: b._id,
              }))}
            />
          </Form.Item>

          <Form.Item label="Status" name="status">
            <Select
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ManageSite;