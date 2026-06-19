
import { useState, useEffect, useRef } from "react";
import { Doughnut } from "react-chartjs-2";

    
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

function TripExecutionDonut({ segments }) {
  const data = {
    labels: segments?.map((s) => s.label),
    datasets: [
      {
        data: segments?.map((s) => s.value),
        backgroundColor: segments?.map((s) => s.color),
        hoverBackgroundColor: segments?.map((s) => s.colorLight),
        borderColor: "#ffffff",
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    cutout: "65%",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          usePointStyle: true,
          pointStyle: "rectRounded",
          font: { size: 10, weight: "600" },
          color: "#6b7280",
          padding: 14,
          generateLabels: (chart) =>
            chart.data.labels?.map((label, i) => ({
              text: `${label}  ${chart.data.datasets[0].data[i]}%`,
              fillStyle: chart.data.datasets[0].backgroundColor[i],
              strokeStyle: "#fff",
              lineWidth: 0,
              hidden: false,
              index: i,
            })),
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%`,
        },
        backgroundColor: "#1f2937",
        titleColor: "#f9fafb",
        bodyColor: "#d1d5db",
        padding: 10,
        cornerRadius: 8,
      },
    },
  };

  // Center text plugin (inline, no registration needed as chartjs plugin)
  const centerTextPlugin = {
    id: "centerText",
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const cx = (chartArea.left + chartArea.right) / 2;
      const cy = (chartArea.top + chartArea.bottom) / 2;

      const active = chart.getActiveElements();
      const hasHover = active.length > 0;
      const idx = hasHover ? active[0].index : null;
      const seg = hasHover ? segments[idx] : null;

      ctx.save();

      // Big value
      ctx.font = "800 18px DM Sans, sans-serif";
      ctx.fillStyle = seg ? seg.color : "#111827";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        seg ? `${seg.value}%` : `${segments?.reduce((a, s) => a + s.value, 0).toFixed(1)}%`,
        cx,
        cy - 8
      );

      // Sub label
      ctx.font = "600 9px DM Sans, sans-serif";
      ctx.fillStyle = "#9ca3af";
      ctx.fillText(seg ? seg.label.split(" ").slice(-1)[0] : "Total", cx, cy + 10);

      ctx.restore();
    },
  };

  return (
    <div style={{ position: "relative", height: 160, width: "100%" }}>
      <Doughnut data={data} options={options} plugins={[centerTextPlugin]} />
    </div>
  );
}


export default TripExecutionDonut;