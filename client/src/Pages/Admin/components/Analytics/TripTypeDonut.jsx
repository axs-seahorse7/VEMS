import { Doughnut } from "react-chartjs-2";

function TripTypeDonut({ title, p2p, customerOrExternal, colorP2P = "#3b82f6", colorOther = "#f59e0b" }) {
  const total = p2p.count + customerOrExternal.count;
  const p2pPct = total ? Math.round((p2p.count / total) * 100) : 0;
  const otherPct = total ? 100 - p2pPct : 0;

  const data = {
    datasets: [
      {
        data: [p2pPct, otherPct],
        backgroundColor: [colorP2P, colorOther],
        hoverBackgroundColor: [colorP2P, colorOther],
        borderColor: "#ffffff",
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    cutout: "72%",
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    animation: { animateRotate: true, duration: 700 },
  };

  const centerTextPlugin = {
    id: `centerText-${title}`,
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const cx = (chartArea.left + chartArea.right) / 2;
      const cy = (chartArea.top + chartArea.bottom) / 2;
      ctx.save();
      ctx.font = "800 20px 'DM Sans', sans-serif";
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(total.toLocaleString(), cx, cy - 9);
      ctx.font = "700 9px 'DM Sans', sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.letterSpacing = "0.06em";
      ctx.fillText("TOTAL", cx, cy + 11);
      ctx.restore();
    },
  };

  const rows = [
    { color: colorP2P, label: "PG to PG", count: p2p.count, pct: p2pPct },
    { color: colorOther, label: customerOrExternal.label ?? "Cust. Delivery", count: customerOrExternal.count, pct: otherPct },
  ];

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: "16px 18px 14px",
        flex: 1,
        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "#9ca3af",
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      {/* Donut */}
      <div style={{ height: 140, width: "100%", position: "relative" }}>
        <Doughnut data={data} options={options} plugins={[centerTextPlugin]} />
      </div>

      {/* Legend — both rows share one identical structure so they read as a set */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid #f3f4f6",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: row.color,
                flexShrink: 0,
              }}
            />

            <div
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: "#374151",
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.label}
            </div>

            <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", flexShrink: 0 }}>
              {row.count.toLocaleString()}
            </div>

            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: row.color,
                background: `${row.color}14`,
                borderRadius: 999,
                padding: "2px 7px",
                flexShrink: 0,
                minWidth: 34,
                textAlign: "center",
              }}
            >
              {row.pct}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TripTypeDonut;