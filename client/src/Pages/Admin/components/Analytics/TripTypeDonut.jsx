import {Doughnut} from "react-chartjs-2";

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
        flexDirection: "column",
        justifyContent: "space-between",
        marginTop: 12,
        paddingTop: 10,
        borderTop: "1px solid #f3f4f6",
        gap: 8,
      }}>
        {/* P2P — count first, pct in bracket */}
        <div style={{ display: "flex",  gap: 5 }}>
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
        <div style={{ display: "flex",  gap: 5 }}>
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


export default TripTypeDonut;