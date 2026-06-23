import { useState, useEffect, useRef, useCallback } from "react";
import dayjs from "dayjs";
import api from "../../../../../services/API/Api/api"; // adjust path as needed
import {
  Affix,
  Card,
  Statistic,
  Row,
  Col,
  Input,
  Select,
  Segmented,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  DatePicker,
  Switch,
  Space,
  Typography,
  message,
} from "antd";
import {
  CarOutlined,
  ContainerOutlined,
  ToolOutlined,
  ExperimentOutlined,
  MedicineBoxOutlined,
  TeamOutlined,
  PlusOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

// AntD has no dedicated truck/tractor/tanker icon set, so kinds are mapped to
// the closest available icon.
const VEHICLE_TYPES = [
  { v: "truck",          l: "Truck",           icon: <CarOutlined /> },
  { v: "miniTruck",      l: "Mini Truck",       icon: <CarOutlined /> },
  { v: "containerTruck", l: "Container Truck",  icon: <ContainerOutlined /> },
  { v: "mixerTruck",     l: "Mixer Truck",      icon: <ToolOutlined /> },
  { v: "waterTanker",    l: "Water Tanker",     icon: <ExperimentOutlined /> },
  { v: "tractor",        l: "Tractor",          icon: <ToolOutlined /> },
  { v: "car",            l: "Car",              icon: <CarOutlined /> },
  { v: "bus",            l: "Bus",              icon: <TeamOutlined /> },
  { v: "ambulance",      l: "Ambulance",        icon: <MedicineBoxOutlined /> },
  { v: "van",            l: "Van",              icon: <CarOutlined /> },
  { v: "trailer",        l: "Trailer",          icon: <ContainerOutlined /> },
];

const typeIcon  = Object.fromEntries(VEHICLE_TYPES.map(t => [t.v, t.icon]));
const typeLabel = Object.fromEntries(VEHICLE_TYPES.map(t => [t.v, t.l]));

const LIMIT = 20;
const NAVBAR_H = 60; // matches AdminLayout header height

const defaultForm = {
  vehicleNumber:   "",
  type:            "internal",
  typeOfVehicle:   "truck",
  ownerFactoryId:  undefined,
  driverName:      "",
  driverContact:   "",
  transporterName: "",
  driverIdNumber:  "",
  PUCExpiry:       null,
  isActive:        true,
};

function pucStatus(expiry) {
  if (!expiry) return { label: "—", color: "default" };
  const days = Math.ceil((new Date(expiry) - Date.now()) / 86400000);
  if (days < 0)   return { label: "Expired",       color: "red" };
  if (days <= 30) return { label: `${days}d left`, color: "orange" };
  return               { label: "Valid",            color: "green" };
}

export default function ManageVehicles() {
  // ── vehicle list state ──
  const [vehicles,   setVehicles]   = useState([]);
  const [page,       setPage]       = useState(1);
  const [hasMore,    setHasMore]    = useState(true);
  const [listLoading,setListLoading]= useState(false);
  const [initLoading,setInitLoading]= useState(true);

  // ── stats ──
  const [stats, setStats] = useState({ total: 0, active: 0, internal: 0, external: 0, pucExpiring: 0 });

  // ── factories ──
  const [factories, setFactories] = useState([]);

  // ── filters ──
  const [search,          setSearch]          = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType,      setFilterType]      = useState("all");
  const [filterOwnership, setFilterOwnership] = useState("all");

  // ── form / modal ──
  const [formOpen,       setFormOpen]       = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [submitting,     setSubmitting]     = useState(false);
  const [form] = Form.useForm();

  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  // ── Debounce search input ──
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ── Reset list on filter change ──
  useEffect(() => {
    setVehicles([]);
    setPage(1);
    setHasMore(true);
  }, [debouncedSearch, filterType, filterOwnership]);

  // ── Fetch a page of vehicles ──
  const fetchVehicles = useCallback(async (pageNum) => {
    if (listLoading) return;
    setListLoading(true);
    try {
      const params = {
        page: pageNum,
        limit: LIMIT,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(filterType !== "all" ? { typeOfVehicle: filterType } : {}),
        ...(filterOwnership !== "all" ? { type: filterOwnership } : {}),
      };
      const res = await api.get("/vehicles", { params });
      const { vehicles: incoming, pagination } = res.data;
      setVehicles(prev => (pageNum === 1 ? incoming : [...prev, ...incoming]));
      setHasMore(pagination.hasMore);
      if (pageNum === 1) setInitLoading(false);
    } catch {
      message.error("Failed to load vehicles.");
      setInitLoading(false);
    } finally {
      setListLoading(false);
    }
  }, [debouncedSearch, filterType, filterOwnership]); // eslint-disable-line

  useEffect(() => { fetchVehicles(page); }, [page, fetchVehicles]);

  // ── Fetch stats + factories once ──
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [fRes, allRes] = await Promise.all([
          api.get("/factories"),
          api.get("/vehicles", { params: { limit: 1 } }),
        ]);
        setFactories(fRes.data.factories);
        const [actRes, intRes, extRes, pucRes] = await Promise.all([
          api.get("/vehicles", { params: { isActive: true, limit: 1 } }),
          api.get("/vehicles", { params: { type: "internal", limit: 1 } }),
          api.get("/vehicles", { params: { type: "external", limit: 1 } }),
          api.get("/vehicles", { params: { limit: 1000 } }),
        ]);
        const pucExpiring = pucRes.data.vehicles.filter(v => {
          if (!v.PUCExpiry) return false;
          const d = Math.ceil((new Date(v.PUCExpiry) - Date.now()) / 86400000);
          return d >= 0 && d <= 30;
        }).length;
        setStats({
          total: allRes.data.pagination.total,
          active: actRes.data.pagination.total,
          internal: intRes.data.pagination.total,
          external: extRes.data.pagination.total,
          pucExpiring,
        });
      } catch { /* stats are non-critical */ }
    };
    fetchMeta();
  }, []);

  // ── Infinite scroll observer ──
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !listLoading) {
          setPage(prev => prev + 1);
        }
      },
      { rootMargin: "200px" }
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, listLoading]);

  const getFactoryName = (id) => {
    if (!id) return "—";
    const fac = factories.find(f => f._id === (id?._id || id));
    return fac ? fac.name : "Unknown";
  };

  const openCreate = () => {
    setEditingVehicle(null);
    form.resetFields();
    form.setFieldsValue(defaultForm);
    setFormOpen(true);
  };

  const openEdit = (v) => {
    setEditingVehicle(v);
    form.setFieldsValue({
      vehicleNumber: v.vehicleNumber,
      type: v.type,
      typeOfVehicle: v.typeOfVehicle,
      ownerFactoryId: v.ownerFactoryId?._id || v.ownerFactoryId || undefined,
      driverName: v.driverName || "",
      driverContact: v.driverContact || "",
      transporterName: v.transporterName || "",
      driverIdNumber: v.driverIdNumber || "",
      PUCExpiry: v.PUCExpiry ? dayjs(v.PUCExpiry) : null,
      isActive: v.isActive,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        ...values,
        PUCExpiry: values.PUCExpiry ? values.PUCExpiry.format("YYYY-MM-DD") : null,
      };
      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle._id}`, payload);
        message.success("Vehicle updated successfully.");
      } else {
        await api.post("/vehicles", payload);
        message.success("Vehicle registered successfully.");
      }
      setFormOpen(false);
      setVehicles([]);
      setPage(1);
      setHasMore(true);
    } catch (err) {
      if (err?.errorFields) return; // antd already shows validation errors
      message.error(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "Vehicle No.",
      dataIndex: "vehicleNumber",
      key: "vehicleNumber",
      render: (v) => <Text code strong>{v}</Text>,
    },
    {
      title: "Ownership",
      dataIndex: "type",
      key: "type",
      render: (type) => <Tag color={type === "internal" ? "blue" : "purple"}>{type}</Tag>,
    },
    {
      title: "Vehicle Type",
      dataIndex: "typeOfVehicle",
      key: "typeOfVehicle",
      render: (kind) => (
        <Space size={6}>
          {typeIcon[kind] || <CarOutlined />}
          {typeLabel[kind] || kind}
        </Space>
      ),
    },
    {
      title: " Driver",
      key: "driver",
      render: (_, v) => (
        <div>
          <Text strong>{v.driverName || "—"}</Text>
          {v.driverContact && <div><Text type="secondary" style={{ fontSize: 12 }}>{v.driverContact}</Text></div>}
        </div>
      ),
    },
    {
      title: "Transporter",
      dataIndex: "transporterName",
      key: "transporterName",
      render: (v) => v || "—",
    },
    {
      title: "Factory",
      key: "factory",
      render: (_, v) => <Tag>{getFactoryName(v.ownerFactoryId)}</Tag>,
    },
    {
      title: "PUC",
      dataIndex: "PUCExpiry",
      key: "puc",
      render: (expiry) => {
        const p = pucStatus(expiry);
        return <Tag color={p.color}>{p.label}</Tag>;
      },
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (active) => <Tag color={active ? "green" : "default"}>{active ? "Active" : "Inactive"}</Tag>,
    },
    {
      title: "",
      key: "actions",
      render: (_, v) => <Button size="small" onClick={() => openEdit(v)}>Edit</Button>,
    },
  ];

  return (
    <div style={{ padding: 10 }}>
      <Row justify="space-between" align="bottom" style={{ marginBottom: 20 }}>
        <Col>
          <Text type="secondary" style={{ textTransform: "uppercase", fontSize: 12 }}>Admin Panel · Fleet</Text>
          <Title level={3} style={{ margin: 0 }}>Vehicle Registry</Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Register Vehicle
          </Button>
        </Col>
      </Row>

      {/* ── Stats — sticky just below the navbar ── */}
      <Affix offsetTop={NAVBAR_H}>
        <div style={{ background: "#f1f5f9", padding: 16, borderBottom: "1px solid #e2e8f0", marginBottom: 16 }}>
          <Row gutter={12}>
            <Col span={5}><Card size="small"><Statistic title="Total" value={stats.total} /></Card></Col>
            <Col span={5}><Card size="small"><Statistic title="Active" value={stats.active} valueStyle={{ color: "#16a34a" }} /></Card></Col>
            <Col span={5}><Card size="small"><Statistic title="Internal" value={stats.internal} /></Card></Col>
            <Col span={5}><Card size="small"><Statistic title="External" value={stats.external} /></Card></Col>
            <Col span={4}><Card size="small"><Statistic title="PUC Expiring" value={stats.pucExpiring} valueStyle={{ color: "#d97706" }} /></Card></Col>
          </Row>
        </div>
      </Affix>

      {/* ── Filters ── */}
      <Row gutter={12} style={{ margin: "16px 0" }}>
        <Col flex="auto">
          <Input.Search
            allowClear
            placeholder="Search vehicle no., driver, transporter, factory…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>
        <Col>
          <Segmented
            value={filterOwnership}
            onChange={setFilterOwnership}
            options={[
              { label: "All Ownership", value: "all" },
              { label: "Internal", value: "internal" },
              { label: "External", value: "external" },
            ]}
          />
        </Col>
        <Col>
          <Select
            value={filterType}
            onChange={setFilterType}
            style={{ minWidth: 180 }}
            options={[
              { value: "all", label: "All Kinds" },
              ...VEHICLE_TYPES.map(t => ({ value: t.v, label: t.l })),
            ]}
          />
        </Col>
      </Row>

      {/* ── Table ── */}
      <Table
        rowKey="_id"
        columns={columns}
        dataSource={vehicles}
        loading={initLoading}
        pagination={false}
        sticky={{ offsetHeader: NAVBAR_H + 120 }} // header + stats + filters
        locale={{ emptyText: "No vehicles found." }}
      />

      <div ref={sentinelRef} style={{ height: 1 }} />

      {listLoading && !initLoading && (
        <div style={{ textAlign: "center", padding: 16 }}>
          <Text type="secondary">Loading more vehicles…</Text>
        </div>
      )}

      {!hasMore && vehicles.length > 0 && (
        <div style={{ textAlign: "center", padding: 14 }}>
          <Text type="secondary"><CheckCircleOutlined style={{ marginRight: 6 }} />All {vehicles.length} vehicles loaded</Text>
        </div>
      )}

      {/* ── Register / Edit Modal ── */}
      <Modal
        open={formOpen}
        title={editingVehicle ? "Edit Vehicle" : "Register Vehicle"}
        onCancel={() => setFormOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        okText={editingVehicle ? "Update" : "Register"}
        destroyOnClose
        width={620}
      >
        <Form form={form} layout="vertical" requiredMark={false} initialValues={defaultForm}>
          <Text strong style={{ fontSize: 11, color: "#6366f1", letterSpacing: 1, textTransform: "uppercase" }}>Vehicle Details</Text>
          <Row gutter={16} style={{ marginTop: 8 }}>
            <Col span={12}>
              <Form.Item name="vehicleNumber" label="Vehicle Number" rules={[{ required: true, message: "Required" }]}>
                <Input
                  placeholder="e.g. MH12AB1234"
                  disabled={!!editingVehicle}
                  onChange={(e) => form.setFieldsValue({ vehicleNumber: e.target.value.toUpperCase() })}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="typeOfVehicle" label="Vehicle Kind" rules={[{ required: true }]}>
                <Select
                  options={VEHICLE_TYPES.map(t => ({ value: t.v, label: t.l }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="Ownership Type" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: "internal", label: "Internal" },
                    { value: "external", label: "External" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ownerFactoryId" label="Owner Factory">
                <Select
                  allowClear
                  placeholder="— No factory —"
                  options={factories.map(fac => ({ value: fac._id, label: `${fac.name} · ${fac.location}` }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Text strong style={{ fontSize: 11, color: "#6366f1", letterSpacing: 1, textTransform: "uppercase" }}>Driver & Transporter</Text>
          <Row gutter={16} style={{ marginTop: 8 }}>
            <Col span={12}>
              <Form.Item name="driverName" label="Driver Name">
                <Input placeholder="Full name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="driverContact" label="Driver Contact">
                <Input placeholder="Mobile number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="driverIdNumber" label="Driver ID Number">
                <Input placeholder="Aadhar / DL / PAN…" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="transporterName" label="Transporter Name">
                <Input placeholder="Transport company" />
              </Form.Item>
            </Col>
          </Row>

          <Text strong style={{ fontSize: 11, color: "#6366f1", letterSpacing: 1, textTransform: "uppercase" }}>Compliance</Text>
          <Row gutter={16} style={{ marginTop: 8 }}>
            <Col span={12}>
              <Form.Item name="PUCExpiry" label="PUC Expiry Date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item shouldUpdate={(prev, cur) => prev.PUCExpiry !== cur.PUCExpiry} noStyle>
                {({ getFieldValue }) => {
                  const expiry = getFieldValue("PUCExpiry");
                  if (!expiry) return null;
                  const p = pucStatus(expiry);
                  if (p.label === "—") return null;
                  return (
                    <Tag color={p.color} icon={p.label === "Expired" ? <WarningOutlined /> : <CheckCircleOutlined />} style={{ marginTop: -8, marginBottom: 12 }}>
                      {p.label === "Expired" ? "PUC has expired" : p.label}
                    </Tag>
                  );
                }}
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isActive" label="Active vehicle" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}