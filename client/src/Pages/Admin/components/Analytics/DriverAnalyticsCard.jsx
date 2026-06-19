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
              {filtered?.map((driver, idx) => {
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

export default DriverAnalyticsCard;