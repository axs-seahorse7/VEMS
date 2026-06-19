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



function Donut({ segments, size = 120, stroke = 14, label, sublabel }) {
  const r   = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const cx   = size / 2;
  let offset = 0;
  // start from top
  const startRotate = -90;

  return (
    <svg width={size} height={size} style={{ display: "block" }}>
      {/* track */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={C.slateLight} strokeWidth={stroke} />
      {segments?.map((seg, i) => {
        const dash = (seg.pct / 100) * circ;
        const gap  = circ - dash;
        const el = (
          <circle
            key={i}
            cx={cx} cy={cx} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-(offset / 100) * circ}
            transform={`rotate(${startRotate} ${cx} ${cx})`}
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        );
        offset += seg.pct;
        return el;
      })}
      {/* centre label */}
      {label !== undefined && (
        <>
          <text x={cx} y={cx - 4} textAnchor="middle" dominantBaseline="middle"
            style={{ fontSize: size * 0.17, fontWeight: 800, fill: C.text, fontFamily: "'DM Sans', sans-serif" }}>
            {label}
          </text>
          {sublabel && (
            <text x={cx} y={cx + size * 0.14} textAnchor="middle"
              style={{ fontSize: size * 0.1, fill: C.muted, fontFamily: "'DM Sans', sans-serif" }}>
              {sublabel}
            </text>
          )}
        </>
      )}
    </svg>
  );
}


export default Donut;