import { useMemo } from "react";

const SAMPLE_DATES = [
  { trips: 8,   date: "2026-06-02" },
  { trips: 214, date: "2026-06-03" },
  { trips: 235, date: "2026-06-04" },
  { trips: 217, date: "2026-06-05" },
  { trips: 219, date: "2026-06-06" },
  { trips: 51,  date: "2026-06-07" },
  { trips: 175, date: "2026-06-08" },
];

const SAMPLE_VEHICLES = [
  { vehicleNumber: "RJ40GA8118", type: "internal",  tripCount: 24 },
  { vehicleNumber: "MH16DP1215", type: "internal",  tripCount: 22 },
  { vehicleNumber: "RJ40GA6718", type: "internal",  tripCount: 18 },
  { vehicleNumber: "HR47G0929",  type: "external",  tripCount: 16 },
  { vehicleNumber: "RJ40GA8115", type: "internal",  tripCount: 15 },
  { vehicleNumber: "MH16CD4225", type: "internal",  tripCount: 12 },
  { vehicleNumber: "RJ40GA7475", type: "external",  tripCount: 11 },
  { vehicleNumber: "MH16CD1894", type: "internal",  tripCount: 11 },
  { vehicleNumber: "MH16CD1898", type: "internal",  tripCount: 11 },
];

// ── Static color palette (6 tiers, Idle → Peak) ───────────────────────────────
// Thresholds are computed dynamically from actual data max so the full
// spectrum always shows regardless of whether max is 7 or 70.
const TIER_PALETTE = [
  { label: "Peak ≥83%",  bg: "#064E3B", text: "#ffffff" }, // tier 5  (≥ 83% of max)
  { label: "High ≥60%",  bg: "#0A7C6E", text: "#ffffff" }, // tier 4  (≥ 60%)
  { label: "Good ≥40%",  bg: "#59B292", text: "#065f46" }, // tier 3  (≥ 40%)
  { label: "Med ≥20%",   bg: "#FFB2B2", text: "#365314" }, // tier 2  (≥ 20%)
  { label: "Low - 1",   bg: "#FFB2B2", text: "#713f12" }, // tier 1  (≥  1 trip)
  { label: "Idle - 0",  bg: "#F5F2F2", text: "#9f1239" }, // tier 0  (= 0 trips)
];


function buildThresholds(max) {
  if (max <= 0) return [Infinity, Infinity, Infinity, Infinity, 1, 0];
  return [
    Math.max(1, Math.ceil(max * 0.83)),  // Peak
    Math.max(1, Math.ceil(max * 0.60)),  // High
    Math.max(1, Math.ceil(max * 0.40)),  // Good
    Math.max(1, Math.ceil(max * 0.20)),  // Med
    1,                                    // Low  (any ≥ 1 trip)
    0,                                    // Idle (= 0)
  ];
}

function getTier(value, thresholds) {
  if (value === null || value === undefined) return 5; // Idle
  for (let i = 0; i < thresholds.length; i++) {
    if (value >= thresholds[i]) return i;
  }
  return 5; // Idle fallback
}

function buildMatrix(vehicles, dates) {
  return vehicles.map((v) => {
    const total     = v.tripCount;
    const dateTotal = dates.reduce((s, d) => s + d.trips, 0);
    return dates.map((d) => {
      const raw = (total * d.trips) / dateTotal;
      return Math.max(0, Math.round(raw + (Math.random() - 0.5) * 1.5));
    });
  });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

// ── Component ─────────────────────────────────────────────────────────────────
function TripHeatmap({
  vehicles   = SAMPLE_VEHICLES,
  dates      = SAMPLE_DATES,
  matrix: matrixProp = null,
  title      = "Vehicle Trip Heatmap",
  subtitle   = "Trips per vehicle per day",
}) {
  const matrix = useMemo(
    () => matrixProp ?? buildMatrix(vehicles, dates),
    [vehicles, dates, matrixProp]
  );

  // Actual max across all cells (ignore 0)
  const globalMax = useMemo(
    () => Math.max(...matrix.flat().filter((v) => v > 0), 1),
    [matrix]
  );

  // Dynamic thresholds derived from real max
  const thresholds = useMemo(() => buildThresholds(globalMax), [globalMax]);

  // Legend labels show actual trip-count ranges derived from thresholds
  const legendItems = useMemo(() => {
    const [t5, t4, t3, t2] = thresholds; // Peak, High, Good, Med
    return [
      { label: `0 — Idle`,            ...TIER_PALETTE[5] },
      { label: `1–${t2 - 1} — Low`,   ...TIER_PALETTE[4] },
      { label: `${t2}–${t3 - 1}`,     ...TIER_PALETTE[3] },
      { label: `${t3}–${t4 - 1}`,     ...TIER_PALETTE[2] },
      { label: `${t4}–${t5 - 1}`,     ...TIER_PALETTE[1] },
      { label: `${t5}+ — Peak`,        ...TIER_PALETTE[0] },
    ];
  }, [thresholds]);

  const colTotals = useMemo(
    () => dates.map((_, di) => matrix.reduce((s, row) => s + (row[di] || 0), 0)),
    [matrix, dates]
  );

  const rowTotals = useMemo(
    () => matrix.map((row) => row.reduce((s, v) => s + (v || 0), 0)),
    [matrix]
  );

  const ROW_LABEL_W = 140;
  const TOTAL_COL_W = 52;
  const CELL_H      = 40;
  const COL_LABEL_H = 36;

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: "20px 24px",
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", letterSpacing: -0.2 }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{subtitle}</div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            borderCollapse: "separate",
            borderSpacing: 3,
            width: "100%",
            tableLayout: "fixed",
          }}
        >
          <colgroup>
            <col style={{ width: ROW_LABEL_W }} />
            {dates.map((_, i) => <col key={i} />)}
            <col style={{ width: TOTAL_COL_W }} />
          </colgroup>

          <thead>
            <tr>
              <th style={{ width: ROW_LABEL_W }} />
              {dates.map((d) => (
                <th
                  key={d.date}
                  style={{
                    height: COL_LABEL_H,
                    fontWeight: 500,
                    fontSize: 10,
                    color: "#64748b",
                    textAlign: "center",
                    verticalAlign: "bottom",
                    paddingBottom: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatDate(d.date)}
                </th>
              ))}
              <th style={{
                fontWeight: 600, fontSize: 10, color: "#94a3b8",
                textAlign: "center", paddingBottom: 6, paddingLeft: 6,
              }}>
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            {vehicles.map((v, ri) => (
              <tr key={v.vehicleNumber}>
                {/* Row label */}
                <td style={{ paddingRight: 10, textAlign: "right", whiteSpace: "nowrap" }}>
                  <span style={{
                    fontSize: 11, fontWeight: 500, color: "#334155",
                    fontFamily: "monospace", letterSpacing: 0.2,
                  }}>
                    {v.vehicleNumber}
                  </span>
                  <span style={{
                    marginLeft: 5, fontSize: 9, fontWeight: 600,
                    color: v.type === "internal" ? "#0891b2" : "#7c3aed",
                    background: v.type === "internal" ? "#e0f2fe" : "#ede9fe",
                    borderRadius: 3, padding: "1px 4px",
                    letterSpacing: 0.4, textTransform: "uppercase",
                  }}>
                    {v.type === "internal" ? "INT" : "EXT"}
                  </span>
                </td>

                {/* Data cells */}
                {matrix[ri].map((val, di) => {
                  const tierIdx = getTier(val, thresholds);
                  const { bg, text } = TIER_PALETTE[tierIdx];
                  return (
                    <td
                      key={di}
                      title={`${v.vehicleNumber} · ${dates[di].date} · ${val} trips`}
                      style={{
                        height: CELL_H,
                        background: bg,
                        borderRadius: 5,
                        textAlign: "center",
                        verticalAlign: "middle",
                        fontSize: 11,
                        fontWeight: 600,
                        color: text,
                        cursor: "default",
                        transition: "filter 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.88)")}
                      onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
                    >
                      {val > 0 ? val : ""}
                    </td>
                  );
                })}

                {/* Row total */}
                <td style={{
                  textAlign: "center", paddingLeft: 8,
                  fontSize: 11, fontWeight: 700, color: "#0f172a",
                }}>
                  {rowTotals[ri]}
                </td>
              </tr>
            ))}

            {/* Column totals row */}
            <tr>
              <td style={{
                paddingRight: 10, textAlign: "right",
                fontSize: 10, fontWeight: 700, color: "#94a3b8",
                paddingTop: 6, letterSpacing: 0.5, textTransform: "uppercase",
              }}>
                Daily Total
              </td>
              {colTotals.map((t, di) => (
                <td key={di} style={{
                  textAlign: "center", fontSize: 11,
                  fontWeight: 700, color: "#0f172a", paddingTop: 6,
                }}>
                  {t}
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Legend (dynamic labels from actual thresholds) ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        marginTop: 16, flexWrap: "wrap",
      }}>
        <span style={{
          fontSize: 10, color: "#94a3b8", fontWeight: 600,
          marginRight: 2, whiteSpace: "nowrap",
        }}>
          Trips/Day:
        </span>
        {legendItems.map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: item.bg,
              color: item.text,
              borderRadius: 5,
              padding: "3px 8px",
              fontSize: 10,
              fontWeight: 600,
              border: "1px solid rgba(0,0,0,0.06)",
              whiteSpace: "nowrap",
            }}
          >
            {item.label}
          </div>
        ))}
        <span style={{ fontSize: 10, color: "#cbd5e1", marginLeft: 4 }}>
          max {globalMax} trips/cell
        </span>
      </div>
    </div>
  );
}

export default TripHeatmap;