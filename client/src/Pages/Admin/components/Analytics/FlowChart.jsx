import { useEffect, useRef, useState } from "react";
import {Card} from "antd";
import CardLabel from "../Cards/CardLabel.jsx";
import BigNumber from "../Cards/BigNumber.jsx";
import FactoryBarChart from "./FactoryBarChart.jsx";


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



function FlowChart({ title, modes = [], defaultMode, onModeChange, dropDown }) {
  const [mode, setMode] = useState(defaultMode ?? modes[0]?.value ?? "");

  const current = modes.find(m => m.value === mode) ?? modes[0];
  const chartData  = current?.data  ?? [];
  const chartColor = current?.color ?? C.blue;
  const totalShown = chartData.reduce((s, d) => s + d.count, 0);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (onModeChange) onModeChange(newMode);
  };

  useEffect(() => {
    setMode(defaultMode ?? modes[0]?.value ?? "");
  }, [defaultMode]);  

  if(modes.length > 0 && chartData.length === 0) {
    return (
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div>
            <CardLabel>{title}</CardLabel>
          </div>
        </div>
        <div style={{ textAlign: "center", padding: "32px 0", fontSize: 12, color: C.muted }}>
          No data for this period
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div>
          <CardLabel>{title}</CardLabel>
        </div>

        {/* Dropdown */}
       { dropDown && (
          <div style={{ position: "relative" }}>
            <select
              value={mode}
              onChange={e => handleModeChange(e.target.value)}
              style={{
              appearance:       "none",
              WebkitAppearance: "none",
              background:       "#fff",
              border:           `1.5px solid ${chartColor}`,
              borderRadius:     8,
              padding:          "6px 28px 6px 10px",
              fontSize:         12,
              fontWeight:       700,
              color:            chartColor,
              cursor:           "pointer",
              outline:          "none",
              fontFamily:       "'DM Sans', sans-serif",
              transition:       "border-color 0.2s, color 0.2s",
            }}
          >
            { Array.isArray(modes) && modes.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
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
        )}
      </div>

      {/* Big number */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <BigNumber style={{ color: chartColor }}>{totalShown}</BigNumber>
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>
          {current?.countLabel} trips
          {" · "}
          {chartData?.length} factor{chartData?.length !== 1 ? "ies" : "y"}
        </span>
      </div>

      {/* Bar chart */}
      <FactoryBarChart data={chartData} color={chartColor} />

      {/* Footer */}
      <div style={{ fontSize: 11, color: C.muted, marginTop: -16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
        {current?.footerLabel}
      </div>

    </Card>
  );
}

export default FlowChart;