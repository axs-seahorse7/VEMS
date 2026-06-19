import  { Card } from "antd";
import CardLabel from "../Cards/CardLabel.jsx";
import BigNumber from "../Cards/BigNumber.jsx";
import BottleneckBar from "./BottleneckBar.jsx";
import CongestionGauge from "./CongestionGauge.jsx";

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


export default WaitingAnalysisCard;