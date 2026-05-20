import { useState, useRef, useEffect } from "react";

// ── Colours ──────────────────────────────────────────────────────────────────
export const COLORS = {
  blue:    "#4F86F7",
  purple:  "#9B6DFF",
  orange:  "#FF9040",
  green:   "#34C97B",
  red:     "#FF5B6B",
  teal:    "#2EC4B6",
  yellow:  "#F7C94F",
  slate:   "#94A3B8",
  indigo:  "#6366F1",
  cumLine: "#EF4444",
};

// ── useSize: returns width/height of a ref'd element ─────────────────────────
export function useSize(ref) {
  const [size, setSize] = useState({ width: 300, height: 220 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return size;
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
export function Tooltip({ x, y, lines, visible }) {
  if (!visible || !lines?.length) return null;
  return (
    <g transform={`translate(${x},${y})`} style={{ pointerEvents: "none" }}>
      <rect x={-4} y={-14 * lines.length - 4} width={Math.max(...lines.map(l => l.length)) * 6.5 + 16}
        height={14 * lines.length + 10} rx={6} fill="#0f172a" opacity={0.88} />
      {lines.map((l, i) => (
        <text key={i} x={4} y={-14 * (lines.length - i - 1) - 4}
          fill="#fff" fontSize={10.5} fontFamily="'DM Mono', monospace">{l}</text>
      ))}
    </g>
  );
}

// ── ParetoChart (bar + cumulative line) ───────────────────────────────────────
export function ParetoChart({ data = [], barColor = COLORS.blue, label = "trips", height = 240 }) {
  const wrapRef = useRef(null);
  const { width } = useSize(wrapRef);
  const [tip, setTip] = useState(null);

  if (!data.length) return <div ref={wrapRef} style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 13 }}>No data</div>;

  const pad = { top: 28, right: 48, bottom: 60, left: 36 };
  const W = Math.max(width, 200);
  const H = height;
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const barW = Math.max(4, iW / data.length - 4);

  const xOf = (i) => pad.left + i * (iW / data.length) + (iW / data.length) / 2;
  const yCount = (v) => pad.top + iH - (v / maxCount) * iH;
  const yPct   = (p) => pad.top + iH - (p / 100) * iH;

  const pts = data.map((d, i) => `${xOf(i)},${yPct(d.cumPct)}`).join(" ");

  return (
    <div ref={wrapRef} style={{ width: "100%", height }}>
      <svg width={W} height={H} style={{ display: "block" }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(p => (
          <line key={p} x1={pad.left} x2={W - pad.right}
            y1={yPct(p)} y2={yPct(p)} stroke="#f1f5f9" strokeWidth={1} />
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const bh = (d.count / maxCount) * iH;
          const bx = xOf(i) - barW / 2;
          const by = pad.top + iH - bh;
          return (
            <g key={i}
              onMouseEnter={() => setTip({ x: xOf(i), y: by - 4, lines: [`${d.vehicleNumber}`, `${d.count} ${label}`, `Cum: ${d.cumPct}%`] })}
              onMouseLeave={() => setTip(null)}
              style={{ cursor: "pointer" }}>
              <rect x={bx} y={by} width={barW} height={bh}
                fill={barColor} rx={3} opacity={0.85} />
              {d.count > 0 && bh > 16 && (
                <text x={xOf(i)} y={by - 4} textAnchor="middle" fontSize={9} fill="#374151" fontWeight={700}>
                  {d.count}
                </text>
              )}
            </g>
          );
        })}

        {/* Cumulative line */}
        <polyline points={pts} fill="none" stroke={COLORS.cumLine} strokeWidth={2} strokeLinejoin="round" />
        {data.map((d, i) => (
          <circle key={i} cx={xOf(i)} cy={yPct(d.cumPct)} r={3.5}
            fill={COLORS.cumLine} stroke="#fff" strokeWidth={1.5} />
        ))}

        {/* X labels */}
        {data.map((d, i) => (
          <text key={i} x={xOf(i)} y={H - pad.bottom + 14}
            textAnchor="end" fontSize={9} fill="#6b7280"
            transform={`rotate(-40, ${xOf(i)}, ${H - pad.bottom + 14})`}>
            {d.vehicleNumber}
          </text>
        ))}

        {/* Left axis label */}
        <text x={pad.left - 4} y={pad.top} fontSize={9} fill="#94a3b8" textAnchor="middle">{label}</text>
        {/* Right axis label */}
        <text x={W - pad.right + 4} y={pad.top} fontSize={9} fill="#ef4444" textAnchor="start">%</text>

        {/* Right % axis ticks */}
        {[0, 50, 100].map(p => (
          <text key={p} x={W - pad.right + 4} y={yPct(p) + 3} fontSize={8} fill="#ef4444">{p}%</text>
        ))}

        {tip && <Tooltip {...tip} visible />}
      </svg>
    </div>
  );
}

// ── DonutChart ────────────────────────────────────────────────────────────────
export function DonutChart({ segments = [], size = 180 }) {
  const [hovered, setHovered] = useState(null);
  const cx = size / 2, cy = size / 2, r = size * 0.38, ri = size * 0.24;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  let angle = -Math.PI / 2;
  const paths = segments.map((seg, i) => {
    const sweep = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle + sweep), y2 = cy + r * Math.sin(angle + sweep);
    const xi1 = cx + ri * Math.cos(angle), yi1 = cy + ri * Math.sin(angle);
    const xi2 = cx + ri * Math.cos(angle + sweep), yi2 = cy + ri * Math.sin(angle + sweep);
    const large = sweep > Math.PI ? 1 : 0;
    const d = `M${x1},${y1} A${r},${r},0,${large},1,${x2},${y2} L${xi2},${yi2} A${ri},${ri},0,${large},0,${xi1},${yi1} Z`;
    const midAngle = angle + sweep / 2;
    const lx = cx + (r + ri) / 2 * Math.cos(midAngle);
    const ly = cy + (r + ri) / 2 * Math.sin(midAngle);
    angle += sweep;
    return { d, color: seg.color, pct: +((seg.value / total) * 100).toFixed(1), label: seg.label, lx, ly, value: seg.value };
  });

  const active = hovered !== null ? paths[hovered] : null;

  return (
    <svg width={size} height={size} style={{ display: "block", margin: "0 auto" }}>
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color}
          stroke="#fff" strokeWidth={2}
          opacity={hovered === null || hovered === i ? 1 : 0.55}
          style={{ cursor: "pointer", transition: "opacity 0.2s" }}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        />
      ))}
      {/* Center text */}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={active ? 15 : 13}
        fontWeight={800} fill="#0f172a" fontFamily="'Sora', sans-serif">
        {active ? `${active.pct}%` : `${total}`}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9.5} fill="#94a3b8">
        {active ? active.label : "total trips"}
      </text>
    </svg>
  );
}

// ── BarChart (simple vertical) ────────────────────────────────────────────────
export function BarChart({ data = [], color = COLORS.blue, height = 220, labelKey = "label", valueKey = "count" }) {
  const wrapRef = useRef(null);
  const { width } = useSize(wrapRef);
  const [tip, setTip] = useState(null);

  const pad = { top: 28, right: 12, bottom: 56, left: 36 };
  const W = Math.max(width, 160);
  const H = height;
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;
  const maxV = Math.max(...data.map(d => d[valueKey]), 1);
  const barW  = Math.max(10, iW / (data.length || 1) - 6);
  const xOf   = (i) => pad.left + i * (iW / data.length) + (iW / data.length) / 2;
  const yOf   = (v) => pad.top + iH - (v / maxV) * iH;

  return (
    <div ref={wrapRef} style={{ width: "100%", height }}>
      <svg width={W} height={H} style={{ display: "block" }}>
        {[0, 0.5, 1].map(f => (
          <line key={f} x1={pad.left} x2={W - pad.right}
            y1={pad.top + iH * (1 - f)} y2={pad.top + iH * (1 - f)}
            stroke="#f1f5f9" strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const bh = (d[valueKey] / maxV) * iH;
          const bx = xOf(i) - barW / 2;
          const by = yOf(d[valueKey]);
          return (
            <g key={i} style={{ cursor: "pointer" }}
              onMouseEnter={() => setTip({ x: xOf(i), y: by - 4, lines: [`${d[labelKey]}`, `${d[valueKey]}`] })}
              onMouseLeave={() => setTip(null)}>
              <rect x={bx} y={by} width={barW} height={bh} fill={color} rx={3} opacity={0.85} />
              <text x={xOf(i)} y={by - 5} textAnchor="middle" fontSize={9} fill="#374151" fontWeight={700}>{d[valueKey]}</text>
            </g>
          );
        })}
        {data.map((d, i) => (
          <text key={i} x={xOf(i)} y={H - pad.bottom + 14}
            textAnchor="end" fontSize={9} fill="#6b7280"
            transform={`rotate(-40, ${xOf(i)}, ${H - pad.bottom + 14})`}>
            {d[labelKey]}
          </text>
        ))}
        {tip && <Tooltip {...tip} visible />}
      </svg>
    </div>
  );
}

// ── LineChart (daily trend) ───────────────────────────────────────────────────
export function LineChart({ data = [], color = COLORS.indigo, height = 220, labelKey = "date", valueKey = "count" }) {
  const wrapRef = useRef(null);
  const { width } = useSize(wrapRef);
  const [tip, setTip] = useState(null);

  const pad = { top: 28, right: 16, bottom: 52, left: 40 };
  const W = Math.max(width, 200);
  const H = height;
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;
  const maxV = Math.max(...data.map(d => d[valueKey]), 1);
  const xOf  = (i) => pad.left + (i / Math.max(data.length - 1, 1)) * iW;
  const yOf  = (v) => pad.top + iH - (v / maxV) * iH;

  if (!data.length) return <div ref={wrapRef} style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 13 }}>No data</div>;

  const polyPts = data.map((d, i) => `${xOf(i)},${yOf(d[valueKey])}`).join(" ");
  const areaD = `M${xOf(0)},${yOf(data[0][valueKey])} ` +
    data.map((d, i) => `L${xOf(i)},${yOf(d[valueKey])}`).join(" ") +
    ` L${xOf(data.length - 1)},${pad.top + iH} L${xOf(0)},${pad.top + iH} Z`;

  const shortDate = (d) => {
    const parts = d?.split("-");
    if (!parts || parts.length < 3) return d;
    return `${parts[2]}-${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(parts[1])-1]}`;
  };

  return (
    <div ref={wrapRef} style={{ width: "100%", height }}>
      <svg width={W} height={H} style={{ display: "block" }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map(f => (
          <line key={f} x1={pad.left} x2={W - pad.right}
            y1={pad.top + iH * (1 - f)} y2={pad.top + iH * (1 - f)}
            stroke="#f1f5f9" strokeWidth={1} />
        ))}
        <path d={areaD} fill="url(#lineGrad)" />
        <polyline points={polyPts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={i} style={{ cursor: "pointer" }}
            onMouseEnter={() => setTip({ x: xOf(i), y: yOf(d[valueKey]) - 8, lines: [shortDate(d[labelKey]), `${d[valueKey]} trips`] })}
            onMouseLeave={() => setTip(null)}>
            <circle cx={xOf(i)} cy={yOf(d[valueKey])} r={4} fill={color} stroke="#fff" strokeWidth={2} />
            <text x={xOf(i)} y={yOf(d[valueKey]) - 8} textAnchor="middle" fontSize={9} fill="#374151" fontWeight={700}>
              {d[valueKey]}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          if (data.length > 15 && i % 3 !== 0) return null;
          return (
            <text key={i} x={xOf(i)} y={H - pad.bottom + 14} textAnchor="end" fontSize={9} fill="#6b7280"
              transform={`rotate(-40, ${xOf(i)}, ${H - pad.bottom + 14})`}>
              {shortDate(d[labelKey])}
            </text>
          );
        })}
        {tip && <Tooltip {...tip} visible />}
      </svg>
    </div>
  );
}

// ── ChartCard wrapper ─────────────────────────────────────────────────────────
export function ChartCard({ title, badge, badgeColor = "#dbeafe", badgeTextColor = "#1d4ed8", legend, children, style = {} }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e8edf3",
      borderRadius: 14,
      padding: "18px 20px",
      boxShadow: "0 1px 6px rgba(15,23,42,0.05)",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      ...style,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: "'Sora', sans-serif" }}>{title}</span>
          {badge && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: badgeColor, color: badgeTextColor, letterSpacing: 0.3, textTransform: "uppercase" }}>
              {badge}
            </span>
          )}
        </div>
        {legend && <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>{legend}</div>}
      </div>
      {children}
    </div>
  );
}

// ── Legend item ───────────────────────────────────────────────────────────────
export function LegendItem({ color, label, shape = "square" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280" }}>
      {shape === "line"
        ? <svg width={18} height={10}><line x1={0} y1={5} x2={18} y2={5} stroke={color} strokeWidth={2} /><circle cx={9} cy={5} r={2.5} fill={color} /></svg>
        : <div style={{ width: 10, height: 10, borderRadius: shape === "circle" ? "50%" : 2, background: color }} />
      }
      {label}
    </div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────────
export function CardSkeleton({ height = 220 }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8edf3", padding: "18px 20px", height }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ height: 14, width: "40%", background: "#f1f5f9", borderRadius: 6 }} />
        <div style={{ height: height - 60, background: "#f8fafc", borderRadius: 8, marginTop: 8 }} />
      </div>
    </div>
  );
}