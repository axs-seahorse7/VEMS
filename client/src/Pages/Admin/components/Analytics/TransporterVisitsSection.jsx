// analytics/TransporterVisitsSection.jsx
// Section 5 — Supplier / Transporter → Customer Visit Analysis
// Dropdown to pick transporter, horizontal bar chart of customer visits

import { useState, useEffect, useRef } from "react";
import { fetchTransporterVisits } from "../../../../utils/Analytics-API/AnalyticsAPI.js";
import { useSize, Tooltip } from "./ChartPremetive.jsx";

// ── Horizontal bar chart for customer breakdown ───────────────────────────────
function HBarChart({ data = [], color = "#D946EF", height }) {
  const wrapRef = useRef(null);
  const { width } = useSize(wrapRef);
  const [tip, setTip] = useState(null);

  const pad = { top: 8, right: 80, bottom: 8, left: 8 };
  const maxV = Math.max(...data.map(d => d.visits), 1);
  const total = data.reduce((s, d) => s + d.visits, 0);
  const rowH = 34;
  const H = height ?? Math.max(200, data.length * rowH + pad.top + pad.bottom);
  const W = Math.max(width, 300);
  const iW = W - pad.left - pad.right;
  const labelW = Math.min(iW * 0.45, 200);

  return (
    <div ref={wrapRef} style={{ width: "100%", overflowX: "auto" }}>
      <svg width={W} height={H} style={{ display: "block" }}>
        {data.map((d, i) => {
          const y = pad.top + i * rowH;
          const barMaxW = iW - labelW - 8;
          const barW = Math.max(2, (d.visits / maxV) * barMaxW);
          const pct = total > 0 ? Math.round((d.visits / total) * 100) : 0;

          return (
            <g key={i}
              onMouseEnter={() => setTip({ x: pad.left + labelW + 8 + barW + 4, y: y + rowH / 2, lines: [d.customer || "Unknown", `${d.visits} visits`, `${pct}% of total`] })}
              onMouseLeave={() => setTip(null)}
              style={{ cursor: "pointer" }}>
              {/* Row hover bg */}
              <rect x={0} y={y} width={W} height={rowH - 3}
                fill={i % 2 === 0 ? "#fafafa" : "#fff"} rx={0} />
              {/* Customer label */}
              <text x={pad.left + 4} y={y + rowH / 2 + 4}
                fontSize={10.5} fill="#374151" fontWeight={500}
                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {(d.customer || "Unknown").length > 28
                  ? (d.customer || "Unknown").slice(0, 26) + "…"
                  : (d.customer || "Unknown")}
              </text>
              {/* Bar */}
              <rect x={pad.left + labelW + 8} y={y + 8} width={barW} height={rowH - 18}
                fill={color} rx={3} opacity={0.85} />
              {/* Count + pct label */}
              <text x={pad.left + labelW + 8 + barW + 6} y={y + rowH / 2 + 4}
                fontSize={10} fill="#374151" fontWeight={700}>
                {d.visits} ({pct}%)
              </text>
            </g>
          );
        })}
        {tip && <Tooltip {...tip} visible />}
      </svg>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
export default function TransporterVisitsSection({ params }) {
  const [allData,   setAllData]   = useState([]);
  const [selected,  setSelected]  = useState("");
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchTransporterVisits(params)
      .then(res => {
        const list = res.transporters ?? [];
        setAllData(list);
        if (list.length > 0) setSelected(list[0].name);
      })
      .catch(() => setError("Failed to load transporter data."))
      .finally(() => setLoading(false));
  }, [JSON.stringify(params)]);

  const active = allData.find(t => t.name === selected);

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Section header */}
      <div style={secHeader}>
        <span style={{ fontSize: 16 }}>🏪</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", fontFamily: "'Sora', sans-serif" }}>
          Supplier / Transporter → Customer Visit Analysis
        </span>
      </div>

      {/* Card */}
      <div style={card}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ height: 36, width: 280, background: "#f1f5f9", borderRadius: 8 }} />
            <div style={{ height: 300, background: "#f8fafc", borderRadius: 10, marginTop: 8 }} />
          </div>
        ) : error ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "#ef4444", fontSize: 13 }}>{error}</div>
        ) : allData.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            No supplier/transporter visit data for this period.<br />
            <span style={{ fontSize: 11, marginTop: 4, display: "block" }}>
              Data is derived from materials[].supplier field on closed trips.
            </span>
          </div>
        ) : (
          <>
            {/* Controls row */}
            <div style={controlRow}>
              <div style={selectWrap}>
                <label style={selectLabel}>Select Transporter / Supplier</label>
                <select
                  value={selected}
                  onChange={e => setSelected(e.target.value)}
                  style={selectEl}
                >
                  {allData.map(t => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>

              {active && (
                <div style={summaryPill}>
                  <span style={{ fontWeight: 700, color: "#6d28d9" }}>{active.name}</span>
                  <span style={divider}>·</span>
                  <span><b>{active.customerCount}</b> customers</span>
                  <span style={divider}>·</span>
                  <span><b>{active.totalVisits}</b> total visits</span>
                </div>
              )}
            </div>

            {/* Chart */}
            {active?.breakdown?.length > 0
              ? <HBarChart data={active.breakdown} color="#D946EF" />
              : <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  No customer breakdown available.
                </div>
            }
          </>
        )}
      </div>
    </div>
  );
}

const secHeader = {
  display: "flex", alignItems: "center", gap: 8,
  marginBottom: 14,
};

const card = {
  background: "#fff",
  border: "1px solid #e8edf3",
  borderRadius: 14,
  padding: "20px 22px",
  boxShadow: "0 1px 6px rgba(15,23,42,0.05)",
};

const controlRow = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  marginBottom: 20,
  flexWrap: "wrap",
};

const selectWrap = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const selectLabel = {
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  whiteSpace: "nowrap",
};

const selectEl = {
  padding: "8px 12px",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  color: "#0f172a",
  background: "#f9fafb",
  outline: "none",
  cursor: "pointer",
  minWidth: 200,
};

const summaryPill = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "#fdf4ff",
  border: "1px solid #e9d5ff",
  borderRadius: 20,
  padding: "6px 14px",
  fontSize: 12,
  color: "#374151",
};

const divider = {
  color: "#d1d5db",
  fontWeight: 400,
};