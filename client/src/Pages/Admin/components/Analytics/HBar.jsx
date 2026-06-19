function HBar({ label, value, max = 100, color = C.teal, suffix = "" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ fontWeight: 700, color: C.text }}>{value}{suffix}</span>
      </div>
      <div style={{ height: 7, background: C.slateLight, borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 99,
          background: color,
          transition: "width 0.9s cubic-bezier(.4,0,.2,1)",
        }} />
      </div>
    </div>
  );
}

export default HBar;