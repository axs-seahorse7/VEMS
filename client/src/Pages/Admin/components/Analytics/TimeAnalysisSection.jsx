// analytics/TimeAnalysisSection.jsx
// Section 4 — Monthly Trends | Idle Vehicles Per Day | Busiest Days

import { useState, useEffect } from "react";
import { fetchTimeAnalysis } from "../../../../utils/Analytics-API/AnalyticsAPI.js";
import { BarChart, ChartCard, CardSkeleton, COLORS } from "./ChartPremetive.jsx";

// ── Custom idle chart (two-tone: idle=red highlight, active=orange) ───────────
import { useRef } from "react";
import { useSize, Tooltip } from "./ChartPremetive.jsx";

function IdleBarChart({ data = [], height = 210 }) {
  const wrapRef = useRef(null);
  const { width } = useSize(wrapRef);
  const [tip, setTip] = useState(null);

  const pad = { top: 28, right: 12, bottom: 52, left: 36 };
  const W  = Math.max(width, 200);
  const H  = height;
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;
  const maxV = Math.max(...data.map(d => d.idleVehicles), 1);

  const barW = Math.max(8, iW / (data.length || 1) - 5);
  const xOf  = (i) => pad.left + i * (iW / data.length) + (iW / data.length) / 2;
  const yOf  = (v) => pad.top + iH - (v / maxV) * iH;

  const shortDate = (d) => {
    if (!d) return "";
    const parts = d.split("-");
    if (parts.length < 3) return d;
    return `${parts[2]}-${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(parts[1])-1]}`;
  };

  const maxIdle = Math.max(...data.map(d => d.idleVehicles));

  return (
    <div ref={wrapRef} style={{ width: "100%", height }}>
      <svg width={W} height={H} style={{ display: "block" }}>
        {[0, 0.5, 1].map(f => (
          <line key={f} x1={pad.left} x2={W - pad.right}
            y1={pad.top + iH * (1 - f)} y2={pad.top + iH * (1 - f)}
            stroke="#f1f5f9" strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const isMax = d.idleVehicles === maxIdle && maxIdle > 0;
          const bh = Math.max(2, (d.idleVehicles / maxV) * iH);
          const bx = xOf(i) - barW / 2;
          const by = yOf(d.idleVehicles);
          const fillColor = isMax ? "#EF4444" : "#FB923C";
          return (
            <g key={i} style={{ cursor: "pointer" }}
              onMouseEnter={() => setTip({ x: xOf(i), y: by - 6, lines: [shortDate(d.date), `${d.idleVehicles} idle`, `${d.activeVehicles} active`] })}
              onMouseLeave={() => setTip(null)}>
              <rect x={bx} y={by} width={barW} height={bh} fill={fillColor} rx={3} opacity={0.9} />
              <text x={xOf(i)} y={by - 5} textAnchor="middle" fontSize={9} fill={isMax ? "#ef4444" : "#374151"} fontWeight={700}>
                {d.idleVehicles}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => (
          <text key={i} x={xOf(i)} y={H - pad.bottom + 14}
            textAnchor="end" fontSize={9} fill="#6b7280"
            transform={`rotate(-40, ${xOf(i)}, ${H - pad.bottom + 14})`}>
            {shortDate(d.date)}
          </text>
        ))}
        {/* Y axis label */}
        <text x={pad.left - 4} y={pad.top} fontSize={9} fill="#94a3b8" textAnchor="middle">Vehicles</text>
        {tip && <Tooltip {...tip} visible />}
      </svg>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
export default function TimeAnalysisSection({ params }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchTimeAnalysis(params)
      .then(setData)
      .catch(() => setError("Failed to load time analysis."))
      .finally(() => setLoading(false));
  }, [JSON.stringify(params)]);

  // Monthly trends: label = "Apr-2026", count
  const monthly = (data?.monthlyTrends ?? []).map(r => ({
    label: (() => {
      const [y, m] = r.month.split("-");
      return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m)-1]}-${y.slice(2)}`;
    })(),
    count: r.count,
  }));

  // Busiest days sorted
  const busiest = (data?.busiestDays ?? [])
    .sort((a, b) => b.count - a.count)
    .map(r => ({ label: r.date?.slice(5) ?? r.date, count: r.count }));

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Section header */}
      <div style={secHeader}>
        <span style={{ fontSize: 16 }}>📅</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", fontFamily: "'Sora', sans-serif" }}>
          Time-Based Analysis
        </span>
      </div>

      <div style={chartGrid}>
        {/* Monthly trends */}
        {loading ? <CardSkeleton height={280} /> : (
          <ChartCard title="Monthly Trends" badge="All Historical Data" badgeColor="#dbeafe" badgeTextColor="#1d4ed8">
            {error
              ? <div style={errStyle}>{error}</div>
              : monthly.length === 0
                ? <div style={emptyStyle}>No data</div>
                : <BarChart data={monthly} color="#4F46E5" height={210} labelKey="label" valueKey="count" />
            }
          </ChartCard>
        )}

        {/* Idle vehicles per day */}
        {loading ? <CardSkeleton height={280} /> : (
          <ChartCard
            title="Idle Vehicles Per Day"
            badge="0-Trip Vehicles"
            badgeColor="#ffedd5"
            badgeTextColor="#c2410c"
            legend={[
              <div key="peak" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280" }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: "#EF4444" }} /> Peak idle
              </div>,
              <div key="norm" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280" }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: "#FB923C" }} /> Normal
              </div>,
            ]}
          >
            {error
              ? <div style={errStyle}>{error}</div>
              : (data?.idlePerDay ?? []).length === 0
                ? <div style={emptyStyle}>No data</div>
                : <IdleBarChart data={data.idlePerDay} height={210} />
            }
          </ChartCard>
        )}

        {/* Busiest days */}
        {loading ? <CardSkeleton height={280} /> : (
          <ChartCard
            title="Busiest Days"
            badge="Trips/Day Ranked Top 10"
            badgeColor="#dcfce7"
            badgeTextColor="#15803d"
          >
            {error
              ? <div style={errStyle}>{error}</div>
              : busiest.length === 0
                ? <div style={emptyStyle}>No data</div>
                : <BarChart data={busiest} color={COLORS.green} height={210} labelKey="label" valueKey="count" />
            }
          </ChartCard>
        )}
      </div>
    </div>
  );
}

const secHeader = {
  display: "flex", alignItems: "center", gap: 8,
  marginBottom: 14,
};

const chartGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 14,
};

const errStyle  = { padding: "40px 0", textAlign: "center", color: "#ef4444",  fontSize: 13 };
const emptyStyle= { padding: "40px 0", textAlign: "center", color: "#94a3b8",  fontSize: 13 };