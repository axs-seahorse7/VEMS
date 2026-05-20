// analytics/FleetOverviewSection.jsx
// Section 1 — KPI Summary Strip + PG vs Non-PG donut + PG Pareto + Non-PG Pareto

import { useState, useEffect } from "react";
import { fetchFleetSummary, fetchFleetOverview } from "../../../../utils/Analytics-API/AnalyticsAPI.js";
import { ParetoChart, DonutChart, ChartCard, CardSkeleton, LegendItem, COLORS } from "./ChartPremetive.jsx";

// ── KPI strip ─────────────────────────────────────────────────────────────────
function KpiStrip({ summary, loading }) {
  const tiles = [
    { label: "ACTIVE VEHICLES",  value: summary?.activeVehicles  ?? "—", color: "#4F86F7" },
    { label: "TOTAL TRIPS",      value: summary?.totalTrips       ?? "—", color: "#9B6DFF" },
    { label: "AVG TRIPS / DAY",  value: summary?.avgTripsPerDay   ?? "—", color: "#34C97B" },
    { label: "TOP PERFORMER",    value: summary?.topPerformer     ?? "—", color: "#F7C94F", sub: summary?.topPerformerTrips ? `${summary.topPerformerTrips} trips` : "" },
  ];

  return (
    <div style={kpiStyles.strip}>
      {tiles.map((t, i) => (
        <div key={i} style={{ ...kpiStyles.tile, borderLeft: `4px solid ${t.color}` }}>
          {loading
            ? <div style={{ height: 30, width: "70%", background: "#e2e8f0", borderRadius: 6 }} />
            : <>
                <span style={{ ...kpiStyles.value, color: t.color }}>{t.value}</span>
                {t.sub && <span style={{ fontSize: 11, color: "#94a3b8", marginTop: -2 }}>{t.sub}</span>}
              </>
          }
          <span style={kpiStyles.label}>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

const kpiStyles = {
  strip: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
    marginBottom: 20,
  },
  tile: {
    background: "#fff",
    borderRadius: 12,
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    boxShadow: "0 1px 6px rgba(15,23,42,0.06)",
    border: "1px solid #e8edf3",
  },
  value: {
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: "-1px",
    fontFamily: "'Sora', sans-serif",
    lineHeight: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: 700,
    color: "#94a3b8",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginTop: 2,
  },
};

// ── Fleet Overview Section ─────────────────────────────────────────────────────
export default function FleetOverviewSection({ params }) {
  const [summary,  setSummary]  = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchFleetSummary(params), fetchFleetOverview(params)])
      .then(([s, o]) => { setSummary(s); setOverview(o); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [JSON.stringify(params)]);

  const ov = overview;

  return (
    <div>
      {/* ── KPI strip ── */}
      <KpiStrip summary={summary} loading={loading} />

      {/* ── Section header ── */}
      <div style={secHeader}>
        <span style={{ fontSize: 16 }}>🚛</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", fontFamily: "'Sora', sans-serif" }}>
          Fleet Overview
        </span>
      </div>

      {/* ── 3-column chart row ── */}
      <div style={chartGrid}>

        {/* Donut */}
        {loading
          ? <CardSkeleton height={280} />
          : (
            <ChartCard title="PG vs Non-PG" badge="Total Trips Split"
              legend={[
                <LegendItem key="pg"    color={COLORS.blue}   label={`PG Owned (${ov?.pgVsNonPg?.pgVehicles ?? 0})`} />,
                <LegendItem key="nonpg" color={COLORS.orange} label={`Non-PG Hired (${ov?.pgVsNonPg?.nPgVehicles ?? 0})`} />,
              ]}>
              <DonutChart size={170} segments={[
                { label: "PG Owned",    value: ov?.pgVsNonPg?.pgTrips  ?? 0, color: COLORS.blue },
                { label: "Non-PG Hired",value: ov?.pgVsNonPg?.nPgTrips ?? 0, color: COLORS.orange },
              ]} />
              <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 4 }}>
                {[
                  { color: COLORS.blue,   pct: ov?.pgVsNonPg?.pgPct,  label: "PG" },
                  { color: COLORS.orange, pct: ov?.pgVsNonPg?.nPgPct, label: "Non-PG" },
                ].map(item => (
                  <div key={item.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: item.color, fontFamily: "'Sora', sans-serif" }}>{item.pct}%</div>
                    <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </ChartCard>
          )
        }

        {/* PG Pareto */}
        {loading
          ? <CardSkeleton height={280} />
          : (
            <ChartCard title="PG Vehicles" badge="Total Trips Pareto" badgeColor="#dbeafe" badgeTextColor="#1d4ed8"
              legend={[
                <LegendItem key="cum" color={COLORS.cumLine} label="Cumulative %" shape="line" />,
                <LegendItem key="bar" color={COLORS.blue}   label="trips" />,
              ]}>
              <ParetoChart data={ov?.pgPareto ?? []} barColor={COLORS.blue} label="trips" height={200} />
            </ChartCard>
          )
        }

        {/* Non-PG Pareto */}
        {loading
          ? <CardSkeleton height={280} />
          : (
            <ChartCard title="Non-PG Hired" badge="Total Trips Pareto" badgeColor="#ffedd5" badgeTextColor="#c2410c"
              legend={[
                <LegendItem key="cum" color={COLORS.cumLine} label="Cumulative %" shape="line" />,
                <LegendItem key="bar" color={COLORS.orange}  label="trips" />,
              ]}>
              <ParetoChart data={ov?.nonPgPareto ?? []} barColor={COLORS.orange} label="trips" height={200} />
            </ChartCard>
          )
        }
      </div>
    </div>
  );
}

const secHeader = {
  display: "flex", alignItems: "center", gap: 8,
  marginBottom: 14, marginTop: 8,
};

const chartGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 14,
  marginBottom: 24,
};