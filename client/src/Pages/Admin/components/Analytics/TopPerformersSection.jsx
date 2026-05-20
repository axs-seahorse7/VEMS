// analytics/TopPerformersSection.jsx
// Section 3 — Top 5 P2P | Top 5 Delivery | Daily Trip Trend line

import { useState, useEffect } from "react";
import { fetchTopPerformers } from "../../../../utils/Analytics-API/AnalyticsAPI.js";
import { BarChart, LineChart, ChartCard, CardSkeleton, COLORS } from "./ChartPremetive.jsx";

export default function TopPerformersSection({ params }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchTopPerformers(params)
      .then(setData)
      .catch(() => setError("Failed to load top performers."))
      .finally(() => setLoading(false));
  }, [JSON.stringify(params)]);

  // Normalise for BarChart: needs { label, count }
  const p2pBars      = (data?.top5P2P      ?? []).map(r => ({ label: r.vehicleNumber, count: r.count }));
  const deliveryBars = (data?.top5Delivery ?? []).map(r => ({ label: r.vehicleNumber, count: r.count }));

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Section header */}
      <div style={secHeader}>
        <span style={{ fontSize: 16 }}>🏆</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", fontFamily: "'Sora', sans-serif" }}>
          Top Performers
        </span>
      </div>

      <div style={chartGrid}>
        {/* Top 5 P2P */}
        {loading ? <CardSkeleton height={280} /> : (
          <ChartCard
            title="Top 5"
            badge="Plant-to-Plant Trips"
            badgeColor="#dbeafe"
            badgeTextColor="#1d4ed8"
          >
            {error
              ? <div style={errStyle}>{error}</div>
              : p2pBars.length === 0
                ? <div style={emptyStyle}>No data for this period</div>
                : <BarChart data={p2pBars} color={COLORS.blue} height={210} labelKey="label" valueKey="count" />
            }
          </ChartCard>
        )}

        {/* Top 5 Delivery */}
        {loading ? <CardSkeleton height={280} /> : (
          <ChartCard
            title="Top 5"
            badge="Customer Delivery Trips"
            badgeColor="#ede9fe"
            badgeTextColor="#6d28d9"
          >
            {error
              ? <div style={errStyle}>{error}</div>
              : deliveryBars.length === 0
                ? <div style={emptyStyle}>No data for this period</div>
                : <BarChart data={deliveryBars} color={COLORS.purple} height={210} labelKey="label" valueKey="count" />
            }
          </ChartCard>
        )}

        {/* Daily Trend */}
        {loading ? <CardSkeleton height={280} /> : (
          <ChartCard
            title="Daily Trend"
            badge="All Trips Per Day"
            badgeColor="#dcfce7"
            badgeTextColor="#15803d"
          >
            {error
              ? <div style={errStyle}>{error}</div>
              : (data?.dailyTrend ?? []).length === 0
                ? <div style={emptyStyle}>No data for this period</div>
                : <LineChart
                    data={data.dailyTrend}
                    color={COLORS.indigo}
                    height={210}
                    labelKey="date"
                    valueKey="count"
                  />
            }
          </ChartCard>
        )}
      </div>
    </div>
  );
}

const secHeader = {
  display: "flex", alignItems: "center", gap: 8,
  marginBottom: 14,
};

const chartGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 14,
};

const errStyle = {
  padding: "40px 0", textAlign: "center", color: "#ef4444", fontSize: 13,
};

const emptyStyle = {
  padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 13,
};