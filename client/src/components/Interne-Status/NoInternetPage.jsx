import { useState, useEffect } from "react";

export default function NoInternetPage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [visible, setVisible] = useState(!navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOnline(false);
      setVisible(true);
      setJustReconnected(false);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      // Hide the "back online" message after 3s
      setTimeout(() => {
        setVisible(false);
        setJustReconnected(false);
      }, 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>

      <div
        style={{
          animation: "slideDown 0.2s ease both",
          background: isOnline ? "#f0fdf4" : "#fafafa",
          borderBottom: `1px solid ${isOnline ? "#bbf7d0" : "#e5e7eb"}`,
          padding: "7px 20px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
          color: isOnline ? "#166534" : "#374151",
          fontWeight: 500,
        }}
      >
        {/* Dot */}
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: isOnline ? "#22c55e" : "#9ca3af",
            flexShrink: 0,
            animation: isOnline ? "none" : "blink 1.5s ease-in-out infinite",
          }}
        />

        {isOnline ? (
          <span>Back online</span>
        ) : (
          <>
            <span>No internet connection</span>
            <span style={{ color: "#9ca3af", fontWeight: 400 }}>·</span>
            <span style={{ color: "#6b7280", fontWeight: 400 }}>
              Data may be outdated
            </span>
          </>
        )}
      </div>
    </>
  );
}