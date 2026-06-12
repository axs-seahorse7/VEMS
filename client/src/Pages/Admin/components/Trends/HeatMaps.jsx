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

function buildMatrix(vehicles, dates) {
  return vehicles.map((v) => {
    const total = v.tripCount;
    const dateTotal = dates.reduce((s, d) => s + d.trips, 0);
    return dates.map((d) => {
      const raw = (total * d.trips) / dateTotal;
      return Math.round(raw + (Math.random() - 0.5) * 1.5);
    });
  });
}

function tripColor(value, max) {
  if (value <= 0) return "#f8fafc";
  const t = Math.min(value / max, 1);
  const r = Math.round(240 - t * (240 - 13));
  const g = Math.round(253 - t * (253 - 148));
  const b = Math.round(250 - t * (250 - 136));
  return `rgb(${r},${g},${b})`;
}

function textColor(value, max) {
  return value / max > 0.55 ? "#fff" : "#0f172a";
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function TripHeatmap({
  vehicles = SAMPLE_VEHICLES,
  dates = SAMPLE_DATES,
  matrix: matrixProp = null,
  title = "Vehicle Trip Heatmap",
  subtitle = "Trips per vehicle per day",
}) {
  const matrix = useMemo(
    () => matrixProp ?? buildMatrix(vehicles, dates),
    [vehicles, dates, matrixProp]
  );

  const globalMax = useMemo(
    () => Math.max(...matrix.flat().filter(Boolean), 1),
    [matrix]
  );

  const colTotals = useMemo(
    () => dates.map((_, di) => matrix.reduce((s, row) => s + (row[di] || 0), 0)),
    [matrix, dates]
  );

  const rowTotals = useMemo(
    () => matrix.map((row) => row.reduce((s, v) => s + (v || 0), 0)),
    [matrix]
  );

  // fixed widths for label and total columns; date cols share the rest equally
  const ROW_LABEL_W = 140;
  const TOTAL_COL_W = 52;
  const CELL_H = 40;
  const COL_LABEL_H = 36;

  const cellStyle = (val) => ({
    height: CELL_H,
    background: tripColor(val, globalMax),
    borderRadius: 5,
    textAlign: "center",
    verticalAlign: "middle",
    fontSize: 11,
    fontWeight: 600,
    color: textColor(val, globalMax),
    cursor: "default",
    transition: "filter 0.15s",
  });

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: "20px 24px",
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
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
            width: "100%",       // ← stretch to container
            tableLayout: "fixed", // ← columns share space equally
          }}
        >
          <colgroup>
            {/* fixed label col */}
            <col style={{ width: ROW_LABEL_W }} />
            {/* date cols: auto = share remaining width equally */}
            {dates.map((_, i) => <col key={i} />)}
            {/* fixed total col */}
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
              <th
                style={{
                  fontWeight: 600,
                  fontSize: 10,
                  color: "#94a3b8",
                  textAlign: "center",
                  paddingBottom: 6,
                  paddingLeft: 6,
                }}
              >
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            {vehicles.map((v, ri) => (
              <tr key={v.vehicleNumber}>
                <td style={{ paddingRight: 10, textAlign: "right", whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: "#334155", fontFamily: "monospace", letterSpacing: 0.2 }}>
                    {v.vehicleNumber}
                  </span>
                  <span
                    style={{
                      marginLeft: 5,
                      fontSize: 9,
                      fontWeight: 600,
                      color: v.type === "internal" ? "#0891b2" : "#7c3aed",
                      background: v.type === "internal" ? "#e0f2fe" : "#ede9fe",
                      borderRadius: 3,
                      padding: "1px 4px",
                      letterSpacing: 0.4,
                      textTransform: "uppercase",
                    }}
                  >
                    {v.type === "internal" ? "INT" : "EXT"}
                  </span>
                </td>

                {matrix[ri].map((val, di) => (
                  <td
                    key={di}
                    title={`${v.vehicleNumber} · ${dates[di].date} · ${val} trips`}
                    style={cellStyle(val)}
                    onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.88)")}
                    onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
                  >
                    {val > 0 ? val : ""}
                  </td>
                ))}

                <td style={{ textAlign: "center", paddingLeft: 8, fontSize: 11, fontWeight: 700, color: "#0f172a" }}>
                  {rowTotals[ri]}
                </td>
              </tr>
            ))}

            {/* Column totals row */}
            <tr>
              <td style={{ paddingRight: 10, textAlign: "right", fontSize: 10, fontWeight: 700, color: "#94a3b8", paddingTop: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>
                Daily Total
              </td>
              {colTotals.map((t, di) => (
                <td key={di} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#0f172a", paddingTop: 6 }}>
                  {t}
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 16 }}>
        <span style={{ fontSize: 10, color: "#94a3b8" }}>Low</span>
        {[0, 0.15, 0.3, 0.5, 0.7, 0.85, 1].map((t) => (
          <div key={t} style={{ width: 18, height: 18, borderRadius: 3, background: tripColor(t * globalMax, globalMax), border: "1px solid #e2e8f0" }} />
        ))}
        <span style={{ fontSize: 10, color: "#94a3b8" }}>High</span>
        <span style={{ fontSize: 10, color: "#cbd5e1", marginLeft: 8 }}>max {globalMax} trips/cell</span>
      </div>
    </div>
  );
}

export default TripHeatmap;