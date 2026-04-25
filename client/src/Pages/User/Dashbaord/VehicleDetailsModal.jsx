import { useState } from "react";
import api from "../../../../services/API/Api/api";
import { message, Popconfirm  } from "antd";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isPUCExpired = (d) => new Date(d) < new Date();
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN") : "—";
const fmtTime = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
};

const getVehicleLocation = (vehicle) => {
  if (!vehicle?.state) return "unknown";
  return vehicle.state.status;
};

const getPhase = (vehicle, userFactoryId) => {
  if (!vehicle?.currentTrip || !userFactoryId) return null;
  const sourceId = vehicle.currentTrip.sourceFactoryId;
  const destId = vehicle.currentTrip.destinationFactoryId;
  if (String(sourceId) === String(userFactoryId)) return "ORIGIN";
  if (String(destId) === String(userFactoryId)) return "DESTINATION";
  return null;
};

const getWorkflowStage = (vehicle) => {
  const location = getVehicleLocation(vehicle);
  if (location === "waiting_outside" ) return "waiting";
  if (location === "inside_factory") return "inside";
  if (location === "in_transit") return "enroute";
  return "unknown";
};

// ─── Stage / Type Metadata ────────────────────────────────────────────────────
const STAGE_META = {
  waiting: { label: "Waiting",  bg: "#fef9c3", color: "#92400e" },
  inside:  { label: "Inside",   bg: "#dcfce7", color: "#15803d" },
  enroute: { label: "En Route", bg: "#dbeafe", color: "#1d4ed8" },
  unknown: { label: "Unknown",  bg: "#f3f4f6", color: "#6b7280" },
};

const vehicleTypeLabel = {
  truck: "Truck", miniTruck: "Mini Truck", containerTruck: "Container Truck",
  mixerTruck: "Mixer Truck", waterTanker: "Water Tanker", tractor: "Tractor",
  car: "Car", bus: "Bus", ambulance: "Ambulance",
};

// ─── Trip History action → colour + icon ─────────────────────────────────────
// Handles both action string directly OR action object {type:...}
const ACTION_META = {
  begin:    { color: "#6366f1", icon: "ri-flag-line",             label: "Begin"    },
  created:  { color: "#6366f1", icon: "ri-add-circle-line",       label: "Created"  },
  checkin:  { color: "#2563eb", icon: "ri-login-box-line",        label: "Check-in" },
  checkout: { color: "#7c3aed", icon: "ri-logout-box-r-line",     label: "Checkout" },
  arrive:   { color: "#0891b2", icon: "ri-map-pin-2-line",        label: "Arrived"  },
  load:     { color: "#16a34a", icon: "ri-stack-line",            label: "Loaded"   },
  unload:   { color: "#d97706", icon: "ri-stack-overflow-line",   label: "Unloaded" },
  cancel:   { color: "#dc2626", icon: "ri-close-circle-line",     label: "Cancelled"},
  complete: { color: "#059669", icon: "ri-checkbox-circle-line",  label: "Completed"},
};

function resolveAction(entry) {
  // action can be a string OR an object {type: "..."}
  const key = typeof entry.action === "string"
    ? entry.action
    : entry.action?.type;
  return ACTION_META[key] || { color: "#9ca3af", icon: "ri-radio-button-line", label: key || entry.status || "Event" };
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  alert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  x:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
};

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, children, title, width = 700 }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: width, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 80px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 12px", borderBottom: "1px solid #f0f0f0" }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111" }}>{title}</h2>
          <button onClick={onClose} style={{ border: "none", background: "#f3f4f6", cursor: "pointer", borderRadius: 7, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "#374151" }}>
            <span style={{ width: 14, height: 14 }}>{Icon.x}</span>
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: "16px 20px 20px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function Badge({ stage }) {
  const s = STAGE_META[stage] || STAGE_META.unknown;
  return <span style={{ background: s.bg, color: s.color, fontSize: 10.5, fontWeight: 700, borderRadius: 5, padding: "2px 7px", letterSpacing: .3, whiteSpace: "nowrap" }}>{s.label}</span>;
}
function TypeBadge({ type }) {
  return <span style={{ background: "#f3f4f6", color: "#374151", fontSize: 10.5, fontWeight: 600, borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap" }}>{vehicleTypeLabel[type] || type}</span>;
}

// ─── Horizontal Trip History Timeline ────────────────────────────────────────
function TripTimeline({ tripHistory }) {
  if (!Array.isArray(tripHistory) || tripHistory.length === 0) return null;

  return (
    <div style={{ marginTop: 14, borderTop: "1px solid #f0f0f0", paddingTop: 10 }}>
      {/* Section heading */}
      <div style={{ fontSize: 10, fontWeight: 800, color: "#6366f1", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>
        Trip History
      </div>

      {/* Scrollable horizontal track */}
      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "flex-start", minWidth: "max-content", gap: 0 }}>
          {tripHistory.map((entry, idx) => {
            const meta = resolveAction(entry);
            const isLast = idx === tripHistory.length - 1;
            const nextMeta = !isLast ? resolveAction(tripHistory[idx + 1]) : null;

            return (
              <div key={entry._id || idx} style={{ display: "flex", alignItems: "flex-start" }}>
                {/* Step column */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 78 }}>
                  {/* Dot */}
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: meta.color + "18", border: `2px solid ${meta.color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1 }}>
                    <i className={meta.icon} style={{ fontSize: 9.5, color: meta.color }} />
                  </div>
                  {/* Action label */}
                  <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, marginTop: 4, textAlign: "center", lineHeight: 1.2 }}>
                    {meta.label}
                  </span>
                  {/* Status */}
                  <span style={{ fontSize: 9, color: "black", marginTop: 2, textAlign: "center", lineHeight: 1.2, fontWeight: 500 }}>
                    {entry.status}
                  </span>
                  {/* Timestamp */}
                  <span style={{ fontSize: 9, color: "blue", marginTop: 2, textAlign: "center", lineHeight: 1.3, letterSpacing: .2, fontWeight: 500 }}>
                    {fmtTime(entry.timestamp)}
                  </span>
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div style={{ width: 24, height: 2, marginTop: 10, flexShrink: 0, background: `linear-gradient(90deg, ${meta.color}70, ${nextMeta.color}70)`, borderRadius: 2 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Workflow Actions ─────────────────────────────────────────────────────────
function WorkflowActions({ vehicle, onAction, userFactoryId, userRole }) {
  const [loading, setLoading] = useState(false);

  // Aliases for readability
  const { location, phase, tripState, purpose, loadStatus, type } = vehicle;
  const trip = vehicle;
  const sourceId = trip.sourceFactory?._id;
  const destId = trip.destinationFactory?._id;

  const isNotClosedOrCancelled = tripState !== "CLOSED" && tripState !== "CANCELLED";
  const isInsideFactory = location === "inside_factory";
  const isOutsideOrEnroute = location === "outside_factory" || location === "enroute";

  // ─── Action Runner ───────────────────────────────────────────────────────────
  const doAction = async (apiFn) => {
    setLoading(true);
    try {
      const result = await apiFn();
      message.success(result.data?.message || "Action successful");
      onAction();
    } catch (e) {
      message.error(e.response?.data?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  // ─── Shared Payloads ─────────────────────────────────────────────────────────
  const vehiclePayload = { vehicleNumber: vehicle.vehicle?.vehicleNumber };
  const withFactory = { ...vehiclePayload, factoryId: userFactoryId };
  const withSourceDest = {
    ...vehiclePayload,
    sourceFactoryId: userFactoryId,
    destinationFactoryId: destId,
    purpose: trip?.purpose || "pickup",
  };
  const withTripFactory = { ...vehiclePayload, tripId: trip?._id, factoryId: userFactoryId };

  // ─── Button Definitions ──────────────────────────────────────────────────────
  // Each entry: { label, confirmTitle, color, onConfirm, condition }
  const actions = [

    // 1. atGate | outside/enroute | DESTINATION → Allow Entry
    {
      condition:
        userRole === "atGate" &&
        isOutsideOrEnroute &&
        phase === "DESTINATION" &&
        isNotClosedOrCancelled,
      label: "✓ Allow Entry (Checkin)",
      confirmTitle: "Allow this vehicle to enter the factory?",
      color: "#10b981",
      onConfirm: () => doAction(() => api.post(`/trip/checkin/${trip._id}`, withFactory)),
    },

    // 2. atGate | outside/enroute | DESTINATION → Cancel Trip
    {
      condition:
        userRole === "atGate" &&
        isOutsideOrEnroute &&
        phase === "DESTINATION" &&
        isNotClosedOrCancelled,
      label: "✕ Cancel Trip",
      confirmTitle: "Are you sure you want to cancel this trip?",
      color: "#D75656",
      onConfirm: () => doAction(() => api.post(`/trip/cancel/${trip._id}`, withFactory)),
    },

    // 3. atGate | outside/enroute | ORIGIN | at destination factory → Mark Arrived
    {
      condition:
        userRole === "atGate" &&
        isOutsideOrEnroute &&
        phase === "ORIGIN" &&
        userFactoryId === destId &&
        isNotClosedOrCancelled,
      label: "✓ Mark Arrived",
      confirmTitle: "Mark this vehicle as arrived?",
      color: "#10b981",
      onConfirm: () => doAction(() => api.post(`/trip/arrive/${trip._id}`, withFactory)),
    },

    // 4. atGate | inside | ORIGIN | at source factory → Dispatch Vehicle
    {
      condition:
        userRole === "atGate" &&
        isInsideFactory &&
        phase === "ORIGIN" &&
        userFactoryId === sourceId &&
        isNotClosedOrCancelled,
      label: "→ Dispatch Vehicle (Checkout)",
      confirmTitle: "Dispatch this vehicle to its destination?",
      color: "#6366f1",
      onConfirm: () => doAction(() => api.post(`/trip/checkout/${trip._id}`, withSourceDest)),
    },

    // 5. atGate | inside | DESTINATION | not source factory | not ACTIVE → Checkout & Exit
    {
      condition:
        userRole === "atGate" &&
        isInsideFactory &&
        phase === "DESTINATION" &&
        userFactoryId !== sourceId &&
        tripState !== "CLOSED" &&
        tripState !== "ACTIVE" &&
        tripState !== "CANCELLED",
      label: "Checkout & Exit",
      confirmTitle: "Check this vehicle out and allow it to exit?",
      color: "#D75656",
      onConfirm: () => doAction(() => api.post(`/trip/exit-checkout/${trip._id}`, withSourceDest)),
    },

    // 6. storeSite/dispatchSite | inside | Delivery | not unloaded | external_delivery or internal_transfer | at dest → Mark Unloaded
    {
      condition:
        (userRole === "storeSite" || userRole === "dispatchSite") &&
        isInsideFactory &&
        purpose === "Delivery" &&
        loadStatus !== "unloaded" &&
        (type === "external_delivery" || type === "internal_transfer") &&
        destId === userFactoryId &&
        isNotClosedOrCancelled,
      label: "↓ Mark Unloaded",
      confirmTitle: "Confirm the vehicle has been fully unloaded?",
      color: "#f59e0b",
      onConfirm: () => doAction(() => api.post(`/trip/unload/${trip._id}`, withFactory)),
    },
    {
      condition:
        (userRole === "storeSite" || userRole === "dispatchSite") &&
        isInsideFactory &&
        purpose === "Delivery" &&
        loadStatus !== "unloaded" &&
        (type === "external_delivery" || type === "internal_transfer") &&
        destId === userFactoryId &&
        isNotClosedOrCancelled,
      label: "Change Route",
      confirmTitle: "Are you sure you want to move the vehicle to the Outside Factory?",
      color: "#3a64c7",
      onConfirm: () => doAction(() => api.post(`/trip/unload/${trip._id}`, withFactory)),
    },

    // 7. storeSite/dispatchSite | inside | Pickup | internal_transfer | not loaded → Mark Load Complete
    {
      condition:
        (userRole === "storeSite" || userRole === "dispatchSite") &&
        isInsideFactory &&
        purpose === "Pickup" &&
        type === "internal_transfer" &&
        loadStatus !== "loaded" &&
        isNotClosedOrCancelled,
      label: "↑ Mark Load Complete",
      confirmTitle: "Confirm the vehicle has been fully loaded?",
      color: "#8b5cf6",
      onConfirm: () => doAction(() => api.post(`/trip/load-complete/${trip._id}`, withTripFactory)),
    },

    // 8. storeSite | inside | not pending | not CLOSED/CANCELLED/COMPLETE → Mark Trip Completed / Mark Ready to Checkout
    {
      condition:
        userRole === "storeSite" &&
        isInsideFactory &&
        loadStatus !== "pending" &&
        tripState !== "CLOSED" &&
        tripState !== "CANCELLED" &&
        tripState !== "COMPLETE",
      label: type === "internal_transfer" ? "Mark Trip Completed" : "Mark Ready to Checkout",
      confirmTitle:
        type === "internal_transfer"
          ? "Mark this trip as completed?"
          : "Mark this vehicle as ready to checkout?",
      color: "#8b5cf6",
      onConfirm: () => {
        const endpoint =
          type === "internal_transfer"
            ? `/trip/internal-transfer-complete/${trip._id}`
            : `/trip/complete/${trip._id}`;
        return doAction(() => api.post(endpoint, withTripFactory));
      },
    },

    // 9. storeSite/dispatchSite | inside | Pickup | internal_transfer | not loaded → Final Load Check
    {
      condition:
        (userRole === "storeSite" || userRole === "dispatchSite") &&
        isInsideFactory &&
        purpose === "Pickup" &&
        type === "internal_transfer" &&
        loadStatus !== "loaded" &&
        isNotClosedOrCancelled,
      label: "↑ Final Load Check",
      confirmTitle: "Confirm this is the final load check for this vehicle?",
      color: "#ec4899",
      onConfirm: () => doAction(() => api.post(`/dispatch/load/${trip._id}`, withTripFactory)),
    },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────────
  const visibleActions = actions.filter((a) => a.condition);
  if (visibleActions.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {visibleActions.map(({ label, confirmTitle, color, onConfirm }) => (
        <Popconfirm
          key={label}
          title={confirmTitle}
          onConfirm={onConfirm}
          okText="Yes"
          cancelText="No"
          disabled={loading}
        >
          <button
            disabled={loading}
            style={{
              background: color,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "9px 18px",
              fontWeight: 700,
              fontSize: 13,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Please wait..." : label}
          </button>
        </Popconfirm>
      ))}
    </div>
  );
}

// ─── Vehicle Detail Modal ─────────────────────────────────────────────────────
export default function VehicleDetailModal({ vehicle, onClose, onRefresh,  userRole }) {
  if (!vehicle) return null;
  console.log("Rendering VehicleDetailModal with vehicle:", vehicle);
  const user = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;
  const userFactoryId = user?.factory._id;
  const location    = vehicle.location;
  const trip        = vehicle;
  const vehicleData = vehicle.vehicle;
  const pucAlert    = vehicleData.PUCExpiry;
  const phase       = vehicle.phase;
  const stage       = getWorkflowStage(vehicle);
  const tripHistory = Array.isArray(vehicle.tripHistory) ? vehicle.tripHistory : [];
  const Row = ({ label, value, warn, accent }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "5px 0", borderBottom: "1px solid #f9fafb" }}>
      <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, flexShrink: 0, minWidth: 110 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: warn ? "#dc2626" : accent ? "#6366f1" : "#111", textAlign: "right" }}>{value || "—"}</span>
    </div>
  );

  const Section = ({ title, children }) => (
    <div   style={{ marginBottom: 14 }}>
      <div  style={{ fontSize: 10, fontWeight: 800, color: "#6366f1", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>{title}</div>
      <div  style={{ background: "#fafafa", borderRadius: 8, padding: "4px 10px" }}>{children}</div>
    </div>
  );

  return (
    <Modal open={!!vehicle} onClose={onClose} title={`${vehicleData?.vehicleNumber} — Vehicle Details`} width={640} style={{ maxHeight: "90vh", scrollbarWidth: "none" }}>
      {/* Status & Phase row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <TypeBadge type={vehicleData?.typeOfVehicle} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", background: "#f3f4f6", borderRadius: 5, padding: "2px 7px" }}>
          {trip?.purpose === "pickup" ? "📦 Pickup" : "🚚 Delivery"}
        </span>
        {phase && (
          <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: .8, textTransform: "uppercase", padding: "2px 8px", borderRadius: 20, background: phase === "ORIGIN" ? "#ede9fe" : "#dcfce7", color: phase === "ORIGIN" ? "#6366f1" : "#15803d" }}>
            {phase === "ORIGIN" ? "📤 Origin" : "📥 Destination"}
          </span>
        )}
        {pucAlert && (
          <span style={{ background: "#fef2f2", color: "#dc2626", fontSize: 10.5, fontWeight: 700, borderRadius: 5, padding: "2px 7px", display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ width: 11, height: 11 }}>{Icon.alert}</span> PUC Expired
          </span>
        )}
      </div>

      {/* Info grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,  }}>
        <Section title="Driver">
          <Row label="Name"             value={vehicle?.driver?.driverName} />
          <Row label="Contact"          value={vehicle?.driver?.driverContact} />
          <Row label="ID Type"          value={vehicle?.driver?.driverIdType} />
          <Row label="ID Number"        value={vehicle?.driver?.driverIdNumber} />
        </Section>
        <Section title="Vehicle">
          <Row label="Number"           value={vehicleData?.vehicleNumber} accent />
          <Row label="Transporter"      value={vehicleData?.transporterName} />
          <Row label="Type"             value={vehicleTypeLabel[vehicleData?.typeOfVehicle] || vehicleData?.typeOfVehicle} />
          <Row label="PUC End"          value={fmtDate(vehicleData?.PUCExpiry)} warn={pucAlert} />
        </Section>
        <Section title="Trip Details">
          <Row label="Status"           value={trip?.status} />
          <Row label="Load Status"      value={trip?.loadStatus} accent={trip?.loadStatus === "loaded"} />
          <Row label="Purpose"          value={trip?.purpose} />
          <Row label="Type"             value={trip?.type} />
        </Section>
        <Section title="Location">
          <Row label="State"            value={location === "outside_factory" ? "Outside Factory" : location === "inside_factory" ? "Inside Factory" : "In Transit"} accent />
          <Row label="Source Factory"   value={trip?.sourceFactory?.name || (trip.type === "external_delivery" ? "External" : "Internal")} />
          <Row label="Destination"      value={trip?.destinationFactory?.name || "N/A"} />
          <Row label="Trip Start At"    value={fmtTime(trip?.createdAt) || "N/A"} />
        </Section>
        <Section title="Material Details">
          <Row label="Material"         value={trip?.materials[0]?.material || "N/A"} accent />
          <Row label="Quantity"         value={trip?.materials[0]?.quantity || "N/A"} accent />
          {trip?.materials[0] && 
          trip?.materials[0].customer === "" && (
              <Row label="Customer"     value={trip?.materials[0]?.customer || "N/A"} />
          )}
          {trip?.materials[0]?.supplier && trip?.materials[0]?.supplier !== "" && (
            <Row label="Supplier"         value={trip?.materials[0]?.supplier || "N/A"} />
          )}
        </Section>

        <Section title="Invoice Details">
          <Row label="Material Type"    value={trip?.materials[0]?.name === "RM" ? "Raw Material" : trip?.materials[0]?.name === "FG" ? "Finished Goods" : trip?.materials[0]?.name || "N/A" } accent />
          <Row label="Invoice No"       value={trip?.materials[0]?.invoiceNo || "N/A"} accent />
          <Row label="Amount"           value={trip?.materials[0]?.invoiceAmmount|| "N/A"} accent />
        </Section>
      </div>

      {/* ── Horizontal Trip History Timeline ── */}
      <TripTimeline tripHistory={tripHistory} />

      {/* Workflow actions */}
      <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid #f0f0f0", marginTop: 14, flexWrap: "wrap" }}>
        <WorkflowActions vehicle={vehicle} onAction={() => { onRefresh(); onClose(); }} userFactoryId={userFactoryId} userRole={userRole} />
        <button onClick={onClose} style={{ background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Close</button>
      </div>
    </Modal>
  );
}