import { useState, useEffect, useRef } from "react";
import api from "../../../../services/API/Api/api"; // adjust path
import {Divider} from "antd";
import DriverSearchPage from "../components/Cards/DriverSearchPage.jsx";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement,
  Tooltip, Filler, Legend, ArcElement
} from "chart.js";
import { Line, Doughnut  } from "react-chartjs-2";
import { useQuery } from "@tanstack/react-query";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Filler, Legend);


const PERIODS = [
  { key: "today",   label: "Today" },
  { key: "week",    label: "Week" },
  { key: "month",   label: "Month" },
  { key: "quarter", label: "Quarter" },
];

const VEHICLE_ICONS = {
  truck: "🚛", miniTruck: "🚚", containerTruck: "🚛", mixerTruck: "🚜",
  waterTanker: "🚒", tractor: "🚜", car: "🚗", bus: "🚌",
  ambulance: "🚑", van: "🚐", trailer: "🚋",
};

// ── colour palette (teal-based, matches screenshot) ───────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Tiny SVG Donut
// ─────────────────────────────────────────────────────────────────────────────
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
      {segments.map((seg, i) => {
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

  const maxVal  = Math.max(...data.map(d => d.count), 1);
  const yTicks  = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * maxVal));

  const groupW  = chartW / data.length;
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
          {data.map((item, i) => {
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
                {bh > 16 && (
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

// ─────────────────────────────────────────────────────────────────────────────
// VehicleUsageCard
// ─────────────────────────────────────────────────────────────────────────────
function VehicleUsageCard({ vehicle, weeklyStats, vehicleUsage }) {
  const [mode, setMode] = useState("closed"); // "closed" | "cancelled"
  const chartData  = mode === "closed"
    ? (vehicleUsage.factoryChart?.closed    ?? [])
    : mode === "active"
    ? (vehicleUsage.factoryChart?.active    ?? [])
    : (vehicleUsage.factoryChart?.cancelled ?? []);

  const chartColor = mode === "closed" ? C.teal : mode === "active" ? C.blue : "#EA5252";
  const totalShown = chartData?.reduce((s, d) => s + d.count, 0);

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 10,}}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div>
          <CardLabel>Vehicle — Factory Flow</CardLabel>
          
        </div>

        {/* Dropdown */}
        <div style={{ position: "relative" }}>
          <select
            value={mode}
            onChange={e => setMode(e.target.value)}
            style={{
              appearance:        "none",
              WebkitAppearance:  "none",
              background:        "#fff",
              border:            `1.5px solid ${chartColor}`,
              borderRadius:      8,
              padding:           "6px 28px 6px 10px",
              fontSize:          12,
              fontWeight:        700,
              color:             chartColor,
              cursor:            "pointer",
              outline:           "none",
              fontFamily:        "'DM Sans', sans-serif",
              transition:        "border-color 0.2s, color 0.2s",
            }}
          >
            <option value="closed">✓  Completed Trips</option>
            <option value="active">✓  Active Trips</option>
            <option value="cancelled">✕  Cancelled Trips</option>
          </select>
          <span style={{
            position:      "absolute",
            right:         8, top: "50%",
            transform:     "translateY(-50%)",
            pointerEvents: "none",
            fontSize:      10,
            color:         chartColor,
          }}>▾</span>
        </div>
      </div>

      {/* Big number */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <BigNumber style={{ color: chartColor }}>{totalShown}</BigNumber>
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>
          {mode === "closed" ? "completed" : mode === "active" ? "active" : "cancelled"} trips
          {" · "}
          {chartData.length} factor{chartData.length !== 1 ? "ies" : "y"}
        </span>
      </div>

      {/* Bar chart */}
      <FactoryBarChart data={chartData} color={chartColor} />
        <div style={{ fontSize: 11, color: C.muted, marginTop: -16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}> 
          {mode === "closed"
            ? "Distribution of completed trips across factories"
            : mode === "active"
            ? "Distribution of active trips across factories"
            : "Distribution of cancelled trips across factories"}
        </div>
      
    </Card>
  );
}

// ── Zone colour map ───────────────────────────────────────────────────────────
const ZONE_COLOR = {
  green:  { fill: "#0d9488", bg: "#ccfbf1", border: "#5eead4", text: "#0f766e", label: "Healthy"  },
  yellow: { fill: "#eab308", bg: "#fef9c3", border: "#fde047", text: "#854d0e", label: "Moderate" },
  red:    { fill: "#ef4444", bg: "#fee2e2", border: "#fca5a5", text: "#991b1b", label: "Critical" },
};

// ── Congestion donut gauge ────────────────────────────────────────────────────
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

// ── Bottleneck horizontal bar ─────────────────────────────────────────────────
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




function DriverAnalyticsCard({ driverAnalytics }) {
  const [sortKey,  setSortKey]  = useState("completed"); // completed|cancelled|active|total
  const [sortDir,  setSortDir]  = useState("desc");
  const [search,   setSearch]   = useState("");
  const [expanded, setExpanded] = useState(null); // driverId string

  if (!driverAnalytics) return null;

  const { drivers = [], totals } = driverAnalytics;

  // ── filter + sort ───────────────────────────────────────────────────────
  const filtered = drivers
    .filter(d => d.driverName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === "desc" ? -diff : diff;
    });

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sortIcon = (key) => {
    if (sortKey !== key) return <span style={{ color: C.slateLight, marginLeft: 3 }}>↕</span>;
    return <span style={{ color: C.teal, marginLeft: 3 }}>{sortDir === "desc" ? "↓" : "↑"}</span>;
  };

  // ── colour helpers ──────────────────────────────────────────────────────
  const rateColor = (pct) =>
    pct >= 80 ? C.teal : pct >= 50 ? "#eab308" : "#ef4444";

  const rateBg = (pct) =>
    pct >= 80 ? C.tealLight : pct >= 50 ? "#fef9c3" : "#fee2e2";

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div>
          <CardLabel>Driver Analytics</CardLabel>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            Trip performance per driver · Top {drivers.length} drivers
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)",
            fontSize: 12, color: C.muted, pointerEvents: "none" }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search driver…"
            style={{
              border: `1.5px solid ${C.border}`, borderRadius: 8,
              padding: "6px 10px 6px 26px", fontSize: 12,
              color: C.text, background: "#fff", outline: "none",
              fontFamily: "'DM Sans', sans-serif", width: 160,
            }}
          />
        </div>
      </div>

      {/* ── Summary KPI row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {[
          { label: "Drivers",   value: totals.totalDrivers,   color: C.text,     bg: "#f8fafc",    border: C.border        },
          { label: "Completed", value: totals.totalCompleted, color: C.teal,     bg: C.tealLight,  border: C.tealMid       },
          { label: "Cancelled", value: totals.totalCancelled, color: "#ef4444",  bg: "#fee2e2",    border: "#fca5a5"       },
          { label: "Active",    value: totals.totalActive,    color: "#eab308",  bg: "#fef9c3",    border: "#fde047"       },
        ].map(k => (
          <div key={k.label} style={{
            background: k.bg, border: `1px solid ${k.border}`,
            borderRadius: 10, padding: "10px 12px", textAlign: "center",
          }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>
              {k.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color,
              fontFamily: "'DM Sans', sans-serif" }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", fontSize: 13, color: C.muted }}>
          No drivers found
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                {[
                  { key: null,        label: "#",          w: 32  },
                  { key: null,        label: "Driver",     w: null },
                  { key: "total",     label: "Total",      w: 70  },
                  { key: "completed", label: "Completed",  w: 90  },
                  { key: "cancelled", label: "Cancelled",  w: 90  },
                  { key: "active",    label: "Active",     w: 70  },
                  { key: "completionRate", label: "Rate",  w: 80  },
                  { key: null,        label: "",           w: 32  },
                ].map((col, i) => (
                  <th key={i}
                    onClick={() => col.key && handleSort(col.key)}
                    style={{
                      padding: "8px 10px",
                      textAlign: i === 0 ? "center" : "left",
                      fontWeight: 700, color: col.key === sortKey ? C.teal : C.muted,
                      fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4,
                      cursor: col.key ? "pointer" : "default",
                      userSelect: "none",
                      width: col.w ?? "auto",
                      whiteSpace: "nowrap",
                    }}>
                    {col.label}{col.key && sortIcon(col.key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((driver, idx) => {
                const isExp  = expanded === String(driver.driverId);
                const rc     = rateColor(driver.completionRate);
                const maxVal = Math.max(driver.completed, driver.cancelled, driver.active, 1);

                return (
                  <>
                    <tr
                      key={driver.driverId}
                      onClick={() => setExpanded(isExp ? null : String(driver.driverId))}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: isExp ? "#f8fafc" : "transparent",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => { if (!isExp) e.currentTarget.style.background = "#f8fafc"; }}
                      onMouseLeave={e => { if (!isExp) e.currentTarget.style.background = "transparent"; }}
                    >
                      {/* rank */}
                      <td style={{ padding: "10px 10px", textAlign: "center", color: C.muted,
                        fontSize: 11, fontWeight: 700 }}>
                        {idx + 1}
                      </td>

                      {/* name */}
                      <td style={{ padding: "10px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {/* avatar */}
                          <div style={{
                            width: 30, height: 30, borderRadius: "50%",
                            background: `hsl(${(driver.driverName.charCodeAt(0) * 37) % 360}, 60%, 88%)`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 800, flexShrink: 0,
                            color: `hsl(${(driver.driverName.charCodeAt(0) * 37) % 360}, 50%, 35%)`,
                          }}>
                            {driver.driverName.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: C.text }}>
                            {driver.driverName}  ({driver?.driverContact})
                          </span>
                        </div>
                      </td>

                      {/* total */}
                      <td style={{ padding: "10px 10px", fontWeight: 700, color: C.text }}>
                        {driver.total}
                      </td>

                      {/* completed */}
                      <td style={{ padding: "10px 10px" }}>
                        <span style={{ fontWeight: 700, color: C.teal }}>{driver.completed}</span>
                      </td>

                      {/* cancelled */}
                      <td style={{ padding: "10px 10px" }}>
                        <span style={{ fontWeight: 700, color: driver.cancelled > 0 ? "#ef4444" : C.muted }}>
                          {driver.cancelled}
                        </span>
                      </td>

                      {/* active */}
                      <td style={{ padding: "10px 10px" }}>
                        <span style={{ fontWeight: 700, color: driver.active > 0 ? "#eab308" : C.muted }}>
                          {driver.active}
                        </span>
                      </td>

                      {/* completion rate badge */}
                      <td style={{ padding: "10px 10px" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 800,
                          color: rc,
                          background: rateBg(driver.completionRate),
                          borderRadius: 20, padding: "3px 9px",
                          whiteSpace: "nowrap",
                        }}>
                          {driver.completionRate}%
                        </span>
                      </td>

                      {/* expand toggle */}
                      <td style={{ padding: "10px 10px", textAlign: "center",
                        fontSize: 12, color: C.muted }}>
                        {isExp ? "▲" : "▼"}
                      </td>
                    </tr>

                    {/* ── Expanded row: mini bar chart ── */}
                    {isExp && (
                      <tr key={`${driver.driverId}-exp`}
                        style={{ background: "#f8fafc", borderBottom: `1px solid ${C.border}` }}>
                        <td colSpan={8} style={{ padding: "12px 16px" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted,
                            textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 }}>
                            Trip Breakdown — {driver.driverName}
                          </div>

                          {/* inline mini bars */}
                          {[
                            { label: "Completed", value: driver.completed, color: C.teal     },
                            { label: "Cancelled", value: driver.cancelled, color: "#ef4444"  },
                            { label: "Active",    value: driver.active,    color: "#eab308"  },
                          ].map(b => {
                            const pct = maxVal > 0 ? (b.value / maxVal) * 100 : 0;
                            return (
                              <div key={b.label} style={{ marginBottom: 8 }}>
                                <div style={{ display: "flex", justifyContent: "space-between",
                                  fontSize: 11, marginBottom: 3 }}>
                                  <span style={{ fontWeight: 600, color: C.muted }}>{b.label}</span>
                                  <span style={{ fontWeight: 700, color: b.color }}>{b.value} trips</span>
                                </div>
                                <div style={{ height: 6, background: C.slateLight, borderRadius: 99, overflow: "hidden" }}>
                                  <div style={{
                                    width: `${pct}%`, height: "100%",
                                    background: b.color, borderRadius: 99,
                                    transition: "width 0.7s ease",
                                  }} />
                                </div>
                              </div>
                            );
                          })}

                          {/* completion rate visual */}
                          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>Completion Rate</span>
                            <div style={{ flex: 1, height: 6, background: C.slateLight, borderRadius: 99, overflow: "hidden" }}>
                              <div style={{
                                width: `${driver.completionRate}%`, height: "100%",
                                background: rateColor(driver.completionRate), borderRadius: 99,
                                transition: "width 0.7s ease",
                              }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 800, color: rateColor(driver.completionRate),
                              minWidth: 36, textAlign: "right" }}>
                              {driver.completionRate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Footer note ── */}
      <div style={{ fontSize: 10, color: C.micro, paddingTop: 8,
        borderTop: `1px solid ${C.border}` }}>
        Based on TripSegment assignments · Each driver counted once per unique trip ·
        Sorted by {sortKey} {sortDir === "desc" ? "↓" : "↑"}
      </div>

    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Horizontal bar (for idle analysis / driver behavior)
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Vertical bar (driver behavior — mimics screenshot bar chart)
// ─────────────────────────────────────────────────────────────────────────────
function VBarGroup({ bars }) {
  const max = Math.max(...bars.map(b => b.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 90, marginTop: 8 }}>
      {bars.map((b, i) => {
        const pct = (b.value / max) * 100;
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 5 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.text }}>{b.value}%</div>
            <div style={{ width: "100%", display: "flex", alignItems: "flex-end", height: 64 }}>
              <div style={{
                width: "100%",
                height: `${pct}%`,
                minHeight: 4,
                background: b.color,
                borderRadius: "4px 4px 0 0",
                transition: "height 0.9s ease",
              }} />
            </div>
            <div style={{ fontSize: 9.5, color: C.muted, textAlign: "center", lineHeight: 1.3 }}>{b.label}</div>
          </div>
        );
      })}
    </div>
  );
}


function TripExecutionDonut({ segments }) {
  const data = {
    labels: segments.map((s) => s.label),
    datasets: [
      {
        data: segments.map((s) => s.value),
        backgroundColor: segments.map((s) => s.color),
        hoverBackgroundColor: segments.map((s) => s.colorLight),
        borderColor: "#ffffff",
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    cutout: "65%",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          usePointStyle: true,
          pointStyle: "rectRounded",
          font: { size: 10, weight: "600" },
          color: "#6b7280",
          padding: 14,
          generateLabels: (chart) =>
            chart.data.labels.map((label, i) => ({
              text: `${label}  ${chart.data.datasets[0].data[i]}%`,
              fillStyle: chart.data.datasets[0].backgroundColor[i],
              strokeStyle: "#fff",
              lineWidth: 0,
              hidden: false,
              index: i,
            })),
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%`,
        },
        backgroundColor: "#1f2937",
        titleColor: "#f9fafb",
        bodyColor: "#d1d5db",
        padding: 10,
        cornerRadius: 8,
      },
    },
  };

  // Center text plugin (inline, no registration needed as chartjs plugin)
  const centerTextPlugin = {
    id: "centerText",
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const cx = (chartArea.left + chartArea.right) / 2;
      const cy = (chartArea.top + chartArea.bottom) / 2;

      const active = chart.getActiveElements();
      const hasHover = active.length > 0;
      const idx = hasHover ? active[0].index : null;
      const seg = hasHover ? segments[idx] : null;

      ctx.save();

      // Big value
      ctx.font = "800 18px DM Sans, sans-serif";
      ctx.fillStyle = seg ? seg.color : "#111827";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        seg ? `${seg.value}%` : `${segments?.reduce((a, s) => a + s.value, 0).toFixed(1)}%`,
        cx,
        cy - 8
      );

      // Sub label
      ctx.font = "600 9px DM Sans, sans-serif";
      ctx.fillStyle = "#9ca3af";
      ctx.fillText(seg ? seg.label.split(" ").slice(-1)[0] : "Total", cx, cy + 10);

      ctx.restore();
    },
  };

  return (
    <div style={{ position: "relative", height: 160, width: "100%" }}>
      <Doughnut data={data} options={options} plugins={[centerTextPlugin]} />
    </div>
  );
}



// ── Main card ─────────────────────────────────────────────────────────────────
function WaitingAnalysisCard({ waitingAnalysis }) {
  if (!waitingAnalysis) return null;

  const { outsideWaiting, insideWaiting, congestion } = waitingAnalysis;

  // Which stage is the bigger bottleneck?
  const bottleneckStage = outsideWaiting.pct >= insideWaiting.pct
    ? "Outside Gate"
    : "Inside Plant";

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Card header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div>
          <CardLabel>Waiting Analysis</CardLabel>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            Vehicles stuck &gt; 4 hrs · Threshold: 4h
          </div>
        </div>
        {/* bottleneck callout */}
        <div style={{
          background: "#fff7ed",
          border: "1px solid #fed7aa",
          borderRadius: 8,
          padding: "5px 12px",
          fontSize: 11,
          fontWeight: 700,
          color: "#c2410c",
        }}>
          ⚠ Bottleneck: {bottleneckStage}
        </div>
      </div>

      {/* ── Two-column layout: bars left, gauge right ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 20,
        alignItems: "start",
      }}>

        {/* Graph 1 — Bottleneck bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text, textTransform: "uppercase",
            letterSpacing: 0.5, marginBottom: 2 }}>
            Graph 1 — Operational Bottleneck
          </div>

          <BottleneckBar
            label={outsideWaiting.label}
            description={outsideWaiting.description}
            pct={outsideWaiting.pct}
            count={outsideWaiting.count}
            total={outsideWaiting.total}
            color={C.teal}
          />

          <BottleneckBar
            label={insideWaiting.label}
            description={insideWaiting.description}
            pct={insideWaiting.pct}
            count={insideWaiting.count}
            total={insideWaiting.total}
            color={C.teal}
          />

          {/* formula note */}
          <div style={{
            background: "#f1f5f9",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 10,
            color: C.muted,
            lineHeight: 1.7,
          }}>
            <span style={{ fontWeight: 700, color: C.text }}>Outside % </span>
            = waiting outside ÷ all arrived × 100
            <br />
            <span style={{ fontWeight: 700, color: C.text }}>Inside % </span>
            = waiting inside ÷ all checked-in × 100
          </div>
        </div>

        {/* Graph 2 — Congestion gauge */}
        <div style={{ minWidth: 220 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text, textTransform: "uppercase",
            letterSpacing: 0.5, marginBottom: 10, textAlign: "center" }}>
            Graph 2 — System Health
          </div>
          <CongestionGauge pct={congestion.pct} zone={congestion.zone} />
          <div style={{ fontSize: 10, color: C.muted, textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
            {congestion.totalWaiting} waiting
            <br />
            of {congestion.totalActiveTrips} active trips
          </div>
        </div>

      </div>
    </Card>
  );
}

function TripTypeDonut({ title, p2p, customerOrExternal, colorP2P = "#3b82f6", colorOther = "#f59e0b" }) {
  const total = p2p.count + customerOrExternal.count;
  const p2pPct   = total ? +((p2p.count / total) * 100).toFixed(1) : 0;
  const otherPct = total ? +((customerOrExternal.count / total) * 100).toFixed(1) : 0;

  const data = {
    datasets: [{
      data: [p2pPct, otherPct],
      backgroundColor: [colorP2P, colorOther],
      hoverBackgroundColor: [colorP2P + "cc", colorOther + "cc"],
      borderColor: "#ffffff",
      borderWidth: 3,
      hoverOffset: 6,
    }],
  };

  const options = {
    cutout: "70%",
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    animation: { animateRotate: true, duration: 900 },
  };

  const centerTextPlugin = {
    id: `centerText-${title}`,
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const cx = (chartArea.left + chartArea.right) / 2;
      const cy = (chartArea.top  + chartArea.bottom) / 2;
      ctx.save();
      ctx.font = "800 16px DM Sans, sans-serif";
      ctx.fillStyle = "#111827";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(total.toLocaleString(), cx, cy - 8);
      ctx.font = "600 8px DM Sans, sans-serif";
      ctx.fillStyle = "#9ca3af";
      ctx.fillText("Total", cx, cy + 8);
      ctx.restore();
    },
  };

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 14,
      padding: "14px 16px 12px",
      flex: 1,
      boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Title */}
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
        textTransform: "uppercase", color: "#9ca3af", marginBottom: 10,
      }}>
        {title}
      </div>

      {/* Donut */}
      <div style={{ height: 140, width: "100%", position: "relative" }}>
        <Doughnut data={data} options={options} plugins={[centerTextPlugin]} />
      </div>

      {/* Legend */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: 12,
        paddingTop: 10,
        borderTop: "1px solid #f3f4f6",
        gap: 8,
      }}>
        {/* P2P — count first, pct in bracket */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
          <div style={{
            width: 8, height: 8, borderRadius: 2,
            background: colorP2P, flexShrink: 0, marginTop: 3,
          }} />
          <div>
            <div style={{ fontSize: 9, color: "#6b7280", fontWeight: 600 }}>P2P</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: colorP2P, lineHeight: 1.2 }}>
              {p2p.count.toLocaleString()}
            </div>
            <div style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600 }}>({p2pPct}%)</div>
          </div>
        </div>

        {/* Other — pct first, count below */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
          <div style={{
            width: 8, height: 8, borderRadius: 2,
            background: colorOther, flexShrink: 0, marginTop: 3,
          }} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: "#6b7280", fontWeight: 600 }}>
              {customerOrExternal.label ?? "Cust. Delivery"}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: colorOther, lineHeight: 1.2 }}>
              ({otherPct}%)
            </div>
            <div style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600 }}>
              {customerOrExternal.count.toLocaleString()} trips
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Parent card holding both donuts side by side ──────────────────────────────
function PGBreakdownCard({ delivery, pickup }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      padding: "16px 18px",
      boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.07em",
        textTransform: "uppercase", color: "#9ca3af", marginBottom: 14,
      }}>
        PG to PG vs Customer (Delivery vs Pickup)
      </div>

      <div style={{ display: "flex", marginTop: 40, alignItems: "center", gap: 5 }}>
        {/* Delivery donut — blue / amber */}
        <TripTypeDonut
          title="Delivery"
          p2p={delivery.p2p}
          customerOrExternal={{ ...delivery.customerDelivery, label: "Customer Delivery" }}
          colorP2P="#3b82f6"
          colorOther="#f59e0b"
        />

        {/* Pickup donut — violet / emerald */}
        <TripTypeDonut
          title="Pickup"
          p2p={pickup.p2p}
          customerOrExternal={{ ...pickup.external, label: "External" }}
          colorP2P="#8b5cf6"
          colorOther="#10b981"
        />
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// Stat mini-cell (used in left panel grid)
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Delta badge (green up / red down)
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loader
// ─────────────────────────────────────────────────────────────────────────────
function Skeleton({ w = "100%", h = 16, r = 6, style = {} }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
      ...style,
    }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card wrapper
// ─────────────────────────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      padding: "18px 20px",
      boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardLabel({ children }) {
  return (
    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
      {children}
    </div>
  );
}

function BigNumber({ children, style = {} }) {
  return (
    <div style={{ fontSize: 32, fontWeight: 800, color: C.text, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.1, ...style }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function VehiclePerformanceDashboard({ vehicleId: propVehicleId }) {
  const [period,    setPeriod]    = useState("week");
  const [vehicleType, setVehicleType] = useState("all"); // "all" | "internal" | "external"



  const fetchTopVehicle = () => api.get("/analytics/vehicle-dashboard/top").then(r => r.data.vehicleId);
  const fetchDashboard = ({ vehicleId, period }) => api.get("/analytics/vehicle-dashboard", { params: { vehicleId, period } }).then(r => r.data);


  const { data: resolvedVehicleId, isError: isTopError } = useQuery({
    queryKey: ["topVehicle"],
    queryFn: fetchTopVehicle,
    enabled: !propVehicleId,           
    staleTime: 5 * 60 * 1000,       
  });

  const vehicleId = propVehicleId ?? resolvedVehicleId;

  const { data, isLoading: loading, isError: isDashError } = useQuery({
    queryKey: ["vehicleDashboard", vehicleId, period],
    queryFn: () => fetchDashboard({ vehicleId, period,}),
    enabled: !!vehicleId,       
    staleTime: 2 * 60 * 1000,
  });

    const visibleVehicles = data?.topVehicles?.[vehicleType] ?? { vehicles: [], maxTrips: 1 };


  const error = isTopError ? "Could not resolve top vehicle." : isDashError ? "Failed to load dashboard data.": null;


  if (loading) return (
    <div style={s.page}>
      <style>{keyframes}</style>
      <div style={s.topBar}>
        <Skeleton w={200} h={20} />
        <Skeleton w={160} h={32} r={8} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "20px 0 18px", fontFamily: "'DM Sans', sans-serif" }}>
        Overall Performance Dashboard
      </div>
      <div style={s.grid}>
        <Skeleton h={460} r={14} style={{ gridColumn: "span 1" }} />
        <div style={{ gridColumn: "span 3", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          {[...Array(6)].map((_, i) => <Skeleton key={i} h={210} r={14} />)}
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <div style={{ textAlign: "center", color: C.redDark, fontSize: 14 }}>{error}</div>
    </div>
  );

  if (!data) return null;

  const { vehicle, weeklyStats, stateOfHealth, driverBehavior, vehicleUsage, idleAnalysis, tripTypeSplit, topVehicles, availability } = data;

  // ── derive a fake-previous-period delta (±) for display ──────────────────
  // Since we don't have historical comparison, we show absolute metrics.
  const sohDelta = +(stateOfHealth.sohPct - 80).toFixed(1); // 80% baseline

  return (
    <div style={s.page}>
      <style>{keyframes}</style>

      {/* ── top breadcrumb bar ── */}
      <div style={s.topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.muted }}>
          <button style={s.backBtn} onClick={() => window.history.back()}>←</button>
          <span style={{ fontWeight: 600 }}>VEMS</span>
          <span style={{ color: C.slate }}>»</span>
          <span style={{ fontWeight: 700, color: C.text }}>{vehicle.vehicleNumber}</span>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Period</span>
          <div style={{ display: "flex", gap: 2, background: "#DFF1F1", borderRadius: 8, padding: 3 }}>
            {PERIODS.map(p => (
              <button key={p.key}
                style={{ ...s.periodBtn, ...(period === p.key ? s.periodBtnActive : {}) }}
                onClick={() => setPeriod(p.key)}>
                {p.label}
              </button>
            ))}
          </div>
          <button style={{...s.shareBtn, color: "#093C5D"}}>↑ Share</button>
          <button style={s.downloadBtn}>⬇ Download</button>
        </div>

      </div>

      {/* ── page title ── */}
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "18px 0 16px", fontFamily: "'DM Sans', sans-serif" }}>
        Overall Performance Dashboard
      </div>

      {/* ── main grid ── */}
      <div style={s.grid}>


        <div style={{ gridColumn: "span 3", display: "grid", gridTemplateColumns: "1fr 1fr 1fr",  gap: 14 }}>

          <Card style={{ gridColumn: "span 1", display: "flex", flexDirection: "column", gap: 14,  }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
            <span className="block" > Weekly Stats  </span> 
              <span className="text-yellow-500 mt-2" > High Performed Vehicle </span> 
            </div>

            {/* vehicle image placeholder + info */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{
                width: 72, height: 52, background: C.slateLight, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, flexShrink: 0,
              }}>
                {VEHICLE_ICONS[vehicle.typeOfVehicle] ?? "🚛"}
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{vehicle.vehicleNumber}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text, fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
                  {vehicle.model ?? vehicle.vehicleNumber}
                </div>
                <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>
                  {vehicle.typeOfVehicle ?? "Vehicle"} · {vehicle.type === "internal" ? "PG Vehicle" : "External"}
                </div>
                <div style={{ fontSize: 10, color: C.micro, marginTop: 2 }}>
                  Updated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
            </div>

            {/* 2-col stat grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <StatCell label="Active Since"     value={weeklyStats.activeSince} />
              <StatCell label="Total Trips"      value={weeklyStats.totalClosedTrips.toLocaleString("en-IN")} />
              <StatCell label="Period Trips"     value={weeklyStats.periodTrips} accent />
              <StatCell label="Completed"        value={weeklyStats.periodClosed} accent />
              <StatCell label="Avg / Day"        value={`${weeklyStats.avgTripsPerDay} trips`} />
              <StatCell label="Est. Trip Hours"  value={`${weeklyStats.totalTripHours}h`} />
            </div>

            {/* active status */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: vehicle.isActive ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${vehicle.isActive ? "#bbf7d0" : "#fecaca"}`,
              borderRadius: 8, padding: "8px 12px",
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: vehicle.isActive ? "#22c55e" : C.redDark, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: vehicle.isActive ? "#15803d" : C.redDark }}>
                {vehicle.isActive ? "Vehicle Active" : "Vehicle Inactive"}
              </span>
            </div>


          </Card>

          <div style={{ gridColumn: "span 2" }}>   {/* ← wrapping div */}
            <VehicleUsageCard
              vehicle={vehicle}
              weeklyStats={weeklyStats}
              vehicleUsage={vehicleUsage}
            />
          </div>

        </div>

        <div style={{ gridColumn: "span 3", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "auto auto", gap: 14 }}>

          <Card>
            <CardLabel>State Of Health</CardLabel>
            <BigNumber style={{ color: stateOfHealth.totalIssues > 0 ? C.redDark : C.teal }}>
              {stateOfHealth.totalIssues > 0
                ? `${stateOfHealth.totalIssues} Trip${stateOfHealth.totalIssues !== 1 ? "s" : ""} cancelled`
                : "All Clear"}
            </BigNumber>
            <div style={{ fontSize: 11, color: C.muted, margin: "2px 0 14px" }}>
              This period
              <Delta val={sohDelta} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Donut
                size={110} stroke={14}
                label={`${stateOfHealth.sohPct}%`}
                sublabel="SOH"
                segments={stateOfHealth.segments.map(s => ({ pct: s.pct, color: s.color }))}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stateOfHealth.segments.map(seg => (
                  <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{seg.label}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{seg.value} trips ({seg.pct}%)</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card  >
            <CardLabel>Trip Execution (P2P vs Non-PG) </CardLabel>
            <div style={{ display: "flex", height: 190, justifyContent: "center", alignItems: "center", }}>
              <TripExecutionDonut segments={driverBehavior.bars} />
            </div>
          </Card>

          <Card>
            <CardLabel>Trip Type Split</CardLabel>
            <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", marginTop: 12 }}>
              {tripTypeSplit.donuts.map(d => (
                <div key={d.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <Donut
                    size={72} stroke={10}
                    label={`${d.pct}%`}
                    segments={[
                      { pct: d.pct,       color: d.color },
                      { pct: 100 - d.pct, color: C.slateLight },
                    ]}
                  />
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: C.text }}>{d.label}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{d.value} trips</div>
                </div>
              ))}
            </div>
          </Card>

        </div>

          {/* ════ RIGHT 3-col grid ════ */}
        <div style={{ gridColumn:  "span 2", display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto auto", gap: 14 }}>

          <Card>
           <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
            <CardLabel>Top 10 Vehicles by Trips</CardLabel>
            <select
              value={vehicleType}
              onChange={e => setVehicleType(e.target.value)}
              style={{
                fontSize: 11, fontWeight: 600, color: C.text,
                background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: "3px 8px",
                cursor: "pointer", outline: "none",
              }}
            >
              <option value="all">All</option>
              <option value="internal">Internal</option>
              <option value="external">External</option>
            </select>
          </div>

          <div style={{ fontSize: 11, color: C.muted, margin: "2px 0 16px" }}>
            Ranked by completed segments · {period}
          </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {visibleVehicles.vehicles.map((v, i) => (
                <div key={v.vehicleId} style={{ display: "flex", alignItems: "center", gap: 10 }}>

                  {/* Rank */}
                  <span style={{
                    width: 18, fontSize: 10, fontWeight: 700,
                    color: i < 3 ? C.teal : C.muted, textAlign: "right", flexShrink: 0,
                  }}>
                    #{i + 1}
                  </span>

                  {/* Label */}
                  <span style={{
                    width: 80, fontSize: 12, fontWeight: 600,
                    color: C.text, flexShrink: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {v.vehicleNumber}
                  </span>

                  {/* Bar track */}
                  <div style={{
                    flex: 1, height: 8, background: C.border,
                    borderRadius: 99, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${v.pct}%`,
                      background: i === 0
                        ? C.teal
                        : i < 3
                        ? `${C.teal}99`
                        : "#94a3b8",
                      borderRadius: 99,
                      transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
                    }} />
                  </div>

                  {/* Count */}
                  <span style={{
                    width: 32, fontSize: 12, fontWeight: 700,
                    color: C.text, textAlign: "right", flexShrink: 0,
                  }}>
                    {v.tripCount}
                  </span>

                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardLabel>Daily Trip Completions</CardLabel>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, margin: "4px 0 16px" }}>
              <BigNumber style={{ color: C.teal }}>
                {idleAnalysis?.dailyTrend?.reduce((s, d) => s + d.count, 0)}
              </BigNumber>
              <span style={{ fontSize: 11, color: C.muted }}>
                total trips · {idleAnalysis?.activeDays} active days · {idleAnalysis?.idleDays} idle
              </span>
            </div>

            {/* ✅ Fixed height div wraps ONLY the Line, as its direct parent */}
            <div style={{ height: 160, position: "relative", width: "100%" }}>
              <Line
                key={period}
                data={{
                  labels: idleAnalysis.dailyTrend.map(d => {
                    const dt = new Date(d.date);
                    return `${dt.getDate()}/${dt.getMonth() + 1}`;
                  }),
                  datasets: [
                    {
                      label: "Trips",
                      data: idleAnalysis.dailyTrend.map(d => d.count),
                      borderColor: "#0d9488",
                      borderWidth: 2,
                      backgroundColor: (ctx) => {
                        const chart = ctx.chart;
                        const { ctx: canvas, chartArea } = chart;
                        if (!chartArea) return "transparent";
                        const grad = canvas.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        grad.addColorStop(0, "rgba(13,148,136,0.18)");
                        grad.addColorStop(1, "rgba(13,148,136,0)");
                        return grad;
                      },
                      fill: true,
                      tension: 0.4,
                      pointBackgroundColor: idleAnalysis.dailyTrend.map(d =>
                        d.count === 0 ? "#ef4444" : "#0d9488"
                      ),
                      pointBorderColor: idleAnalysis.dailyTrend.map(d =>
                        d.count === 0 ? "#fca5a5" : "#fff"
                      ),
                      pointRadius: idleAnalysis.dailyTrend.map(d => d.count === 0 ? 4 : 3),
                      pointHoverRadius: 6,
                      pointBorderWidth: 1.5,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false, // ✅ false so it respects parent height
                  animation: false,           // ✅ prevents resize flicker on re-render
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: "#1e293b",
                      titleColor: "#94a3b8",
                      bodyColor: "#f1f5f9",
                      borderColor: "#334155",
                      borderWidth: 1,
                      padding: 10,
                      cornerRadius: 8,
                      callbacks: {
                        title: (items) => {
                          const idx = items[0].dataIndex;
                          const dt = new Date(idleAnalysis.dailyTrend[idx].date);
                          return dt.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
                        },
                        label: (item) => `  ${item.raw} trip${item.raw !== 1 ? "s" : ""}`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      border: { display: false },
                      ticks: { color: "#94a3b8", font: { size: 10 } },
                    },
                    y: {
                      beginAtZero: true,
                      grid: { color: "#f1f5f9", lineWidth: 1 },
                      border: { display: false, dash: [3, 3] },
                      ticks: {
                        color: "#94a3b8",
                        font: { size: 10 },
                        stepSize: 1,
                        precision: 0,
                      },
                    },
                  },
                }}
              />
            </div>
            {/*  No style={{ height }} on the Line itself — parent div controls it */}

            <div style={{ display: "flex", gap: 16, marginTop: 10, justifyContent: "flex-end" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0d9488", display: "inline-block" }} />
                Trips completed
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                Idle day
              </span>
            </div>
          </Card>

         <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "1fr 1fr ", gridTemplateRows: "auto", gap: 14 }}>
          <WaitingAnalysisCard waitingAnalysis={data.waitingAnalysis} />
          <PGBreakdownCard
            delivery={{
              p2p:              { count: 20  }, 
              customerDelivery: { count: 94  }, 
            }}
            pickup={{
              p2p:      { count: 55 }, 
              external: { count: 30 }, 
            }}
          />
        </div>
      </div>




      </div>

      <Card 
      style={{ marginTop: 14 }}
      >
        <div style={{ gridColumn: "span 1", display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
            <DriverAnalyticsCard driverAnalytics={data.driverAnalytics} />
        </div>
      </Card>

    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = {
  page: {
    position: "relative",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    background: C.bg,
    minHeight: "100vh",
    padding: "5px 15px",
    // maxWidth: 1200,
    // margin: "0 auto",
    boxSizing: "border-box",
    borderRadius: 14,
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    width: "100%",
    gap: 10,
   
  },
  backBtn: {
    background: "#f1f5f9",
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    width: 30, height: 30,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, cursor: "pointer", color: C.text, fontWeight: 700,
  },
  periodBtn: {
    padding: "5px 11px",
    fontSize: 11,
    fontWeight: 600,
    border: "none",
    borderRadius: 6,
    background: "transparent",
    color: C.muted,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.15s",
  },
  periodBtnActive: {
    background: "#fff",
    color: C.text,
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
  },
  shareBtn: {
    padding: "7px 14px",
    fontSize: 12, fontWeight: 600,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    background: "#fff",
    color: C.text,
    cursor: "pointer",
  },
  downloadBtn: {
    padding: "7px 14px",
    fontSize: 12, fontWeight: 700,
    border: "none",
    borderRadius: 8,
    background: C.teal,
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(13,148,136,0.3)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "280px 1fr",
    gap: 14,
    alignItems: "start",
  },
};

const keyframes = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
`;