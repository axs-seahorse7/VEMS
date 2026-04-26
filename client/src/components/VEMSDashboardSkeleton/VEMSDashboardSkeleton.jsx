import React from "react";

/* ── Shimmer keyframe injected once ─────────────────────────── */
const SHIMMER_STYLE = `
  @keyframes vemsSkim {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  .vems-sk {
    background: linear-gradient(90deg, #f0f0f0 25%, #e4e4e4 50%, #f0f0f0 75%);
    background-size: 600px 100%;
    animation: vemsSkim 1.5s infinite linear;
    border-radius: 6px;
  }
`;

/* ── Reusable shimmer block ─────────────────────────────────── */
function Sk({ w = "100%", h = 12, r = 6, style = {} }) {
  return (
    <div
      className="vems-sk"
      style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════
   TOP NAV SKELETON
══════════════════════════════════════════════════════════════ */
function NavSkeleton() {
  return (
    <div style={{
      height: 56,
      background: "#fff",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      gap: 16,
    }}>
      {/* Logo area */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Sk w={36} h={36} r={8} />
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <Sk w={80} h={11} />
          <Sk w={60} h={9} />
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6 }}>
        {["All", "Waiting", "Inside", "Upcoming", "Dispatched"].map((_, i) => (
          <Sk key={i} w={80} h={30} r={20} />
        ))}
      </div>

      {/* Right icons */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Sk w={60} h={20} r={10} />
        <Sk w={28} h={28} r={6} />
        <Sk w={28} h={28} r={6} />
        <Sk w={36} h={36} r={18} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STAT CARD SKELETON  (the 9 counters at top)
══════════════════════════════════════════════════════════════ */
function StatCardSkeleton() {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: "14px 18px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      minWidth: 110,
      flex: "1 1 110px",
    }}>
      <Sk w={28} h={28} r={8} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Sk w={28} h={18} r={4} />
        <Sk w={56} h={10} r={4} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   VEHICLE CARD SKELETON  (matches card layout in screenshot)
══════════════════════════════════════════════════════════════ */
function VehicleCardSkeleton() {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 14,
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Top accent bar */}
      <div style={{ height: 3, background: "#e5e7eb" }} />

      {/* Card Header */}
      <div style={{
        padding: "12px 14px 10px",
        borderBottom: "1px solid #f3f4f6",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 10,
      }}>
        {/* Left: icon + vehicle number + transporter */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Sk w={32} h={32} r={8} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Sk w={110} h={13} />
            <Sk w={70} h={10} />
          </div>
        </div>

        {/* Right: factory badge + type badge */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <Sk w={42} h={20} r={5} />
          <Sk w={58} h={20} r={5} />
        </div>
      </div>

      {/* Status chips row */}
      <div style={{ padding: "8px 14px", display: "flex", gap: 6, alignItems: "center", borderBottom: "1px solid #f3f4f6" }}>
        <Sk w={44} h={22} r={6} />
        <Sk w={52} h={22} r={6} />
        <Sk w={52} h={22} r={6} />
        {/* Pass-type chip pushed right */}
        <div style={{ marginLeft: "auto" }}>
          <Sk w={70} h={22} r={6} />
        </div>
      </div>

      {/* Body: info rows + route tracker */}
      <div style={{ padding: "12px 14px 14px", display: "flex", gap: 14 }}>

        {/* Left: info rows */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Driver */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sk w={14} h={14} r={3} />
            <Sk w={44} h={10} />
            <Sk w={100} h={11} r={4} style={{ marginLeft: 4 }} />
          </div>
          {/* Purpose */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sk w={14} h={14} r={3} />
            <Sk w={52} h={10} />
            <Sk w={64} h={11} r={4} style={{ marginLeft: 4 }} />
          </div>
          {/* Route */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sk w={14} h={14} r={3} />
            <Sk w={38} h={10} />
            <Sk w={120} h={11} r={4} style={{ marginLeft: 4 }} />
          </div>
          {/* Load */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sk w={14} h={14} r={3} />
            <Sk w={30} h={10} />
            <Sk w={72} h={11} r={4} style={{ marginLeft: 4 }} />
          </div>
          {/* Material */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sk w={14} h={14} r={3} />
            <Sk w={50} h={10} />
            <Sk w={30} h={11} r={4} style={{ marginLeft: 4 }} />
          </div>
          {/* Trip At */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sk w={14} h={14} r={3} />
            <Sk w={40} h={10} />
            <Sk w={110} h={10} r={4} style={{ marginLeft: 4 }} />
          </div>
        </div>

        {/* Right: route tracker (dot → line → dot → line → dot) */}
        <div style={{
          width: 56,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
          paddingTop: 4,
          flexShrink: 0,
        }}>
          {/* Top label */}
          <Sk w={38} h={10} r={4} style={{ marginBottom: 6 }} />
          {/* Top dot */}
          <Sk w={10} h={10} r={5} />
          {/* Line segment */}
          <div style={{ width: 2, height: 24, background: "#e5e7eb", margin: "2px 0" }} />
          {/* Middle label */}
          <Sk w={44} h={9} r={4} style={{ marginBottom: 4 }} />
          {/* Middle dot */}
          <Sk w={10} h={10} r={5} />
          {/* Line segment */}
          <div style={{ width: 2, height: 24, background: "#e5e7eb", margin: "2px 0" }} />
          {/* Bottom dot (destination — larger) */}
          <Sk w={44} h={44} r={22} style={{ marginTop: 2 }} />
          {/* Bottom label */}
          <Sk w={36} h={10} r={4} style={{ marginTop: 5 }} />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   FULL DASHBOARD SKELETON
══════════════════════════════════════════════════════════════ */
export default function VEMSDashboardSkeleton({ cardCount = 5 }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#f7f8fa",
      fontFamily: "sans-serif",
    }}>
      <style>{SHIMMER_STYLE}</style>

      {/* Top Nav */}
      <NavSkeleton />

      <div style={{ padding: "18px 20px", maxWidth: 1600, margin: "0 auto" }}>

        {/* ── Stat cards row ── */}
        <div style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 20,
        }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        {/* ── "Showing N vehicles" label ── */}
        <div style={{ marginBottom: 14 }}>
          <Sk w={140} h={13} r={5} />
        </div>

        {/* ── Vehicle cards grid ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: 16,
        }}>
          {Array.from({ length: cardCount }).map((_, i) => (
            <VehicleCardSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* FAB bottom-right */}
      <div style={{ position: "fixed", bottom: 28, right: 28 }}>
        <Sk w={52} h={52} r={26} />
      </div>
    </div>
  );
}