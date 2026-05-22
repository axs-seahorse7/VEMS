// ─────────────────────────────────────────────────────────────────────────────
// AreaSparkline — responsive, with factory-breakdown tooltip on hover
// ─────────────────────────────────────────────────────────────────────────────
function AreaSparkline({ data, height = 70, color = C.teal }) {
  const containerRef = useRef(null);
  const [width,   setWidth]   = useState(0);
  const [tooltip, setTooltip] = useState(null); // { x, y, day }

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(containerRef.current);
    setWidth(containerRef.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const pts = (() => {
    if (!data || data.length === 0 || width === 0) return [];
    const vals = data.map(d => d.count);
    const max  = Math.max(...vals, 1);
    return data.map((d, i) => {
      const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width;
      const y = height - (d.count / max) * (height - 10) - 5;
      return { x, y, ...d };
    });
  })();

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = pts.length ? `${linePath} L${width},${height} L0,${height} Z` : "";
  const gradId   = `sparkGrad-${color.replace("#", "")}`;

  // Find nearest point by mouse X
  const handleMouseMove = (e) => {
    if (!pts.length) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    let   best = 0;
    let   bestDist = Infinity;
    pts.forEach((p, i) => {
      const d = Math.abs(p.x - mx);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    const p = pts[best];
    setTooltip({ svgX: p.x, svgY: p.y, day: p });
  };

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height, display: "block", position: "relative" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTooltip(null)}
    >
      {width > 0 && (
        <>
          <svg
            width={width}
            height={height}
            style={{ display: "block", overflow: "visible" }}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
            {linePath && (
              <path d={linePath} fill="none" stroke={color}
                strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            )}

            {/* regular dots */}
            {pts.map((p, i) =>
              p.count > 0 ? (
                <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
              ) : null
            )}

            {/* hover crosshair */}
            {tooltip && (
              <>
                <line
                  x1={tooltip.svgX} y1={0}
                  x2={tooltip.svgX} y2={height}
                  stroke={color} strokeWidth={1}
                  strokeDasharray="3 3" opacity={0.5}
                />
                <circle
                  cx={tooltip.svgX} cy={tooltip.svgY}
                  r={5} fill={color}
                  stroke="#fff" strokeWidth={2}
                />
              </>
            )}
          </svg>

          {/* ── Tooltip bubble ── */}
          {tooltip && (
            <TooltipBubble
              day={tooltip.day}
              svgX={tooltip.svgX}
              svgY={tooltip.svgY}
              containerWidth={width}
              color={color}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip bubble — factory breakdown for the hovered day
// ─────────────────────────────────────────────────────────────────────────────
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
          {factories.slice(0, 5).map((f, i) => {
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

// ─────────────────────────────────────────────────────────────────────────────
// Vehicle Usage card — replace the old card with this
// ─────────────────────────────────────────────────────────────────────────────
function VehicleUsageCard({ vehicle, weeklyStats, vehicleUsage }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <CardLabel>Vehicle Usage</CardLabel>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.04em", fontFamily: "monospace" }}>
            {vehicle?.vehicleNumber ?? "—"}
          </div>
        </div>
        <div style={{
          background: C.tealLight, color: C.teal,
          fontSize: 11, fontWeight: 700,
          borderRadius: 8, padding: "4px 10px",
        }}>
          {weeklyStats.avgTripsPerDay} trips/day avg
        </div>
      </div>

      {/* Big hours number */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <BigNumber>{weeklyStats.totalTripHours}h</BigNumber>
        <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>total trip hours</span>
      </div>

      {/* Sparkline — uses factoryDailyArr for tooltip factory breakdown */}
      <div style={{ marginTop: 4 }}>
        <AreaSparkline
          data={vehicleUsage.factoryDailyArr ?? vehicleUsage.dailyTrend}
          height={150}
          color={C.teal}
        />
      </div>

      {/* x-axis labels: first and last date */}
      {vehicleUsage.factoryDailyArr?.length > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.micro, marginTop: -2 }}>
          <span>
            {new Date(vehicleUsage.factoryDailyArr[0].date)
              .toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
          <span>
            {new Date(vehicleUsage.factoryDailyArr[vehicleUsage.factoryDailyArr.length - 1].date)
              .toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
        </div>
      )}

      {/* Footer stats */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 8, marginTop: 4,
      }}>
        <div style={{
          background: "#f8fafc", border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "8px 10px",
        }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
            Total Trips
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginTop: 2 }}>
            {weeklyStats.periodClosed}
          </div>
        </div>
        <div style={{
          background: C.tealLight, border: `1px solid ${C.tealMid}`,
          borderRadius: 8, padding: "8px 10px",
        }}>
          <div style={{ fontSize: 10, color: C.teal, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
            Avg / Day
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.teal, marginTop: 2 }}>
            {weeklyStats.avgTripsPerDay}
          </div>
        </div>
      </div>
    </Card>
  );
}