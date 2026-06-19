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



function Delta({ val }) {
  const up = val >= 0;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700,
      color: up ? "#059669" : C.redDark,
      background: up ? "#d1fae5" : "#fee2e2",
      borderRadius: 5, padding: "2px 6px", marginLeft: 6,
    }}>
      {up ? "▲" : "▼"} {Math.abs(val)}%
    </span>
  );
}

export default Delta;