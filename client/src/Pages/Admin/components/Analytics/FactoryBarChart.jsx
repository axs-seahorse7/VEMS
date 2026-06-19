import { useState, useEffect, useRef } from "react";
import { Card } from "antd";
import CardLabel from "../Cards/CardLabel.jsx";
import BigNumber from "../Cards/BigNumber.jsx";


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

function FactoryBarChart({ data, color }) {
  const containerRef = useRef(null);
  const [width,   setWidth]   = useState(0);
  const [tooltip, setTooltip] = useState(null);


  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(containerRef.current);
    setWidth(containerRef.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0", fontSize: 12, color: C.muted }}>
        No data for this period
      </div>
    );
  }

  // layout constants
  const PADDING_LEFT  = 38;
  const PADDING_RIGHT = 0;
  const PADDING_TOP   = 16;
  const PADDING_BOT   = 56;
  const HEIGHT        = 250;
  const chartW = Math.max(0, width - PADDING_LEFT - PADDING_RIGHT);
  const chartH = HEIGHT - PADDING_TOP - PADDING_BOT;

  const maxVal  = Math.max(...data?.map(d => d.count), 1);
  const yTicks  = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * maxVal));

  const groupW  = chartW / data?.length;
  const barW    = Math.max(6, Math.min(40, groupW * 0.55));

  const barX = (i) => PADDING_LEFT + i * groupW + groupW / 2 - barW / 2;
  const barH = (v) => Math.max(2, (v / maxVal) * chartH);
  const barY = (v) => PADDING_TOP + chartH - barH(v);

  return (
    <div ref={containerRef} style={{ width: "100%", position: "relative" }}>
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          style={{ display: "block", overflow: "visible" }}
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            <linearGradient id={`barGrad-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity="1"   />
              <stop offset="100%" stopColor={color} stopOpacity="0.55" />
            </linearGradient>
          </defs>

          {/* Y grid lines + labels */}
          {yTicks.map((tick, i) => {
            const cy = PADDING_TOP + chartH - (tick / maxVal) * chartH;
            return (
              <g key={i}>
                <line
                  x1={PADDING_LEFT} y1={cy}
                  x2={PADDING_LEFT + chartW} y2={cy}
                  stroke={C.slateLight} strokeWidth={1}
                  strokeDasharray={tick === 0 ? "none" : "3 3"}
                />
                <text
                  x={PADDING_LEFT - 5} y={cy + 4}
                  textAnchor="end"
                  style={{ fontSize: 9, fill: C.micro, fontFamily: "'DM Sans', sans-serif" }}
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data?.map((item, i) => {
            const bx        = barX(i);
            const bh        = barH(item.count);
            const by        = barY(item.count);
            const isHovered = tooltip?.item?.factoryName === item.factoryName;
            const gradId    = `barGrad-${color.replace("#","")}`;

            return (
              <g
                key={i}
                onMouseMove={() => setTooltip({ x: bx + barW / 2, y: by, item })}
                style={{ cursor: "pointer" }}
              >
                {/* invisible wide hover zone */}
                <rect
                  x={PADDING_LEFT + i * groupW} y={PADDING_TOP}
                  width={groupW} height={chartH}
                  fill="transparent"
                />
                {/* bar */}
                <rect
                  x={bx} y={by}
                  width={barW} height={bh}
                  rx={4} ry={4}
                  fill={isHovered ? color : `url(#${gradId})`}
                  opacity={tooltip && !isHovered ? 0.35 : 1}
                  style={{ transition: "opacity 0.15s" }}
                />
                {/* count label above bar */}
                {bh > 0 && (
                  <text
                    x={bx + barW / 2} y={by - 5}
                    textAnchor="middle"
                    style={{ fontSize: 9, fontWeight: 700, fill: color, fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {item.count}
                  </text>
                )}
                {/* X-axis factory label (rotated) */}
                <text
                  x={bx + barW / 2}
                  y={PADDING_TOP + chartH + 10}
                  textAnchor="end"
                  transform={`rotate(-38, ${bx + barW / 2}, ${PADDING_TOP + chartH + 10})`}
                  style={{
                    fontSize:   Math.max(8, Math.min(11, groupW * 0.28)),
                    fill:       isHovered ? color : C.muted,
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: isHovered ? 700 : 400,
                    transition: "fill 0.15s",
                  }}
                >
                  {item.factoryName.length > 14
                    ? item.factoryName.slice(0, 13) + "…"
                    : item.factoryName}
                </text>
              </g>
            );
          })}

          {/* Y axis */}
          <line
            x1={PADDING_LEFT} y1={PADDING_TOP}
            x2={PADDING_LEFT} y2={PADDING_TOP + chartH}
            stroke={C.slateLight} strokeWidth={1.5}
          />
          {/* X axis */}
          <line
            x1={PADDING_LEFT}          y1={PADDING_TOP + chartH}
            x2={PADDING_LEFT + chartW} y2={PADDING_TOP + chartH}
            stroke={C.slateLight} strokeWidth={1.5}
          />
        </svg>
      )}

      {/* Tooltip */}
      {tooltip && width > 0 && (
        <div style={{
          position:      "absolute",
          top:           Math.max(0, tooltip.y - 8),
          left:          tooltip.x + 170 + 10 > width ? tooltip.x - 170 - 10 : tooltip.x + 10,
          width:         170,
          background:    "#fff",
          border:        `1px solid ${C.border}`,
          borderRadius:  10,
          padding:       "10px 12px",
          boxShadow:     "0 4px 20px rgba(0,0,0,0.10)",
          pointerEvents: "none",
          zIndex:        50,
          fontFamily:    "'DM Sans', sans-serif",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6, lineHeight: 1.3 }}>
            {tooltip.item.factoryName}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 800, color }}>
              {tooltip.item.count}
            </span>
            <span style={{ fontSize: 11, color: C.muted }}>
              trip{tooltip.item.count !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default FactoryBarChart;