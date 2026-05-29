import { useState, useRef, useEffect } from "react";
import { Badge, Spin, Empty, Typography } from "antd";
import { BellOutlined, CheckOutlined } from "@ant-design/icons";
import api from "../../../../services/API/Api/api"; // adjust path

const { Text } = Typography;

// ─── Time ago helper ──────────────────────────────────────────────────────────
function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const popoverRef = useRef(null);
  const bellRef    = useRef(null);

  // ── Close on outside click ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        bellRef.current    && !bellRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Fetch unread count on mount (lightweight) ───────────────────────────
  useEffect(() => {
    const fetchUnreadCount = async () => {
        try {
        const res = await api.get("/settings/notifications/unread-count");
        setUnreadCount(res.data.count);
        } catch (err) {
        // silently fail
        }
    };

    // Initial fetch
    fetchUnreadCount();

    // When user comes back to tab/window
    const handleFocus = () => {
        fetchUnreadCount();
    };

    // When tab becomes visible again
    const handleVisibility = () => {
        if (document.visibilityState === "visible") {
        fetchUnreadCount();
        }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
        window.removeEventListener("focus", handleFocus);
        document.removeEventListener("visibilitychange", handleVisibility);
    };
    }, []);

  // ── Fetch notifications when bell is clicked ────────────────────────────
  const handleBellClick = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen) return;

    setLoading(true);
    try {
      const res = await api.get("/settings/notifications/mine");
        setNotifications(res?.data?.sorted || []);
        setUnreadCount(res?.data?.sorted.filter(n => !n.isRead).length || 0);
      
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  // ── Mark all as read ────────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    try {
      await api.patch("/settings/notifications/mark-read");
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      message.error("Failed to mark all as read. Please try again.");
    }
  };

  // ── Mark single as read ─────────────────────────────────────────────────
  const handleMarkOne = async (notifId) => {
    try {
      await api.patch(`/settings/notifications/mark-read/${notifId}`);
      setNotifications(prev =>
        prev.map(n => n._id === notifId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      message.error("Failed to mark as read. Please try again.");
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {/* ── Bell Button ── */}
      <button
        ref={bellRef}
        onClick={handleBellClick}
        style={{
          border: "none", background: open ? "#f5f3ff" : "#f3f4f6",
          borderRadius: 8, width: 34, height: 34,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", position: "relative",
          transition: "background .15s",
          outline: open ? "1.5px solid #6366f1" : "1.5px solid transparent",
        }}
      >
        <Badge
          count={unreadCount}
          size="small"
          offset={[2, -2]}
          style={{ fontSize: 9, minWidth: 14, height: 14, lineHeight: "14px", padding: "0 3px" }}
        >
          <BellOutlined style={{ fontSize: 16, color: open ? "#6366f1" : "#6b7280" }} />
        </Badge>
      </button>

      {/* ── Popover Panel ── */}
      {open && (
        <div
          ref={popoverRef}
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            width: 340, background: "#fff",
            borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
            border: "1px solid #e5e7eb", zIndex: 9999, overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", borderBottom: "1px solid #f3f4f6",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <BellOutlined style={{ color: "#6366f1", fontSize: 14 }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{
                  background: "#6366f1", color: "#fff", borderRadius: 10,
                  fontSize: 10, fontWeight: 700, padding: "1px 6px",
                }}>{unreadCount}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  border: "none", background: "none", cursor: "pointer",
                  fontSize: 11, color: "#6366f1", fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 3, padding: 0,
                }}
              >
                <CheckOutlined style={{ fontSize: 10 }} /> Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "36px 0" }}>
                <Spin size="default" />
              </div>
            ) : notifications.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<Text type="secondary" style={{ fontSize: 12 }}>No notifications yet</Text>}
                style={{ padding: "36px 0" }}
              />
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => !n.isRead && handleMarkOne(n._id)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #f9fafb",
                    background: n.isRead ? "#fff" : "#faf5ff",
                    cursor: n.isRead ? "default" : "pointer",
                    transition: "background .15s",
                    display: "flex", gap: 10, alignItems: "flex-start",
                  }}
                >
                  {/* Unread dot */}
                  <div style={{ paddingTop: 5, flexShrink: 0 }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: n.isRead ? "#e5e7eb" : "#6366f1",
                      transition: "background .2s",
                    }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: n.isRead ? 500 : 700,
                      fontSize: 12.5, color: "#111",
                      marginBottom: 2,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {n.header}
                    </div>
                    <div style={{
                      fontSize: 12, color: "#6b7280", lineHeight: 1.45,
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: "8px 16px", borderTop: "1px solid #f3f4f6",
              textAlign: "center",
            }}>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>
                Showing {notifications.length} most recent notification{notifications.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}