import React, { useState, useEffect } from "react";
import { Card, Tag, Badge, Divider, Tooltip, Typography, Space, Row, Col, Button } from "antd";
import {
  CarOutlined,
  WarningFilled,
  UserOutlined,
  RocketOutlined,
  SwapRightOutlined,
  ReloadOutlined,
  InboxOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { Truck } from "lucide-react";


const { Text } = Typography;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isPUCExpired(date) {
  if (!date) return false;
  return new Date(date) < new Date();
}

function fmtTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function hoursWaiting(createdAt) {
  if (!createdAt) return 0;
  return (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
}

const getWaitingTime = (arrivedAt) => {
  if (!arrivedAt) return "—";
  const arrivedTime = new Date(arrivedAt).getTime();
  if (isNaN(arrivedTime)) return "Invalid Date";
  const diff = Date.now() - arrivedTime;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 60) return `${minutes} min`;
  if (hours < 24) {
    const remainingMin = minutes % 60;
    return remainingMin ? `${hours}h ${remainingMin}m` : `${hours}h`;
  }
  const remainingHours = hours % 24;
  return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
};

const vehicleTypeLabel = {
  truck: "Truck", miniTruck: "Mini Truck", containerTruck: "Container Truck",
  mixerTruck: "Mixer Truck", waterTanker: "Water Tanker", trackter: "Tractor",
  car: "Car", bus: "Bus", ambulance: "Ambulance", autoRikshaw: "Auto Rickshaw",
  bike: "Motorcycle", other: "Other"
};

const STAGE_META = {
  waiting: { label: "Waiting",  color: "gold" },
  inside:  { label: "Inside",   color: "green" },
  enroute: { label: "Transit",  color: "blue" },
  closed:  { label: "Closed",   color: "default" },
  canceled:{ label: "Canceled", color: "red" },
  exited:  { label: "Exited",   color: "red" },
  unknown: { label: "Unknown",  color: "default" },
};

const  STAGES_REGISTRY = {
  //INTER-FACTORY MOVEMENT
  IN_TRANSIT:   "IN_TRANSIT",
  ARRIVED:      "ARRIVED",
  CHECKIN:      "CHECKIN",
  CANCEL:       "CANCEL",
  CLOSED:       "CLOSED",
  CANCELLED:    "CANCELLED",

  WAITING_CHECKIN:              "WAITING_CHECKIN",
  WAITING_UNLOAD:               "WAITING_UNLOAD",
  WAITING_LOAD:                 "WAITING_LOAD",

  VEHICLE_LOADED:               "VEHICLE_LOADED",
  VEHICLE_UNLOADED:             "VEHICLE_UNLOADED",

  ROUTE_CHANGED:                "ROUTE_CHANGED",
  SELECT_NEXT_LOCATION:         "SELECT_NEXT_LOCATION",

  READY_FOR_SITE_CONFIRMATION: "READY_FOR_SITE_CONFIRMATION",
  READY_FOR_DISPATCH_CHECKOUT: "READY_FOR_DISPATCH_CHECKOUT",
  READY_FOR_EXIT_CHECKOUT:     "READY_FOR_EXIT_CHECKOUT",

  COMPLETED:                    "COMPLETED",


  //INTRA FACTORY MOVEMENT
  READY_FOR_ARRIVAL:      "READY_FOR_ARRIVAL",
  READY_FOR_COMPLETE:      "READY_FOR_COMPLETE",
  READY_FOR_LOAD:         "READY_FOR_LOAD",
  READY_FOR_UNLOAD:       "READY_FOR_UNLOAD",
  READY_FOR_ROUTE_CHANGE: "READY_FOR_ROUTE_CHANGE",
  READY_FOR_DISPATCH:     "READY_FOR_DISPATCH",
  READY_FOR_CLOSE:        "READY_FOR_CLOSE",


};


// ─── InfoRow ──────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, T }) {
  return (
    <Row align="middle" style={{ minHeight: 26, padding: "1px 0", borderBottom: `1px solid ${T.divider}` }}>
      <Col flex="18px" style={{ display: "flex", alignItems: "center", color: T.iconColor }}>
        {icon}
      </Col>
      <Col flex="56px" style={{ paddingLeft: 6 }}>
        <Text style={{ fontSize: 11, color: T.textLabel, whiteSpace: "nowrap" }}>{label}</Text>
      </Col>
      <Col flex="auto" style={{ paddingLeft: 4, minWidth: 0, overflow: "hidden" }}>
        <Text
          ellipsis
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: T.textValue,
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </Text>
      </Col>
    </Row>
  );
}

// ─── OriginTracker ────────────────────────────────────────────────────────────
function OriginTracker({ vehicle, isOverdue }) {
  const phase = vehicle.phase;
  const isAtOrigin = phase === "ORIGIN";
  const isAtDestination = phase === "DESTINATION";
  const isAtInTransit = vehicle.status === "IN_TRANSIT";
  const isClosed = vehicle.tripState === "CLOSED" || vehicle.tripState === "CANCELLED";

  // Derive a numeric step: 0 = at origin, 1 = in transit, 2 = at destination
  // "completed" means we've passed that stage, "current" means we're there now
  const currentStep = isAtDestination ? 2 : isAtInTransit ? 1 : 0;

  // A stop is "done" (fully colored, no pulse) if we're past it
  // A stop is "current" (colored + pulse) if we're exactly on it
  // A stop is "pending" (gray) if we haven't reached it yet
  const getStopState = (stepIndex) => {
    if (currentStep > stepIndex) return "done";
    if (currentStep === stepIndex) return "current";
    return "pending";
  };

  const COLORS = {
    origin:  isOverdue ? "#93c5fd" : "#3b82f6",
    enroute: isOverdue ? "#d8b4fe" : "#a855f7",
    dest:    isOverdue ? "#6ee7b7" : "#10b981",
  };

  const pendingDotColor = isOverdue ? "rgba(255,255,255,0.25)" : "#d1d5db";
  const pendingLabelColor = isOverdue ? "rgba(255,255,255,0.4)" : "#9ca3af";

  const Stop = ({ stepIndex, color, label }) => {
    const state = getStopState(stepIndex);
    const isActive = state !== "pending";
    const isCurrent = state === "current";

    const truncate = (str, max = 18) => str.length > max ? str.slice(0, max - 1) + "…" : str;

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        <div style={{ position: "relative", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Pulse ring — only on current active stop */}
          {isCurrent && !isClosed  &&  (
            <span style={{
              position: "absolute",
              width: 20, height: 20,
              borderRadius: "50%",
              background: color,
              opacity: 0,
              animation: "trackerPing 1.5s ease-out infinite",
            }} />
          )}

          {isCurrent ? (
            // Current stop: bigger filled circle with vehicle icon centered inside
            <span style={{
              position: "relative",
              width: 18, height: 18,
              borderRadius: "50%",
              background: isCurrent? "transparent" : color,
              boxShadow: `0 0 0 2.5px ${color}44`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <CarOutlined style={{color: isCurrent ? color: "#fff", fontSize: 12}} />
            </span>
          ) : (
            <span style={{
              width: isActive ? 9 : 7,
              height: isActive ? 9 : 7,
              borderRadius: "50%",
              background: isActive ? color : pendingDotColor,
              boxShadow: isActive ? `0 0 0 2.5px ${color}44` : "none",
              display: "block",
              flexShrink: 0,
            }} />
          )}
        </div>
        <span style={{
          fontSize: 10,
          fontWeight: isActive ? 700 : 400,
          color: isActive ? color : pendingLabelColor,
          textAlign: "center",
          whiteSpace: "nowrap",
          maxWidth: 120, display: "block", marginTop: 4,
          overflow: "visible", textOverflow: "clip"
        }}>
          {truncate(label, 18)}
        </span>
      </div>
    );
  };  

  // Connector line — green if both endpoints are done/current, gray if not yet reached
  const lineColor = (fromStep, toStep) => {
    if (currentStep >= toStep) return isOverdue ? "rgba(255,255,255,0.6)" : "#10b981"; // fully completed
    if (currentStep >= fromStep) {
      // partially done — gradient
      const from = fromStep === 0 ? (isOverdue ? "#93c5fd" : "#3b82f6") : (isOverdue ? "#d8b4fe" : "#a855f7");
      const to = pendingDotColor;
      return `linear-gradient(to bottom, ${from}, ${to})`;
    }
    return pendingDotColor; // not reached at all
  };

  return (
    <>
      <style>{`
        @keyframes trackerPing {
          0%   { transform: scale(0.6); opacity: 0.75; }
          80%  { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
      <div style={{
        position: "absolute",
        top:"35%",
        right: 14,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 76,
      }}>
        <Stop
          stepIndex={0}
          color={COLORS.origin}
          label={vehicle.isIntraPlant? `${vehicle?.sourceSite?.name}/${vehicle?.sourceBlock?.name} - ${vehicle?.sourceFactory?.name}` : vehicle?.sourceFactory?.name || vehicle.externalSource || "Source"}
        />

        <div style={{
          width: 1.5, height: 28, margin: "4px 0",
          background: lineColor(0, 1),
          borderRadius: 2,
        }} />

        <Stop
          stepIndex={1}
          color={COLORS.enroute}
          label="Enroute"
        />

        <div style={{
          width: 1.5, height: 28, margin: "4px 0",
          background: lineColor(1, 2),
          borderRadius: 2,
        }} />

        <Stop
          stepIndex={2}
          color={COLORS.dest}
          label={ vehicle.isIntraPlant? `${vehicle?.destinationSite?.name}/${vehicle?.destinationBlock?.name} - ${vehicle?.destinationFactory?.name}` : vehicle?.destinationFactory?.name || vehicle.externalDestination || "Dest."}
        />
      </div>
    </>
  );
}

// ─── VehicleCard ──────────────────────────────────────────────────────────────
const VehicleCard = React.forwardRef(({ vehicle, onClick, setSelectedTrip }, ref) => {
  const vehicleData = vehicle.vehicle || {};
  const location = vehicle.location;
  const phase = vehicle.phase;
  const pucAlert = isPUCExpired(vehicleData?.PUCExpiry);
  const loadStatus = vehicle?.loadStatus || "pending";
  const user = (() => { try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; } })();
  const workflow = vehicle?.workflow || {};
  const isClosed = vehicle.tripState === "CLOSED" || vehicle.tripState === "CANCELLED";
  const isIntraPlant = vehicle?.isIntraPlant || false;

  const STAGES = {
    [STAGES_REGISTRY.WAITING_CHECKIN]: "Waiting Check-in",
    [STAGES_REGISTRY.IN_TRANSIT]: "Waiting for Arrival",
    [STAGES_REGISTRY.ARRIVED]: "Waiting for Check-in",
    [STAGES_REGISTRY.WAITING_UNLOAD]: "Waiting for Unload",
    [STAGES_REGISTRY.WAITING_LOAD]: "Waiting for Load",
    [STAGES_REGISTRY.VEHICLE_UNLOADED]: "Vehicle Unloaded",
    [STAGES_REGISTRY.SELECT_NEXT_LOCATION]: "Select Next Location",
    [STAGES_REGISTRY.READY_FOR_SITE_CONFIRMATION]: "Ready for Site Confirmation",
    [STAGES_REGISTRY.READY_FOR_EXIT_CHECKOUT]: "Waiting for Exit",
    [STAGES_REGISTRY.READY_FOR_DISPATCH_CHECKOUT]: "Waiting for Dispatch",
    [STAGES_REGISTRY.READY_FOR_ARRIVAL]: "Waiting for Arrival",
    [STAGES_REGISTRY.READY_FOR_LOAD]: "Waiting for Load",
    [STAGES_REGISTRY.READY_FOR_UNLOAD]: "Waiting for Unload",
    [STAGES_REGISTRY.READY_FOR_ROUTE_CHANGE]: "Waiting for Route Change",
    [STAGES_REGISTRY.READY_FOR_DISPATCH]: "Waiting for Dispatch",
    [STAGES_REGISTRY.READY_FOR_CLOSE]: "Waiting for Close",
  };

  
  const getStages = (stage) => {
    return STAGES[stage] || null;
  };

  const ACTIONS = {
    atGate: "Action Required by Security",
    storeSite: "Action Required by Store",
    dispatchSite: "Action Required by Dispatch",
  };

  const getActionLabel = (actor) => {
    return ACTIONS[actor] || "Action Required Security";
  };

  // ── Overdue logic ────────────────────────────────────────────────────────
  const isWaitingOutside =
    location === "outside_factory" &&
    vehicle.tripState !== "CLOSED" &&
    vehicle.tripState !== "CANCELLED";

  const isWaitingInside =
    location === "inside_factory" &&
    vehicle.type === "external_delivery" &&
    vehicle.tripState !== "CLOSED" &&
    vehicle.tripState !== "CANCELLED";

  const outsideWaitingHours = hoursWaiting(vehicle?.arrivedAt);
  const insideWaitingHours = hoursWaiting(vehicle?.checkedInAt);
  const waitingHours = isWaitingOutside ? outsideWaitingHours : isWaitingInside ? insideWaitingHours : 0;

  // 3-tier urgency: warn=4h+  alert=12h+  critical=24h+
  const urgency = (() => {
    if (!isWaitingOutside && !isWaitingInside) return 'none';
    if (waitingHours >= 24) return 'critical';
    if (waitingHours >= 12) return 'alert';
    if (waitingHours >= 4)  return 'warn';
    return 'none';
  })();

  const isOverdue = urgency !== 'none';

  // ── Shake ────────────────────────────────────────────────────────────────
  const [shaking, setShaking] = useState(false);
  useEffect(() => {
    if (!isOverdue) return;
    const trigger = () => { setShaking(true); setTimeout(() => setShaking(false), 900); };
    trigger();
    const id = setInterval(trigger, 10_000);
    return () => clearInterval(id);
  }, [isOverdue]);

  // ── Stage key ────────────────────────────────────────────────────────────
  const stageKey = (() => {
    if (location === "inside_factory" && vehicle.tripState !== "CLOSED" && vehicle.tripState !== "CANCELLED") return "inside";
    if (vehicle?.type === "internal_transfer" && location === "inside_factory" ) return "inside";
    if (location === "enroute") return "enroute";
    if (location === "outside_factory" && vehicle.tripState !== "CLOSED" && vehicle.tripState !== "CANCELLED") return "waiting";
    if (location === "outside_factory" && (vehicle.tripState === "CLOSED" || vehicle.tripState === "CANCELLED")) return "exited";
    return "unknown";
  })();

  const stageTag = STAGE_META[stageKey] || STAGE_META.unknown;

  const isRouteChanged = vehicle.status === "ROUTE_CHANGED";
  const isIncoming = user?.factory?._id === vehicle.destinationFactory?._id;

  const route = vehicle.type === "internal_transfer" ? (
    <Space size={3}>
      <span>{isIntraPlant ? `${vehicle.sourceSite?.name}/${vehicle.sourceBlock?.name}` || "Source" : vehicle.sourceFactory?.name || "Source"}</span>
      <ArrowRightOutlined style={{ fontSize: 9 }} />
      <span>{isIntraPlant ? `${vehicle.destinationSite?.name}/${vehicle.destinationBlock?.name}` || "Destination" : vehicle.destinationFactory?.name || "Unknown"}</span>
    </Space>
  ) : (
    <Space size={3} style={{ overflow: "hidden" }}>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: 60, display: "inline-block", whiteSpace: "nowrap" }}>
        {  vehicle.sourceFactory?.name || vehicle?.externalSource || "External" }
      </span>
      <ArrowRightOutlined style={{ fontSize: 9 }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: 60, display: "inline-block", whiteSpace: "nowrap" }}>
        { vehicle.destinationFactory?.name || vehicle?.externalDestination || "Unknown" }
      </span>
    </Space>
  );

  // ── Card styles ──────────────────────────────────────────────────────────
  const URGENCY_THEME = {
    none:     { bg: '#ffffff', border: '#e5e7eb', shadow: '0 1px 4px rgba(0,0,0,0.07)',       badgeBg: 'transparent',          badgePulse: 'transparent', textPrimary: '#111827', textSub: '#9ca3af', textLabel: '#6b7280', textValue: '#1e40af', divider: 'rgba(0,0,0,0.06)',        iconBox: '#f3f4f6',                iconColor: '#374151' },
    warn:     { bg: '#fffbeb', border: '#fcd34d', shadow: '0 2px 8px rgba(245,158,11,0.15)',  badgeBg: 'rgba(161,98,7,0.08)',   badgePulse: '#d97706',     textPrimary: '#78350f', textSub: '#92400e', textLabel: '#92400e', textValue: '#78350f', divider: 'rgba(217,119,6,0.2)',    iconBox: '#fef3c7',                iconColor: '#d97706' },
    alert:    { bg: '#fff7ed', border: '#fb923c', shadow: '0 2px 10px rgba(234,88,12,0.18)', badgeBg: 'rgba(154,52,18,0.10)',  badgePulse: '#ea580c',     textPrimary: '#7c2d12', textSub: '#9a3412', textLabel: '#9a3412', textValue: '#7c2d12', divider: 'rgba(234,88,12,0.2)',    iconBox: '#ffedd5',                iconColor: '#ea580c' },
    critical: { bg: '#c0392b', border: '#b91c1c', shadow: '0 2px 12px rgba(185,28,28,0.25)', badgeBg: 'rgba(127,29,29,0.7)',  badgePulse: '#fca5a5',     textPrimary: '#ffffff', textSub: '#fca5a5', textLabel: '#ffd6b8', textValue: '#ffffff', divider: 'rgba(255,255,255,0.18)', iconBox: 'rgba(255,255,255,0.15)', iconColor: '#ffffff' },
  };
  const T = URGENCY_THEME[urgency];

  const cardStyle = {
    borderRadius: 10,
    overflow: 'hidden',
    cursor: 'pointer',
    border: `1.5px solid ${T.border}`,
    boxShadow: T.shadow,
    background: T.bg,
    animation: shaking && isOverdue ? 'cardShake 0.9s ease-in-out' : undefined,
    transition: 'box-shadow 0.15s, transform 0.15s',
    position: 'relative',
  };

  const accentColor = urgency === 'critical' ? '#7f1d1d'
    : urgency === 'alert'    ? '#ea580c'
    : urgency === 'warn'     ? '#d97706'
    : stageKey === 'inside'  ? '#059669'
    : stageKey === 'enroute' ? '#2563eb'
    : stageKey === 'waiting' ? '#d97706'
    : '#94a3b8';

  const overdueWaitTime = getWaitingTime(
    location === "inside_factory" ? vehicle.checkedInAt : vehicle.arrivedAt
  );

  return (
    <>
      <style>{`
        @keyframes cardShake {
          0%   { transform: translateX(0) rotate(0deg); }
          10%  { transform: translateX(-4px) rotate(-0.6deg); }
          20%  { transform: translateX(4px) rotate(0.6deg); }
          30%  { transform: translateX(-3px) rotate(-0.4deg); }
          40%  { transform: translateX(3px) rotate(0.4deg); }
          50%  { transform: translateX(-2px) rotate(-0.2deg); }
          60%  { transform: translateX(2px) rotate(0.2deg); }
          70%  { transform: translateX(-1px) rotate(-0.1deg); }
          80%  { transform: translateX(1px) rotate(0.1deg); }
          100% { transform: translateX(0) rotate(0deg); }
        }
        @keyframes pulseDot {
          0%   { box-shadow: 0 0 0 0 rgba(255,255,255,0.7); }
          70%  { box-shadow: 0 0 0 5px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        
        
      
      `}</style>

      <div
        ref={ref}
        style={cardStyle}
        onClick={onClick}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = urgency === 'critical'
            ? '0 6px 20px rgba(185,28,28,0.40)'
            : urgency === 'alert'
            ? '0 6px 16px rgba(234,88,12,0.30)'
            : urgency === 'warn'
            ? '0 6px 14px rgba(245,158,11,0.25)'
            : '0 4px 16px rgba(0,0,0,0.12)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = T.shadow;
          e.currentTarget.style.transform = '';
        }}
      >
        {/* ── Accent top bar ── */}
        <div style={{ height: 3, background: accentColor, width: "100%" }} />

        {/* ── Overdue badge ── */}
        {isOverdue && (
          <div style={{
            position: "absolute",
            top: 3,
            right: 8,
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: T.badgeBg,
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            padding: "2px 7px",
            zIndex: 2,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', background: T.badgePulse, flexShrink: 0,
              animation: 'pulseDot 1.6s ease-out infinite',
            }} />
            <Text style={{ fontSize: 11, fontWeight: 700, color: T.textPrimary, letterSpacing: 0.3 }}>
              {overdueWaitTime}
            </Text>
            <Text style={{ fontSize: 10, color: T.textSub }}>
              {location === "inside_factory" ? "Delay inside" : "Waiting at Gate"}
            </Text>
          </div>
        )}

        <div style={{ padding: "10px 12px 10px", paddingTop: 10 }}>

          {/* ── Row 1: Vehicle info + Tracker ── */}
          {/* ── OriginTracker (absolute) ── */}
          <OriginTracker vehicle={vehicle} T={T} />

          {/* ── Row 1: icon + vehicle name ── */}
          <div style={{ display: "flex", gap: 8, marginBottom: 7, alignItems: "flex-start", paddingRight: 10, borderBottom: `1px solid ${T.divider}`, marginBottom: 7, paddingBottom: 7 }}>

            {/* Left: icon + name */}
            <div style={{ display: "flex", gap: 7,  minWidth: 0, alignItems: "flex-start", width: "100%",}}>
              <div style={{
                width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                background: T.iconBox,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: T.iconColor,
              }}>
                <CarOutlined style={{ fontSize: 15 }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%",  }}>
                <Space size={4} align="center">
                  <Text strong style={{ fontSize: 13, color: T.textPrimary, letterSpacing: 0.2, fontWeight: 700 }}>
                    {vehicleData?.vehicleNumber}
                  </Text>

                   {vehicleData?.typeOfVehicle && (
                    <Tag style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.3, margin: 0, padding: "1px 10px", background: T.iconBox, borderRadius: 30, color: T.textPrimary }}>
                      {vehicleTypeLabel[vehicleData.typeOfVehicle] || vehicleData.typeOfVehicle}
                    </Tag>
                  )}

                  {pucAlert && (
                    <Tooltip title="PUC Expired">
                      <WarningFilled style={{ fontSize: 13, color: urgency === 'critical' ? '#fca5a5' : '#dc2626' }} />
                    </Tooltip>
                  )}
                </Space>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, width: "100%", flexWrap: "wrap" }}>
                  <Text style={{ fontSize: 10, color: "#6b7280" }}>
                    {vehicleData?.transporterName}
                  </Text>
                  {vehicle?.isIntraPlant === true && <span style={{ fontSize: 10, color: "blue", marginLeft: 4, fontWeight: 600, border: `1px solid blue`, padding: "0 4px", borderRadius: 3 }}>
                    Intra-Plant
                  </span>}
                </div>

              </div>

             


            </div>
          </div>

          {/* ── Row 2: Tags ── */}
          <Space size={4} wrap style={{ marginBottom: 7 }}>
            

            <Tag
              color={vehicle.type === "external_delivery" ? "red" : "cyan"}
              style={{ fontSize: 9, fontWeight: 700, margin: 0, padding: "1px 5px" }}
            >
              {vehicle.type === "external_delivery" ? "External" : "Internal"}
            </Tag>

            <Tag color={stageTag.color} style={{ fontSize: 9, fontWeight: 700, margin: 0, padding: "1px 5px" }}>
              {stageTag.label}
            </Tag>

            {vehicle.tripState && (
              <Tag
                color={vehicle.tripState === "CANCELLED" ? "red" : vehicle.tripState === "CLOSED" ? "default" : "green"}
                style={{ fontSize: 9, fontWeight: 600, margin: 0, padding: "1px 5px" }}
              >
                {vehicle.tripState}
              </Tag>
            )}

            {isRouteChanged && (
              <Tag color="orange" style={{ fontSize: 9, fontWeight: 700, margin: 0, padding: "1px 5px" }}>
                Route Changed
              </Tag>
            )}

            <Tag
              color={isIncoming ? "green" : "blue"}
              style={{ fontSize: 9, fontWeight: 700, margin: 0, padding: "1px 5px" }}
            >
              {isIncoming ? "Incoming" : "Outgoing"}
            </Tag>


            <style>{`
              @keyframes stagePulseAmber {
                0%   { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.55); }
                70%  { box-shadow: 0 0 0 8px rgba(217, 119, 6, 0); }
                100% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0); }
              }
              .stage-tag-pulse {
                animation: stagePulseAmber 1.5s infinite;
              }

              @keyframes actionPulseBlue {
                0%   { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.55); }
                70%  { box-shadow: 0 0 0 8px rgba(37, 99, 235, 0); }
                100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
              }
              .action-tag-pulse {
                animation: actionPulseBlue 1.5s infinite;
              }
            `}</style>


        <div className="tags-container" style={{ display: "flex", justifyContent: "end", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
          {workflow.stage !== null && !isClosed  && (
            <span
              className="stage-tag-pulse"
              style={{
                fontSize: 9,
                fontWeight: 700,
                margin: 0,
                padding: "1px 6px",
                border: "1px solid #d97706",
                background: "#fffbeb",
                color: "#d97706",
                letterSpacing: 0.3,
                borderRadius: 4,
              }}
            >
              {getStages(workflow.stage) || workflow.stage}
            </span>
          )}
          
          {workflow?.actionRequiredBy?.actor?.length > 0 && !isClosed && (
            <span
              className="action-tag-pulse"
              style={{
                fontSize: 9,
                fontWeight: 700,
                margin: 0,
                marginLeft: 4,
                padding: "1px 6px",
                border: "1px solid #2563eb",
                background: "#eff6ff",
                color: "#2563eb",
                letterSpacing: 0.3,
                borderRadius: 4,
              }}
            >
              {vehicle?.material?.name === "RM" && workflow.actionRequiredBy.actor.includes("storeSite")
                ? getActionLabel("storeSite")
                : vehicle?.material?.name === "FG" && workflow.actionRequiredBy.actor.includes("dispatchSite")
                ? getActionLabel("dispatchSite")
                : getActionLabel(workflow.actionRequiredBy.actor)}
            </span>
          )}
        </div>

            
          </Space>

          <Divider style={{ margin: "5px 0", borderColor: T.divider }} />

          {/* ── Row 3: Info rows ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <InfoRow
              icon={<UserOutlined style={{ fontSize: 12 }} />}
              label="Driver"
              value={vehicle?.driver ? `${vehicle.driver.name} (${vehicle.driver.phone})` : "—"}
              T={T}
            />
            <InfoRow
              icon={<RocketOutlined style={{ fontSize: 12 }} />}
              label="Purpose"
              value={vehicle?.purpose === "Pickup" ? "Pickup" : "Delivery"}
              T={T}
            />
            <InfoRow
              icon={<SwapRightOutlined style={{ fontSize: 12 }} />}
              label="Route"
              value={route}
              T={T}
            />
            <InfoRow
              icon={<ReloadOutlined style={{ fontSize: 12 }} />}
              label="Load"
              value={loadStatus.charAt(0).toUpperCase() + loadStatus.slice(1)}
              T={T}
            />
            <InfoRow
              icon={<InboxOutlined style={{ fontSize: 12 }} />}
              label="Material"
              value={vehicle?.material?.name ?? vehicle?.material?.material ?? "Empty"}
              T={T}
            />
            <InfoRow
              icon={<SafetyOutlined style={{ fontSize: 12 }} />}
              label="Seal"
              value={vehicle?.material?.seal === "sealed" ? "Sealed" : "—"}
              T={T}
            />
            <InfoRow
              icon={<ClockCircleOutlined style={{ fontSize: 12 }} />}
              label="Started"
              value={fmtTime(vehicle?.createdAt)}
              T={T}
            />
          </div>
        </div>
      </div>
    </>
  );
});

export default VehicleCard;