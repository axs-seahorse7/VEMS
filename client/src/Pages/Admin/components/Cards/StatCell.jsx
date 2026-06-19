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


function StatCell({ label, value, accent = false }) {
  return (
    <div style={{
      background: accent ? C.tealLight : "#f8fafc",
      border: `1px solid ${accent ? C.tealMid : C.border}`,
      borderRadius: 10, padding: "10px 12px",
    }}>
      <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: accent ? C.teal : C.text, fontFamily: "'DM Sans', sans-serif" }}>
        {value}
      </div>
    </div>
  );
}

export default StatCell;