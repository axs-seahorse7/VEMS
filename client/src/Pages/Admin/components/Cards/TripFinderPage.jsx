// TripFinderPage.jsx — paste a trip ID → full segment-by-segment history
// History is loaded from the TripSegment collection (GET /analytics/trip-finder/:tripId).
// Ant Design: Input only. Rest: custom CSS.

import { useState, useRef, useLayoutEffect } from "react";
import { Input } from "antd";
import api from "../../../../../services/API/Api/api"; // adjust path

// If the app has a fixed top navbar above this page, set this to its height (px)
// so the sticky header sits below it instead of underneath it.
const STICKY_TOP = 0;

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  teal:        "#0d9488",
  tealLight:   "#ccfbf1",
  tealMid:     "#5eead4",
  indigo:      "#6366f1",
  indigoLight: "#ede9fe",
  indigoMid:   "#a5b4fc",
  orange:      "#f97316",
  orangeLight: "#ffedd5",
  orangeMid:   "#fdba74",
  slateLight:  "#e2e8f0",
  red:         "#ef4444",
  redLight:    "#fee2e2",
  redMid:      "#fca5a5",
  yellow:      "#eab308",
  yellowLight: "#fef9c3",
  yellowMid:   "#fde047",
  bg:          "#f8fafc",
  card:        "#ffffff",
  border:      "#e5e7eb",
  text:        "#0f172a",
  muted:       "#64748b",
  micro:       "#94a3b8",
};

const ACCENT = C.indigo;

// ─── Config ───────────────────────────────────────────────────────────────────
const TRIP_STATE = {
  CLOSED:    { label: "Closed",      color: C.teal,   bg: C.tealLight,   border: C.tealMid   },
  CANCELLED: { label: "Cancelled",   color: C.red,    bg: C.redLight,    border: C.redMid    },
  ACTIVE:    { label: "Active",      color: C.yellow, bg: C.yellowLight, border: C.yellowMid },
  COMPLETED: { label: "In Progress", color: C.indigo, bg: C.indigoLight, border: C.indigoMid },
};

const SEG_STATUS = {
  ACTIVE:        { label: "In progress",   color: C.yellow, bg: C.yellowLight, border: C.yellowMid  },
  COMPLETED:     { label: "Completed",     color: C.indigo, bg: C.indigoLight, border: C.indigoMid  },
  CLOSED:        { label: "Closed",        color: C.teal,   bg: C.tealLight,   border: C.tealMid    },
  CANCELLED:     { label: "Cancelled",     color: C.red,    bg: C.redLight,    border: C.redMid     },
  ROUTE_CHANGED: { label: "Route changed", color: C.orange, bg: C.orangeLight, border: C.orangeMid  },
};

const LOCATION_LABEL = {
  inside_factory:  "Inside Factory",
  outside_factory: "Outside Factory",
  enroute:         "Enroute",
};

const OBJECT_ID_IN_TEXT = /[a-f\d]{24}/i;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => d
  ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  : "—";

const fmtTime = (d) => d
  ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  : "";

const fmtDateTime = (d) => (d ? `${fmt(d)}, ${fmtTime(d)}` : "—");

const formatDuration = (start, end) => {
  if (!start || !end) return "—";
  const ms = new Date(end) - new Date(start);
  if (Number.isNaN(ms) || ms < 0) return "—";
  const min  = Math.floor(ms / 60000);
  const hrs  = Math.floor(min / 60);
  const days = Math.floor(hrs / 24);
  if (min < 1)  return "<1m";
  if (min < 60) return `${min}m`;
  if (hrs < 24) return min % 60 ? `${hrs}h ${min % 60}m` : `${hrs}h`;
  return hrs % 24 ? `${days}d ${hrs % 24}h` : `${days}d`;
};

// Internal factory has priority. The external name is used only when the
// segment has no factory for that end.
const placeName = (factory, external) =>
  factory?.name ||
  (typeof external === "string" && external.trim() ? external.trim() : "—");

// A segment that is not the last one was ended by a route change, whatever
// status the backend stored on it (it may be "CLOSED" or "ROUTE_CHANGED").
const effectiveSegStatus = (seg, isLast) =>
  !isLast && seg.status !== "CANCELLED" ? "ROUTE_CHANGED" : seg.status;

// ─── Micro UI atoms ───────────────────────────────────────────────────────────
function Tag({ cfg, label }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 9px",
      borderRadius: 20, border: `1px solid ${cfg.border}`,
      background: cfg.bg, color: cfg.color, whiteSpace: "nowrap",
    }}>
      {label ?? cfg.label}
    </span>
  );
}

function Field({ label, value, mono, min = 110 }) {
  return (
    <div style={{ minWidth: min }}>
      <div style={{ fontSize: 9, color: C.micro, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{
        fontSize: 12, fontWeight: 600, color: C.text,
        fontFamily: mono ? "'DM Mono', monospace" : undefined,
      }}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 0 12px" }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT,
        textTransform: "uppercase", letterSpacing: 1 }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: "#e0e7ff" }} />
    </div>
  );
}

// ─── Trip summary (compact, sticks under the page header) ─────────────────────
function TripSummary({ trip, segments }) {
  const [copied, setCopied] = useState(false);
  const first = segments[0];
  const vehicle = trip?.vehicle ?? first?.vehicle;
  const driver  = trip?.driver  ?? first?.driver;
  const start   = trip?.createdAt ?? first?.startedAt ?? null;
  const end     = trip?.completedAt ?? null;
  const tripId  = trip?._id ?? first?.tripId ?? "";
  const stateCfg = TRIP_STATE[trip?.tripState];
  const routeChanges = Math.max(0, segments.length - 1);

  const copyId = async () => {
    try {
      await navigator.clipboard?.writeText(String(tripId));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.indigoMid}`,
      borderRadius: 12, boxShadow: "0 2px 10px rgba(99,102,241,0.10)",
      padding: "10px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: "linear-gradient(135deg,#6366f1,#4f46e5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 17,
        }}>
          <i className="ri-truck-fill"></i>
        </div>

        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text,
            fontFamily: "'DM Mono', monospace", lineHeight: 1.2 }}>
            {vehicle?.vehicleNumber ?? "Unknown vehicle"}
            {vehicle?.transporterName && (
              <span style={{ fontSize: 11, fontWeight: 600, color: C.muted,
                fontFamily: "'DM Sans', sans-serif", marginLeft: 8 }}>
                {vehicle.transporterName}
              </span>
            )}
          </div>
          <div style={{ fontSize: 10.5, color: C.micro, marginTop: 2,
            display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontFamily: "'DM Mono', monospace" }}>{String(tripId)}</span>
            <button onClick={copyId} style={{
              border: `1px solid ${C.border}`, background: "#fff", color: ACCENT,
              borderRadius: 5, fontSize: 9.5, fontWeight: 700, padding: "0 6px",
              cursor: "pointer", lineHeight: "16px",
            }}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {stateCfg && <Tag cfg={stateCfg} />}
          {trip?.type && (
            <Tag
              cfg={{ color: C.indigo, bg: "#fff", border: C.indigoMid }}
              label={trip.type === "internal_transfer" ? "Internal" : "External"}
            />
          )}
        </div>
      </div>

      <div style={{
        display: "flex", gap: 22, flexWrap: "wrap",
        marginTop: 9, paddingTop: 8, borderTop: `1px solid ${C.border}`,
      }}>
        <Field min={0} label="Location" value={LOCATION_LABEL[trip?.location] ?? trip?.location} />
        <Field min={0} label="Status"   value={trip?.status} />
        <Field min={0} label="Purpose"  value={trip?.purpose} />
        <Field min={0} label="Driver"
          value={driver?.driverName
            ? `${driver.driverName}${driver.driverContact ? ` · ${driver.driverContact}` : ""}`
            : "—"} />
        <Field min={0} label="Segments"      value={segments.length} />
        <Field min={0} label="Route changes" value={routeChanges} />
        <Field min={0} label="Total time"    value={formatDuration(start, end ?? new Date())} />
      </div>
    </div>
  );
}

// ─── Material block ───────────────────────────────────────────────────────────
function MaterialBlock({ material }) {
  if (!material) return null;
  const rows = [
    { label: "Type",       value: material.name },
    { label: "Material",   value: material.material },
    { label: "Quantity",   value: material.quantity != null
        ? `${material.quantity}${material.unit ? ` ${material.unit}` : ""}` : null },
    { label: "Invoice no", value: material.invoiceNo, mono: true },
    { label: "Amount",     value: material.invoiceAmount != null
        ? `₹ ${Number(material.invoiceAmount).toLocaleString("en-IN")}` : null },
    { label: "Customer",   value: material.customer || material.supplier },
    { label: "Seal",       value: material.seal },
  ].filter((r) => r.value !== null && r.value !== undefined && r.value !== "");

  if (!rows.length) return null;

  return (
    <div style={{
      marginTop: 12, background: "#f8fafc", border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "10px 12px",
    }}>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
        Material
      </div>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        {rows.map((r) => <Field key={r.label} label={r.label} value={r.value} mono={r.mono} />)}
      </div>
    </div>
  );
}

// ─── Segment card ─────────────────────────────────────────────────────────────
function SegmentCard({ seg, isLast, summaryVehicle, summaryDriver, scrollOffset = 0 }) {
  const from = placeName(seg.sourceFactory, seg.externalSource);
  const to   = placeName(seg.destinationFactory, seg.externalDestination);
  const statusKey = effectiveSegStatus(seg, isLast);
  const statusCfg = SEG_STATUS[statusKey] ?? SEG_STATUS.ACTIVE;
  const endedAt = seg.completedAt;
  const duration = formatDuration(seg.startedAt, endedAt ?? new Date());

  const vehicleDiffers = seg.vehicle?._id && summaryVehicle?._id
    && String(seg.vehicle._id) !== String(summaryVehicle._id);
  const driverDiffers = seg.driver?._id && summaryDriver?._id
    && String(seg.driver._id) !== String(summaryDriver._id);

  return (
    <div id={`seg-${seg._id}`} style={{ display: "flex", gap: 14, scrollMarginTop: scrollOffset }}>
      {/* rail */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 34 }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
          background: seg.isCurrent ? ACCENT : "#fff",
          color: seg.isCurrent ? "#fff" : ACCENT,
          border: `2px solid ${seg.isCurrent ? ACCENT : C.indigoMid}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800,
          boxShadow: seg.isCurrent ? "0 0 0 4px rgba(99,102,241,0.18)" : "none",
        }}>
          {seg.segmentNumber}
        </div>
        {!isLast && (
          <div style={{ flex: 1, width: 2, background: C.indigoMid, marginTop: 4, minHeight: 20 }} />
        )}
      </div>

      {/* card */}
      <div style={{
        flex: 1, minWidth: 0, marginBottom: isLast ? 0 : 16,
        background: C.card, border: `1px solid ${seg.isCurrent ? C.indigoMid : C.border}`,
        borderRadius: 12, padding: "14px 16px",
        boxShadow: seg.isCurrent ? "0 2px 12px rgba(99,102,241,0.12)" : "0 1px 6px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, flex: 1, minWidth: 180 }}>
            {from} <span style={{ color: ACCENT }}>→</span> {to}
          </div>
          {seg.isCurrent && (
            <Tag cfg={{ color: ACCENT, bg: C.indigoLight, border: C.indigoMid }} label="Current" />
          )}
          <Tag cfg={statusCfg} />
        </div>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 12 }}>
          <Field label="Started"   value={fmtDateTime(seg.startedAt)} />
          <Field label="Ended"     value={endedAt ? fmtDateTime(endedAt) : "Still open"} />
          <Field label={endedAt ? "Duration" : "Open for"} value={duration} />
          <Field label="Movement"  value={seg.triptype === "EXTERNAL" ? "External" : "Internal"} />
          <Field label="Purpose"   value={seg.purpose} />
          {vehicleDiffers && <Field label="Vehicle" value={seg.vehicle?.vehicleNumber} mono />}
          {driverDiffers  && <Field label="Driver"  value={seg.driver?.driverName} />}
        </div>

        <MaterialBlock material={seg.material} />

        {seg.routeChangeReason && (
          <div style={{
            marginTop: 12, background: C.orangeLight, border: `1px solid ${C.orangeMid}`,
            borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#9a3412",
          }}>
            <b>Route change reason:</b> {seg.routeChangeReason}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── History timeline (right panel) ───────────────────────────────────────────
const ACTION_CFG = {
  begin:               { label: "Begin",             color: C.indigo, icon: "ri-flag-line" },
  arrived:             { label: "Arrived",           color: C.yellow, icon: "ri-map-pin-line" },
  checkin:             { label: "Check-in",          color: C.teal,   icon: "ri-login-box-line" },
  intra_plant_checkin: { label: "Intra-plant check-in", color: C.teal, icon: "ri-login-box-line" },
  checkout:            { label: "Check-out",         color: C.indigo, icon: "ri-logout-box-line" },
  load:                { label: "Load",              color: C.indigo, icon: "ri-upload-2-line" },
  unload:              { label: "Unload",            color: C.indigo, icon: "ri-download-2-line" },
  complete:            { label: "Completed",         color: C.teal,   icon: "ri-checkbox-circle-line" },
  closed:              { label: "Closed",            color: C.teal,   icon: "ri-lock-line" },
  cancelled:           { label: "Cancelled",         color: C.red,    icon: "ri-close-circle-line" },
  route_change:        { label: "Route change",      color: C.orange, icon: "ri-route-line" },
  dispatched:          { label: "Dispatched",        color: C.indigo, icon: "ri-send-plane-line" },
};

const ACTOR_LABEL = { atGate: "Security", storeSite: "Store", dispatchSite: "Dispatch" };

const titleCase = (s) =>
  String(s ?? "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

function MiniRow({ label, children }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div style={{ display: "flex", gap: 6, fontSize: 11, lineHeight: 1.5 }}>
      <span style={{ color: C.micro, fontWeight: 700, minWidth: 56, flexShrink: 0 }}>{label}</span>
      <span style={{ color: C.text, fontWeight: 500, wordBreak: "break-word", minWidth: 0 }}>{children}</span>
    </div>
  );
}

function stateText(st) {
  if (!st) return null;
  const parts = [st.status, st.location && (LOCATION_LABEL[st.location] ?? st.location)].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

function TimelineEvent({ ev, isLast, segLabel, onPick }) {
  const cfg = ACTION_CFG[ev.action] ?? { label: titleCase(ev.action), color: C.muted, icon: "ri-record-circle-line" };
  const actorName = ACTOR_LABEL[ev.actor?.workLocation] ?? ev.actor?.workLocation;
  const metaEntries = ev.meta && typeof ev.meta === "object"
    ? Object.entries(ev.meta).filter(([, v]) => v !== null && v !== undefined && v !== "" && typeof v !== "object")
    : [];
  const before = stateText(ev.prevState);
  const after  = stateText(ev.state);
  const dev = ev.device;
  const devText = dev ? [dev.deviceType, dev.deviceOS, dev.appVersion && `v${dev.appVersion}`].filter(Boolean).join(" · ") : "";

  return (
    <div style={{ display: "flex", gap: 10 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 22 }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
          background: "#fff", border: `2px solid ${cfg.color}`, color: cfg.color,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
        }}>
          <i className={cfg.icon}></i>
        </div>
        {!isLast && <div style={{ flex: 1, width: 2, background: C.slateLight, margin: "3px 0" }} />}
      </div>

      <div
        onClick={() => onPick?.(ev)}
        style={{
          flex: 1, minWidth: 0, marginBottom: isLast ? 0 : 12, cursor: "pointer",
          background: "#fff", border: `1px solid ${C.border}`, borderLeft: `3px solid ${cfg.color}`,
          borderRadius: 8, padding: "8px 10px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: cfg.color }}>{cfg.label}</span>
          <span style={{ fontSize: 10.5, color: C.muted, fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>
            {fmtTime(ev.timestamp)}
          </span>
        </div>
        <div style={{ fontSize: 10, color: C.micro, marginBottom: 4 }}>
          {fmt(ev.timestamp)}{segLabel ? ` · ${segLabel}` : ""}
        </div>

        <MiniRow label="Factory">{ev.factory?.name}</MiniRow>
        <MiniRow label="By">
          {[ev.actor?.email, actorName && `(${actorName})`].filter(Boolean).join(" ")}
        </MiniRow>
        <MiniRow label="Site">{[ev.actor?.siteName, ev.actor?.blockName].filter(Boolean).join(" / ")}</MiniRow>
        <MiniRow label="Route">{ev.route ? `${ev.route.from ?? "—"} → ${ev.route.to ?? "—"}` : null}</MiniRow>
        <MiniRow label="State">
          {before && after && before !== after ? `${before} → ${after}` : after || before}
        </MiniRow>
        <MiniRow label="Reason">{ev.reason}</MiniRow>
        {metaEntries.map(([k, v]) => (
          <MiniRow key={k} label={titleCase(k)}>{String(v)}</MiniRow>
        ))}
        <MiniRow label="Device">{devText}</MiniRow>
      </div>
    </div>
  );
}

function HistoryTimeline({ history, onPick }) {
  if (!history.length) {
    return (
      <div style={{ fontSize: 12, color: C.muted, padding: "16px 4px", lineHeight: 1.6 }}>
        No history events recorded for this trip yet.
      </div>
    );
  }
  return (
    <div>
      {history.map((ev, i) => {
        const prev = history[i - 1];
        const newSeg = !prev || prev.segmentNumber !== ev.segmentNumber;
        const segLabel = ev.segmentNumber != null ? `Segment ${ev.segmentNumber}` : null;
        return (
          <div key={String(ev._id)}>
            {newSeg && segLabel && (
              <div style={{
                fontSize: 9.5, fontWeight: 800, color: ACCENT, letterSpacing: 0.8,
                textTransform: "uppercase", margin: i === 0 ? "0 0 8px" : "6px 0 8px 32px",
              }}>
                {segLabel}
              </div>
            )}
            <TimelineEvent ev={ev} isLast={i === history.length - 1} segLabel={segLabel} onPick={onPick} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Empty state / skeleton ───────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🧭</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>
        Find a trip
      </div>
      <div style={{ fontSize: 12, maxWidth: 320, margin: "0 auto", lineHeight: 1.7 }}>
        Paste a trip ID in the search box above to see every segment of that trip,
        from the first leg to the current one.
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 14, overflow: "hidden" }}>
      <div style={{ height: 60, background: `${ACCENT}18` }} />
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
        {[140, 260, 100, 200].map((w, j) => (
          <div key={j} style={{
            height: 13, width: w, borderRadius: 6,
            background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
            backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TripFinderPage() {
  const [query,   setQuery]   = useState("");
  const [data,    setData]    = useState(null); // { trip, segments }
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const inputRef = useRef(null);
  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(0);

  // the sticky header's height changes (summary card appears) → keep the side panel just below it
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => setHeaderH(el.offsetHeight);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const canSearch = !!query.trim() && !loading;

  const doSearch = async () => {
    // accept raw ids as well as pasted text like ObjectId("...") or with spaces
    const id = query.match(OBJECT_ID_IN_TEXT)?.[0];
    setError("");

    if (!id) {
      setData(null);
      setError("That doesn't look like a trip ID. A trip ID is 24 characters (letters a–f and digits).");
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/analytics/trip-finder/${id}`);
      console.log("TripFinderPage: got trip data", res.data);
      setData({
        trip: res.data.trip ?? null,
        segments: res.data.segments ?? [],
        history: res.data.history ?? [],
      });
    } catch (err) {
      setData(null);
      const status = err?.response?.status;
      setError(
        status === 404 ? "No trip found for this ID."
        : status === 400 ? "Invalid trip ID."
        : "Failed to load the trip. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery(""); setData(null); setError("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const trip = data?.trip ?? null;
  const segments = data?.segments ?? [];
  const history = data?.history ?? [];
  const stickyBottom = STICKY_TOP + headerH;

  const jumpToSegment = (ev) => {
    const el = document.getElementById(`seg-${ev.tripSegmentId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const summaryVehicle = trip?.vehicle ?? segments[0]?.vehicle ?? null;
  const summaryDriver  = trip?.driver  ?? segments[0]?.driver  ?? null;

  return (
    <div style={{
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: C.bg, minHeight: "100vh", boxSizing: "border-box",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Mono:wght@500&display=swap');
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .tf-search.ant-input-affix-wrapper {
          border-radius: 6px; border-color: ${C.border}; box-shadow: none; padding: 4px 10px;
        }
        .tf-search.ant-input-affix-wrapper:hover,
        .tf-search.ant-input-affix-wrapper-focused { border-color: ${ACCENT}; box-shadow: none; }
        .tf-body { display: flex; align-items: flex-start; gap: 20px; }
        .tf-main { flex: 1; min-width: 0; }
        .tf-side { flex: 0 0 28%; min-width: 290px; max-width: 420px; }
        @media (max-width: 1000px) {
          .tf-body { flex-direction: column; }
          .tf-side { flex: none; width: 100%; max-width: none; position: static !important; height: auto !important; }
        }
        .tf-search input { font-family: 'DM Mono', monospace !important; font-size: 12px; }
      `}</style>

      {/* ── Sticky stack: header (title + slogan + search) and trip summary ── */}
      <div ref={headerRef} style={{
        position: "sticky", top: STICKY_TOP, zIndex: 20,
        background: C.bg, padding: "14px 20px 12px",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>
              Trip Finder
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              Paste a trip ID to see its full history, segment by segment
            </div>
          </div>

          {/* Minimal search */}
          <div style={{ display: "flex", alignItems: "center", gap: 8,
            flex: "0 1 380px", minWidth: 240 }}>
            <Input
              ref={inputRef}
              className="tf-search"
              placeholder="Trip ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") doSearch(); }}
              allowClear
              onClear={clearSearch}
              prefix={<i className="ri-search-line" style={{ color: C.micro, fontSize: 13 }}></i>}
              style={{ flex: 1 }}
            />
            <button
              onClick={doSearch}
              disabled={!canSearch}
              style={{
                height: 30, padding: "0 14px", borderRadius: 6, border: "none",
                background: canSearch ? ACCENT : C.slateLight,
                color: canSearch ? "#fff" : C.muted,
                fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                cursor: canSearch ? "pointer" : "not-allowed",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {loading ? "Loading…" : "Find"}
            </button>
          </div>
        </div>

        {data && !loading && (
          <div style={{ marginTop: 10 }}>
            <TripSummary trip={trip} segments={segments} />
          </div>
        )}
      </div>

      {/* ── Scrolling content ── */}
      <div style={{ padding: "16px 20px 28px" }}>
        {error && (
          <div style={{ background: C.redLight, border: `1px solid ${C.redMid}`,
            borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#991b1b", marginBottom: 16 }}>
            {error}
          </div>
        )}

        {loading ? (
          <Skeleton />
        ) : !data ? (
          !error && <EmptyState />
        ) : (
          <div className="tf-body">
            <div className="tf-main">
            <SectionLabel>Segment history</SectionLabel>
            {segments.length === 0 ? (
              <div style={{ fontSize: 12, color: C.muted, padding: "12px 4px" }}>
                This trip has no segment records yet.
              </div>
            ) : (
              <div>
                {segments.map((seg, i) => (
                  <SegmentCard
                    key={String(seg._id)}
                    seg={seg}
                    isLast={i === segments.length - 1}
                    summaryVehicle={summaryVehicle}
                    summaryDriver={summaryDriver}
                    scrollOffset={stickyBottom + 12}
                  />
                ))}
              </div>
            )}

            {trip?.reason && (
              <div style={{ marginTop: 20, fontSize: 11, color: C.red, lineHeight: 1.6 }}>
                <i className="ri-information-line" style={{ marginRight: 6, fontSize: 16 }}></i>
                  <span>
                    <b>Cancellation reason:</b> {trip.reason}
                  </span>
                
              </div>
            )}
            </div>

            {/* ── Right: history timeline (sticky, scrolls on its own) ── */}
            <aside
              className="tf-side"
              style={{
                position: "sticky", top: stickyBottom + 12,
                height: `calc(100vh - ${stickyBottom + 24}px)`,
                display: "flex", flexDirection: "column",
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
              }}
            >
              <div style={{
                padding: "12px 14px 10px", borderBottom: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: C.text }}>Activity log</span>
                <span style={{ fontSize: 10.5, color: C.muted, fontWeight: 600 }}>
                  {history.length} event{history.length === 1 ? "" : "s"}
                </span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 18px", background: C.bg,
                borderRadius: "0 0 12px 12px" }}>
                <HistoryTimeline history={history} onPick={jumpToSegment} />
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}