// ── Congestion donut gauge ────────────────────────────────────────────────────

const ZONE_COLOR = {
  green:  { fill: "#0d9488", bg: "#ccfbf1", border: "#5eead4", text: "#0f766e", label: "Healthy"  },
  yellow: { fill: "#eab308", bg: "#fef9c3", border: "#fde047", text: "#854d0e", label: "Moderate" },
  red:    { fill: "#ef4444", bg: "#fee2e2", border: "#fca5a5", text: "#991b1b", label: "Critical" },
};

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



function CongestionGauge({ pct, zone }) {
  const SIZE   = 130;
  const STROKE = 14;
  const r      = (SIZE - STROKE) / 2;
  const circ   = 2 * Math.PI * r;
  const cx     = SIZE / 2;
  const zc     = ZONE_COLOR[zone] ?? ZONE_COLOR.green;

  // Zone thresholds drawn as background arc segments (grey track then coloured fill)
  const fillDash = Math.min((pct / 100) * circ, circ);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative" }}>
        <svg width={SIZE} height={SIZE} style={{ display: "block" }}>
          {/* grey track */}
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={C.slateLight} strokeWidth={STROKE} />
          {/* coloured fill */}
          <circle
            cx={cx} cy={cx} r={r} fill="none"
            stroke={zc.fill}
            strokeWidth={STROKE}
            strokeDasharray={`${fillDash} ${circ}`}
            strokeDashoffset={0}
            transform={`rotate(-90 ${cx} ${cx})`}
            style={{ transition: "stroke-dasharray 1s ease, stroke 0.4s ease" }}
          />
          {/* centre text */}
          <text x={cx} y={cx - 6} textAnchor="middle" dominantBaseline="middle"
            style={{ fontSize: 22, fontWeight: 800, fill: zc.fill, fontFamily: "'DM Sans', sans-serif" }}>
            {pct}%
          </text>
          <text x={cx} y={cx + 14} textAnchor="middle"
            style={{ fontSize: 10, fill: C.muted, fontFamily: "'DM Sans', sans-serif" }}>
            congestion
          </text>
        </svg>
      </div>

      {/* zone badge */}
      <div style={{
        background: zc.bg, border: `1px solid ${zc.border}`,
        borderRadius: 20, padding: "4px 14px",
        fontSize: 11, fontWeight: 700, color: zc.text,
        letterSpacing: 0.3,
      }}>
        {zc.label}
      </div>

      {/* threshold legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
        {[
          { zone: "green",  label: "Healthy",  range: "< 10%"   },
          { zone: "yellow", label: "Moderate", range: "10 – 20%" },
          { zone: "red",    label: "Critical",  range: "> 20%"   },
        ].map(t => {
          const tc = ZONE_COLOR[t.zone];
          const isActive = t.zone === zone;
          return (
            <div key={t.zone} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "5px 8px", borderRadius: 7,
              background: isActive ? tc.bg : "transparent",
              border: `1px solid ${isActive ? tc.border : "transparent"}`,
              transition: "background 0.3s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: tc.fill }} />
                <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? tc.text : C.muted }}>
                  {t.label}
                </span>
              </div>
              <span style={{ fontSize: 10, color: isActive ? tc.text : C.micro, fontWeight: 600 }}>
                {t.range}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CongestionGauge;