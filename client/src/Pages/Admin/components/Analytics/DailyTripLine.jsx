import { Line } from "react-chartjs-2";
import { Card } from "antd";
import BigNumber from "../Cards/BigNumber.jsx";
import CardLabel from "../Cards/CardLabel.jsx";
import dayjs from "dayjs";


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


const topLabelsPlugin = {
  id: "topLabels",
  afterDatasetsDraw(chart) {
    const { ctx, data } = chart;
    data.datasets.forEach((dataset, i) => {
      chart.getDatasetMeta(i).data.forEach((point, index) => {
        const value = dataset.data[index];
        if (value == null) return;
        ctx.save();
        ctx.fillStyle = "#0f172a";
        ctx.font = "600 9px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(value, point.x, point.y - 6);
        ctx.restore();
      });
    });
  },
};

function DailyTripLine({ dailyTrend = [], activeDays = 0, idleDays = 0, period }) {
  const total = dailyTrend.reduce((s, d) => s + d.count, 0);

  return (
    <Card>
      <CardLabel>Daily Trip Completions</CardLabel>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, margin: "4px 0 16px" }}>
        <BigNumber style={{ color: C.teal }}>{total}</BigNumber>
        <span style={{ fontSize: 11, color: C.muted }}>
          total trips · {activeDays} active days · {idleDays} idle
        </span>
      </div>

      <div style={{ height: 160, position: "relative", width: "100%", marginTop: 10, }}>
        <Line
          key={period}
          plugins={[topLabelsPlugin]}
          data={{ 
            labels: dailyTrend.map(d => dayjs(d.date).format("DD MMMM")),
            datasets: [
              {
                label: "Trips",
                data: dailyTrend.map(d => d.count),
                borderColor: "#0d9488",
                borderWidth: 2,
                backgroundColor: (ctx) => {
                  const chart = ctx.chart;
                  const { ctx: canvas, chartArea } = chart;
                  if (!chartArea) return "transparent";
                  const grad = canvas.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                  grad.addColorStop(0, "rgba(13,148,136,0.18)");
                  grad.addColorStop(1, "rgba(13,148,136,0)");
                  return grad;
                },
                fill: true,
                tension: 0.4,
                pointBackgroundColor: dailyTrend.map(d => d.count === 0 ? "#ef4444" : "#0d9488"),
                pointBorderColor: dailyTrend.map(d => d.count === 0 ? "#fca5a5" : "#fff"),
                pointRadius: dailyTrend.map(d => d.count === 0 ? 4 : 3),
                pointHoverRadius: 6,
                pointBorderWidth: 1.5,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: "#1e293b",
                titleColor: "#94a3b8",
                bodyColor: "#f1f5f9",
                borderColor: "#334155",
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8,
                callbacks: {
                  title: (items) => {
                    const idx = items[0].dataIndex;
                    const dt = new Date(dailyTrend[idx]?.date);
                    return dt?.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
                  },
                  label: (item) => `  ${item.raw} trip${item.raw !== 1 ? "s" : ""}`,
                },
              },
            },
            scales: {
              x: {
                grid: { display: false },
                border: { display: false },
                ticks: { color: "#94a3b8", font: { size: 10 } },
              },
              y: {
                beginAtZero: true,
                grid: { color: "#f1f5f9", lineWidth: 1 },
                border: { display: false, dash: [3, 3] },
                ticks: { color: "#94a3b8", font: { size: 10 }, stepSize: 1, precision: 0 },
              },
            },
            layout: { padding: { top: 20, bottom: 0, left: 0, right: 0 } },
          }}
        />
      </div>

      
    </Card>
  );
}


export default DailyTripLine;