import { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";


const gradientPlugin = {
  id: "gradientFill",
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    chart.data.datasets.forEach((dataset) => {
      // read the base color stored on the dataset
      const baseColor = dataset._baseColor;
      if (!baseColor) return; // skip if no base color set

      const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      gradient.addColorStop(0, baseColor);
      gradient.addColorStop(1, baseColor + "88"); // 53% opacity at bottom
      dataset.backgroundColor = gradient;
    });
  },
};
 
const topLabelsPlugin = {
  id: "topLabels",
  afterDatasetsDraw(chart) {
    const { ctx, data } = chart;
    data.datasets.forEach((dataset, i) => {
      chart.getDatasetMeta(i).data.forEach((bar, index) => {
        const value = dataset.data[index];
        if (value == null) return;
        ctx.save();
        ctx.fillStyle = "#0f172a";
        ctx.font = "600 8px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(value, bar.x, bar.y - 4);
        ctx.restore();
      });
    });
  },
};

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
 


function BarChart({ labels, datasets, title, subtitle, legendPosition = "top", isLegendVisible = true }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
 
  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy();
 
    chartRef.current = new Chart(canvasRef.current.getContext("2d"), {
      type: "bar",
      data: {
        labels: labels?.slice() || [],
        datasets: datasets?.map((ds) => ({
          ...ds,
          backgroundColor: ds.backgroundColor || "transparent", 
          borderColor: "transparent",
          borderWidth: 0,
          borderRadius: 4,
          borderSkipped: false,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: isLegendVisible, position: legendPosition },
          tooltip: {
            backgroundColor: "#fff",
            borderColor: "#e2e8f0",
            borderWidth: 1,
            titleColor: "#0f172a",
            bodyColor: "#64748b",
            padding: 10,
            cornerRadius: 6,
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#000000",
              font: { size: 9, family: "Inter, sans-serif" },
              maxRotation: 50,
              autoSkip: false, 
              barPercentage: 0.5,
              categoryPercentage: 0.6,
            },
            grid: { display: false },
            border: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "#000000",
              font: { size: 9, family: "Inter, sans-serif" },
              padding: 8,
            },
            grid: { color: "#f1f5f9" },
            border: { display: false },
          },
        },
        animation: { duration: 500, easing: "easeOutQuart" },
        barPercentage: 0.5,
        categoryPercentage: 0.6,
      },
      plugins: [gradientPlugin, topLabelsPlugin],
    });
 
    return () => chartRef.current?.destroy();
  }, [labels, datasets]);
 
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "20px 24px 16px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {(title || subtitle) && (
        <div style={{ marginBottom: 16 }}>
          {title && <div style={{ color: "#0f172a", fontWeight: 700, fontSize: 13 }}>{title}</div>}
          {subtitle && <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 3 }}>{subtitle}</div>}
        </div>
      )}
      <div style={{ height: 200 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}


export default BarChart;