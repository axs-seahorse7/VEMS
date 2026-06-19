const C = {
  teal:     "#0d9488",
  blue:     "#24B1B1",
  tealLight:"#ccfbf1",
  tealMid:  "#5eead4",
  slate:    "#94a3b8",
  slateLight:"#e2e8f0",
  red:      "#fca5a5",
  redDark:  "#ef4444",
  bg:       "#f8fafc",
  card:     "#ffffff",
  border:   "#e5e7eb",
  text:     "#0f172a",
  muted:    "#64748b",
  micro:    "#94a3b8",
};



function BottleneckBar({ label, pct, count, total, color, description }) {
  const isRed = pct >= 20;
  const barColor = isRed ? "#ef4444" : pct >= 10 ? "#eab308" : color;

  return (
    <div style={{
      background: "#f8fafc",
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: "12px 14px",
    }}>
      {/* header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{label}</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{description}</div>
        </div>
        <div style={{
          fontSize: 18, fontWeight: 800,
          color: barColor,
          background: barColor + "18",
          borderRadius: 8, padding: "3px 10px",
          lineHeight: 1.4,
        }}>
          {pct}%
        </div>
      </div>

      {/* bar track */}
      <div style={{ height: 8, background: C.slateLight, borderRadius: 99, overflow: "hidden", marginBottom: 6 }}>
        <div style={{
          width: `${Math.min(pct, 100)}%`,
          height: "100%",
          borderRadius: 99,
          background: barColor,
          transition: "width 1s cubic-bezier(.4,0,.2,1)",
        }} />
      </div>

      {/* count detail */}
      <div style={{ fontSize: 10, color: C.muted }}>
        <span style={{ fontWeight: 700, color: barColor }}>{count}</span>
        {" waiting "}
        <span style={{ fontWeight: 600, color: C.text }}>{total}</span>
        {" total "}
      </div>
    </div>
  );
}

export default BottleneckBar;