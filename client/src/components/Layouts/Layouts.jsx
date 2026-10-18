import { useState,  useMemo } from "react";
import { Layout, Menu, Avatar, Dropdown, Badge, Button, Typography, Breadcrumb, Space, Divider } from "antd";
import {
  AppstoreOutlined,
  TeamOutlined,
  ShopOutlined,
  CarOutlined,
  SettingOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  DownOutlined,
} from "@ant-design/icons";
import api from "../../../services/API/Api/api";
import { useDashboard } from "../../Global/Dashboard-Context/DashboardProvider";

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

// ── Nav structure ────────────────────────────────────────────────────────────
// `disabled` can be a boolean or a function(user) => boolean for per-user logic.
const getNavItems = (user) => [
  {
    id: "overview",
    label: "Dashboard",
    icon: <AppstoreOutlined />,
    children: [
      { id: "overview",           label: "Overview" },
      { id: "searchDrivers",      label: "Find Trip" },
      { id: "vehiclePerformance", label: "Vehicle Performance" },
      { id: "executiveDashboard", label: "Executive Dashboard" },
    ],
  },
  { 
    id: "users", 
    label: "Manage Users", 
    icon: <TeamOutlined /> 
  },
  { 
    id: "factory", 
    label: "Manage Factory", 
    icon: <ShopOutlined /> ,
    children: [
      { id: "factory", label: "Factory" },
      { id: "site", label: "Site" },
      { id: "block", label: "Block" },
    ],
  },
  { id: "vehicles", label: "Vehicles", icon: <CarOutlined /> },
  {
    id: "settings",
    label: "Settings",
    icon: <SettingOutlined />,
    // disabled: !user?.isSystemAdmin, // only system admins can access Settings
  },
];

// Convert NAV config -> antd Menu `items` prop, respecting `disabled`
const buildMenuItems = (nav) =>
  nav.map((item) =>
    item.children
      ? {
          key: item.id,
          icon: item.icon,
          label: item.label,
          disabled: !!item.disabled,
          children: item.children.map((c) => ({
            key: c.id,
            label: c.label,
            disabled: !!c.disabled,
          })),
        }
      : {
          key: item.id,
          icon: item.icon,
          label: item.label,
          disabled: !!item.disabled,
        }
  );

const findLabel = (nav, id) => {
  for (const item of nav) {
    if (item.id === id) return item.label;
    const child = item.children?.find((c) => c.id === id);
    if (child) return child.label;
  }
  return "Dashboard";
};

export default function AdminLayout({ activePage, onNavigate, children }) {
  const [collapsed, setCollapsed] = useState(true);
  // const [activeSettingsSection, setActiveSettingsSection] = useState(null);
  const { settingsActiveSection, setSettingsActiveSection } = useDashboard();

  const user = JSON.parse(localStorage.getItem("user"));
  const NAV = useMemo(() => getNavItems(user), [user]);
  const menuItems = useMemo(() => buildMenuItems(NAV), [NAV]);

  const openKeys = NAV.find((n) => n.children?.some((c) => c.id === activePage))?.id;

  const handleSignOut = async () => {
    try {
      await api.post("/auth/logout");
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const profileMenuItems = [
    {
      key: "info",
      label: (
        <div style={{ padding: "4px 0" }}>
          <Text strong style={{ display: "block" }}>{user?.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{user?.email}</Text>
        </div>
      ),
      disabled: true,
    },
    { type: "divider" },
    {
      key: "signout",
      label: "Sign Out",
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleSignOut,
    },
  ];


  return (
    <Layout style={{ minHeight: "100vh", scrollbarGutter: "stable", scrollbarWidth: "thin" }}>
      <style>{`
      /* Firefox */
      * {
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 transparent;
      }

      /* Chrome, Edge, Safari */
      *::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      *::-webkit-scrollbar-track {
        background: transparent;
      }
      *::-webkit-scrollbar-thumb {
        background-color: #cbd5e1;
        border-radius: 4px;
      }
      *::-webkit-scrollbar-thumb:hover {
        background-color: #94a3b8;
      }
    `}</style>
    
      <Sider
        collapsible
        collapsed={collapsed}
        trigger={null}
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
        theme="light"
        width={230}
        collapsedWidth={64}
        style={{ position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 200, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
      >
        <div style={{ height:60, display: "flex", alignItems: "center", padding: collapsed ? "0 13px" : "0 16px", gap: 10 }}>
          <img
            src="https://cms-complaint-avidence.s3.eu-north-1.amazonaws.com/pg-logo-Photoroom.png"
            alt="VEMS"
            style={{ width: collapsed ? 35 : 40, height: collapsed ? 35 : 40, objectFit: "contain" }}
          />
          {!collapsed && (
            <div>
              <Text strong style={{ fontSize: 14 }}>VEMS</Text>
              <div style={{ fontSize: 10, color: "#64748b" }}>Admin Console</div>
            </div>
          )}
        </div>

        <Menu
          mode="inline"
          theme="light"
          selectedKeys={[activePage]}
          defaultOpenKeys={openKeys ? [openKeys] : []}
          items={menuItems}
          onClick={({ key }) => onNavigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 64 : 230, transition: "margin-left .22s" }}>
       <Header
          style={{
            height: 60,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            position: "sticky",
            top: 0,
            zIndex: 100,
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                padding: "4px 20px",
                borderRadius: 30,
                background: "#077A7D",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text strong style={{ fontSize: 12, color: "#fff", letterSpacing: 0.5 }}>
                VEMS
              </Text>
            </div>

            <Divider type="vertical" style={{ height: 22, margin: 0 }} />

            <Breadcrumb
              items={[
                { title: "Admin" },
                { title: findLabel(NAV, activePage) },
                ...(findLabel(NAV, activePage).toLowerCase() === "settings"
                  ? [{ title: settingsActiveSection || "Settings" }]
                  : []),
              ]}
              style={{ fontSize: 13.5 }}
            />
          </div>

          <Space size={18} align="center" style={{ hover: {background: "#f5f5f5", borderRadius: 8, padding: "4px 8px" } }}>
            <Badge dot offset={[-2, 2]}>
              <Button
                shape="circle"
                icon={<BellOutlined style={{ fontSize: 15 }} />}
                style={{ border: "1px solid #f0f0f0", color: "#595959" }}
              />
            </Badge>

            <Divider type="vertical" style={{ height: 22, margin: 0 }} />

            <Dropdown menu={{ items: profileMenuItems }} trigger={["click"]} placement="bottomRight">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "4px 10px 4px 4px",
                  borderRadius: 8,
                  cursor: "pointer",
                  "&:hover": {
                    background: "#f5f5f5",
                  }
                }}
              >
                <Avatar size={30} icon={<UserOutlined />} style={{ backgroundColor: "#077A7D" }} />
                <div style={{ lineHeight: 1.2 }}>
                  <Text strong style={{ fontSize: 13, display: "block" }}>
                    {user?.name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Administrator
                  </Text>
                </div>
                <DownOutlined style={{ fontSize: 14, marginLeft: 8, color: "#8c8c8c" }} />
              </div>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ padding: "0 0 40px", }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}