function TooltipBubble({ day, svgX, svgY, containerWidth, color }) {
  const TIP_W  = 200;
  const OFFSET = 12;

  // flip left when near right edge
  const left = svgX + TIP_W + OFFSET > containerWidth
    ? svgX - TIP_W - OFFSET
    : svgX + OFFSET;

  // sort factories desc
  const factories = [...(day.factories ?? [])].sort((a, b) => b.count - a.count);

  return (
    <div style={{
      position:   "absolute",
      top:        Math.max(0, svgY - 12),
      left,
      width:      TIP_W,
      background: "#fff",
      border:     `1px solid ${C.border}`,
      borderRadius: 10,
      padding:    "10px 12px",
      boxShadow:  "0 4px 20px rgba(0,0,0,0.10)",
      pointerEvents: "none",
      zIndex:     50,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Date + total */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>
          {new Date(day.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 800,
          background: color + "18", color,
          borderRadius: 6, padding: "2px 8px",
        }}>
          {day.count} trip{day.count !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Factory rows */}
      {factories.length === 0 ? (
        <div style={{ fontSize: 11, color: C.muted }}>No trips</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {factories.slice(0, 5)?.map((f, i) => {
            const barPct = day.count > 0 ? (f.count / day.count) * 100 : 0;
            return (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 2 }}>
                  <span style={{ color: C.text, fontWeight: 600, maxWidth: 130,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.factoryName}
                  </span>
                  <span style={{ color: C.muted, fontWeight: 700, flexShrink: 0, marginLeft: 6 }}>
                    {f.count}
                  </span>
                </div>
                {/* mini inline bar */}
                <div style={{ height: 4, background: C.slateLight, borderRadius: 99, overflow: "hidden" }}>
                  <div style={{
                    width: `${barPct}%`, height: "100%",
                    background: color, borderRadius: 99,
                  }} />
                </div>
              </div>
            );
          })}
          {factories.length > 5 && (
            <div style={{ fontSize: 10, color: C.micro, marginTop: 2 }}>
              +{factories.length - 5} more factories
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TooltipBubble;