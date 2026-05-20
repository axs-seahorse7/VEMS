// analytics/AvgTripsPerDaySection.jsx
// Section 2 — Avg Trips/Day PG Pareto + Non-PG Pareto + P2P vs Customer Delivery donut

import { useState, useEffect } from "react";
import { fetchAvgTripsPerDay } from "../../../../utils/Analytics-API/AnalyticsAPI.js";
import { ParetoChart, DonutChart, ChartCard, CardSkeleton, LegendItem, COLORS } from "./ChartPremetive.jsx";

export default function AvgTripsPerDaySection({ params }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchAvgTripsPerDay(params)
      .then(setData)
      .catch(() => setError("Failed to load avg trips data."))
      .finally(() => setLoading(false));
  }, [JSON.stringify(params)]);

  // Transform for ParetoChart: needs { vehicleNumber, count, cumPct }
  // For avg trips we map avg → count field so ParetoChart renders avg values
  const pgAvg    = (data?.pgAvgPareto    ?? []).map(r => ({ ...r, count: r.avg }));
  const nonPgAvg = (data?.nonPgAvgPareto ?? []).map(r => ({ ...r, count: r.avg }));

  const p2p = data?.p2pVsDelivery;

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Section header */}
      <div style={secHeader}>
        <span style={{ fontSize: 16 }}>⚡</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", fontFamily: "'Sora', sans-serif" }}>
          Avg Trips Per Day Performance
        </span>
      </div>

      <div style={chartGrid}>
        {/* PG Avg Pareto */}
        {loading ? <CardSkeleton height={280} /> : (
          <ChartCard
            title="PG Vehicles"
            badge="Avg Trips/Day Pareto"
            badgeColor="#dbeafe"
            badgeTextColor="#1d4ed8"
            legend={[
              <LegendItem key="cum" color={COLORS.cumLine} label="Cumulative %" shape="line" />,
              <LegendItem key="bar" color={COLORS.blue}   label="avg/day" />,
            ]}
          >
            {error
              ? <div style={errStyle}>{error}</div>
              : <ParetoChart data={pgAvg} barColor={COLORS.blue} label="avg/day" height={200} />
            }
          </ChartCard>
        )}

        {/* Non-PG Avg Pareto */}
        {loading ? <CardSkeleton height={280} /> : (
          <ChartCard
            title="Non-PG Hired"
            badge="Avg Trips/Day Pareto"
            badgeColor="#ffedd5"
            badgeTextColor="#c2410c"
            legend={[
              <LegendItem key="cum" color={COLORS.cumLine} label="Cumulative %" shape="line" />,
              <LegendItem key="bar" color={COLORS.orange}  label="avg/day" />,
            ]}
          >
            {error
              ? <div style={errStyle}>{error}</div>
              : <ParetoChart data={nonPgAvg} barColor={COLORS.orange} label="avg/day" height={200} />
            }
          </ChartCard>
        )}

        {/* P2P vs Customer Delivery donut */}
        {loading ? <CardSkeleton height={280} /> : (
          <ChartCard
            title="P2P vs Customer Delivery"
            badge="All Vehicles Total"
            badgeColor="#ede9fe"
            badgeTextColor="#6d28d9"
            legend={[
              <LegendItem key="p2p"  color={COLORS.blue}   label={`Plant-to-Plant (${p2p?.p2p ?? 0})`}       shape="circle" />,
              <LegendItem key="del"  color={COLORS.purple} label={`Customer Delivery (${p2p?.delivery ?? 0})`} shape="circle" />,
            ]}
          >
            {error || !p2p
              ? <div style={errStyle}>{error || "No data"}</div>
              : <>
                  <DonutChart size={170} segments={[
                    { label: "Plant-to-Plant",    value: p2p.p2p      || 0, color: COLORS.blue   },
                    { label: "Customer Delivery", value: p2p.delivery || 0, color: COLORS.purple },
                  ]} />
                  <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 4 }}>
                    {[
                      { color: COLORS.blue,   pct: p2p.p2pPct,      val: p2p.p2p,      label: "P2P" },
                      { color: COLORS.purple, pct: p2p.deliveryPct, val: p2p.delivery, label: "Delivery" },
                    ].map(item => (
                      <div key={item.label} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: item.color, fontFamily: "'Sora', sans-serif" }}>
                          {item.pct}%
                          <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", marginLeft: 4 }}>({item.val})</span>
                        </div>
                        <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                </>
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
  padding: "40px 0",
  textAlign: "center",
  color: "#ef4444",
  fontSize: 13,
};