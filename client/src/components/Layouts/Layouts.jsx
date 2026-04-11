import { useState } from "react";
import api from "../../../services/API/Api/api";

// ── Inline SVG icons ────────────────────────────────────────────────────────
export const Icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  factory: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M2 20V8l6-4v4l6-4v4l6-4v16H2z" /><path d="M6 20v-4h4v4" /><path d="M14 12h2" /><path d="M14 16h2" />
    </svg>
  ),
  overview: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  signout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  truck: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

// ── Nav structure ─────────────────────────────────────────────────────────────
const NAV = [
  {
    id: "overview",
    label: "Overview",
    icon: Icons.overview,
    single: true,
  },
  {
    id: "users",
    label: "Manage Users",
    icon: Icons.users,
    children: [
      { id: "users-list", label: "User List" },
      { id: "users-create", label: "Create User" },
      { id: "users-roles", label: "Roles & Permissions" },
    ],
  },
  {
    id: "factory",
    label: "Manage Factory",
    icon: Icons.factory,
    children: [
      { id: "factory-list", label: "Factory List" },
      { id: "factory-create", label: "Add Factory" },
    ],
  },
  {
    id: "vehicles",
    label: "Vehicles",
    icon: Icons.truck,
    single: true,
  },
  {
    id: "settings",
    label: "Settings",
    icon: Icons.settings,
    single: true,
  },
];

const COLORS = {
  sidebarBg: "#0f1117",
  sidebarBorder: "#1e2130",
  accent: "#6366f1",
  accentLight: "#818cf8",
  accentBg: "rgba(99,102,241,0.12)",
  text: "#e2e8f0",
  textMuted: "#64748b",
  topbarBg: "#ffffff",
  pageBg: "#f1f5f9",
  card: "#ffffff",
};

// ── Sidebar Item ──────────────────────────────────────────────────────────────
function SidebarItem({ item, activePage, onNavigate, collapsed }) {
  const hasChildren = item.children?.length > 0;
  const isActive = item.single
    ? activePage === item.id
    : item.children?.some((c) => c.id === activePage);
  const [open, setOpen] = useState(isActive);

  const handleClick = () => {
    if (item.single) { onNavigate(item.id); return; }
    setOpen((p) => !p);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        title={collapsed ? item.label : undefined}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: collapsed ? "11px 0" : "10px 14px",
          justifyContent: collapsed ? "center" : "flex-start",
          background: isActive && item.single ? COLORS.accentBg : "transparent",
          border: "none",
          borderRadius: 9,
          cursor: "pointer",
          color: isActive ? COLORS.accentLight : COLORS.textMuted,
          fontFamily: "inherit",
          fontSize: 13.5,
          fontWeight: isActive ? 700 : 500,
          transition: "all .15s",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          e.currentTarget.style.color = COLORS.text;
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = isActive ? COLORS.accentLight : COLORS.textMuted;
        }}
      >
        {/* Active bar */}
        {isActive && item.single && (
          <span style={{
            position: "absolute", left: 0, top: "20%", bottom: "20%",
            width: 3, borderRadius: 2, background: COLORS.accent,
          }} />
        )}
        <span style={{ width: 18, height: 18, flexShrink: 0, display: "flex" }}>{item.icon}</span>
        {!collapsed && (
          <>
            <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
            {hasChildren && (
              <span style={{
                width: 14, height: 14, display: "flex",
                transform: open ? "rotate(90deg)" : "none", transition: "transform .2s"
              }}>{Icons.chevron}</span>
            )}
          </>
        )}
      </button>

      {/* Sub-items */}
      {!collapsed && hasChildren && open && (
        <div style={{ paddingLeft: 32, marginTop: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          {item.children.map((c) => (
            <button
              key={c.id}
              onClick={() => onNavigate(c.id)}
              style={{
                width: "100%",
                textAlign: "left",
                background: activePage === c.id ? COLORS.accentBg : "transparent",
                border: "none",
                borderRadius: 7,
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: activePage === c.id ? 700 : 400,
                color: activePage === c.id ? COLORS.accentLight : COLORS.textMuted,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all .12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.text; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = activePage === c.id ? COLORS.accentLight : COLORS.textMuted;
                e.currentTarget.style.background = activePage === c.id ? COLORS.accentBg : "transparent";
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: activePage === c.id ? COLORS.accent : COLORS.textMuted, flexShrink: 0 }} />
                {c.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────
export default function AdminLayout({ activePage, onNavigate, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const SIDEBAR_W = collapsed ? 64 : 230;

  const handleSignOut = async () => {
    try {
      await api.post("/auth/logout");
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Geist', 'DM Sans', 'Segoe UI', sans-serif", background: COLORS.pageBg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #1e2130; border-radius: 3px; }
        button { font-family: inherit; }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{
        width: SIDEBAR_W, minHeight: "100vh", background: COLORS.sidebarBg,
        borderRight: `1px solid ${COLORS.sidebarBorder}`,
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 200,
        transition: "width .22s cubic-bezier(.4,0,.2,1)",
        overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{
          height: 60, display: "flex", alignItems: "center",
          padding: collapsed ? "0 13px" : "0 16px",
          borderBottom: `1px solid ${COLORS.sidebarBorder}`,
          gap: 10, flexShrink: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: "linear-gradient(135deg,#6366f1,#4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#fff"
          }}>
            <span style={{ width: 17, height: 17, display: "flex" }}>{Icons.truck}</span>
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: -.3 }}>VanTrack</div>
              <div style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 500 }}>Admin Console</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV.map((item) => (
            <SidebarItem key={item.id} item={item} activePage={activePage} onNavigate={onNavigate} collapsed={collapsed} />
          ))}
        </nav>

        {/* Collapse toggle */}
        <div style={{ padding: "12px 8px", borderTop: `1px solid ${COLORS.sidebarBorder}` }}>
          <button
            onClick={() => setCollapsed((p) => !p)}
            style={{
              width: "100%", background: "rgba(255,255,255,0.04)", border: "none",
              borderRadius: 8, padding: "9px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
              gap: 8, color: COLORS.textMuted, fontSize: 12.5, fontWeight: 500, fontFamily: "inherit",
            }}
          >
            <span style={{ width: 16, height: 16, display: "flex", transform: collapsed ? "rotate(180deg)" : "none", transition: "transform .2s" }}>{Icons.chevron}</span>
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div style={{ marginLeft: SIDEBAR_W, flex: 1, display: "flex", flexDirection: "column", transition: "margin-left .22s cubic-bezier(.4,0,.2,1)", minWidth: 0 }}>

        {/* Topbar */}
        <header style={{
          height: 60, background: COLORS.topbarBg, borderBottom: "1px solid #e5e7eb",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 26px", position: "sticky", top: 0, zIndex: 100,
          boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
        }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b7280" }}>
            <span style={{ fontWeight: 700, color: "#111", fontSize: 15 }}>
              {NAV.flatMap(n => n.children ? n.children : [n]).find(n => n.id === activePage)?.label || "Dashboard"}
            </span>
          </div>

          {/* Right: bell + profile */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button style={{
              width: 36, height: 36, borderRadius: 9, border: "1px solid #e5e7eb",
              background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#6b7280", position: "relative"
            }}>
              <span style={{ width: 17, height: 17, display: "flex" }}>{Icons.bell}</span>
              <span style={{
                position: "absolute", top: 7, right: 8,
                width: 7, height: 7, borderRadius: "50%", background: "#ef4444", border: "1.5px solid #fff"
              }} />
            </button>

            <div style={{ position: "relative" }}>
              <button onClick={() => setProfileOpen(p => !p)} style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 10,
                padding: "5px 10px 5px 6px", cursor: "pointer",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "linear-gradient(135deg,#6366f1,#818cf8)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0
                }}>
                  <span style={{ width: 14, height: 14, display: "flex" }}>{Icons.user}</span>
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#111" }}>System Admin</div>
                  <div style={{ fontSize: 10.5, color: "#9ca3af" }}>admin@vantrack.in</div>
                </div>
                <span style={{ width: 13, height: 13, display: "flex", color: "#9ca3af" }}>{Icons.chevronDown}</span>
              </button>

              {profileOpen && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setProfileOpen(false)} />
                  <div style={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 200,
                    background: "#fff", borderRadius: 12, width: 200, padding: 8,
                    boxShadow: "0 10px 40px rgba(0,0,0,0.13)", border: "1px solid #e5e7eb",
                  }}>
                    <div style={{ padding: "8px 12px 10px", borderBottom: "1px solid #f0f0f0", marginBottom: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>System Admin</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>admin@vantrack.in</div>
                    </div>
                    <button onClick={()=> handleSignOut()} style={{
                      width: "100%", background: "#fef2f2", border: "none", borderRadius: 8,
                      padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "#dc2626",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
                    }}>
                      <span  style={{ width: 14, height: 14, display: "flex" }}>{Icons.signout}</span> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: "28px 28px 40px", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}