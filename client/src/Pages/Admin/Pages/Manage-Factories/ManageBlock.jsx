// src/pages/Settings/ManageBlock/ManageBlock.jsx
import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
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

const { Title } = Typography;

const ManageBlock = () => {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchBlocks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/blocks");
      setBlocks(res.data?.data || []);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to fetch blocks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  const openCreateModal = () => {
    setEditingBlock(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true });
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingBlock(record);
    form.setFieldsValue({
      name: record.name,
      isActive: record.isActive,
    });
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingBlock(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (editingBlock) {
        await api.put(`/block/${editingBlock._id}`, values);
        message.success("Block updated successfully");
      } else {
        await api.post("/block", values);
        message.success("Block created successfully");
      }

      handleModalClose();
      fetchBlocks();
    } catch (err) {
      if (err?.errorFields) return; // form validation error
      message.error(err?.response?.data?.message || "Failed to save block");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/block/${id}`);
      message.success("Block deleted successfully");
      fetchBlocks();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to delete block");
    }
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive) => (
        <Tag color={isActive ? "green" : "red"}>
          {isActive ? "Active" : "Inactive"}
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
            title="Delete this block?"
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
          Manage Blocks
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          Add Block
        </Button>
      </Space>

      <Table
        rowKey="_id"
        columns={columns}
        dataSource={blocks}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingBlock ? "Edit Block" : "Add Block"}
        open={modalOpen}
        onCancel={handleModalClose}
        onOk={handleSubmit}
        confirmLoading={submitting}
        okText={editingBlock ? "Update" : "Create"}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Block Name"
            name="name"
            rules={[{ required: true, message: "Please enter block name" }]}
          >
            <Input placeholder="Enter block name" />
          </Form.Item>

          <Form.Item label="Active" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ManageBlock;