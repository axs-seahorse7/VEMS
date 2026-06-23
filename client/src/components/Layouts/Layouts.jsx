import { useState, useMemo } from "react";
import { Layout, Menu, Avatar, Dropdown, Badge, Button, Typography } from "antd";
import {
  AppstoreOutlined,
  TeamOutlined,
  ShopOutlined,
  CarOutlined,
  SettingOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import api from "../../../services/API/Api/api";

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
      { id: "overview", label: "Overview" },
      { id: "searchDrivers", label: "Search Drivers" },
      { id: "vehiclePerformance", label: "Vehicle Performance" },
    ],
  },
  { id: "users", label: "Manage Users", icon: <TeamOutlined /> },
  { id: "factory", label: "Manage Factory", icon: <ShopOutlined /> },
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
        <div style={{ height: 60, display: "flex", alignItems: "center", padding: collapsed ? "0 13px" : "0 16px", gap: 10 }}>
          <img
            src="https://cms-complaint-avidence.s3.eu-north-1.amazonaws.com/pg-logo-Photoroom.png"
            alt="VEMS"
            style={{ width: 36, height: 36, objectFit: "contain" }}
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
            padding: "0 26px",
            position: "sticky",
            top: 0,
            zIndex: 100,
            boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
          }}
        >
          <Text strong style={{ fontSize: 15 }}>{findLabel(NAV, activePage)}</Text>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Badge dot offset={[-4, 4]}>
              <Button shape="circle" icon={<BellOutlined />} />
            </Badge>

            <Dropdown menu={{ items: profileMenuItems }} trigger={["click"]} placement="bottomRight">
              <Button style={{ display: "flex", alignItems: "center", gap: 8, height: 40 }}>
                <Avatar size={28} icon={<UserOutlined />} style={{ backgroundColor: "#077A7D" }} />
                <Text strong style={{ fontSize: 12.5 }}>{user?.name}</Text>
              </Button>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ padding: "0 0 40px", }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}