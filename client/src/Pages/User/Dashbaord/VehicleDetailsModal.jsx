import { useState } from "react";
import api from "../../../../services/API/Api/api";
import { message } from "antd";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isPUCExpired = (d) => new Date(d) < new Date();
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN") : "—";
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";

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
  
  if (location === "waiting_outside") return "waiting";
  if (location === "inside_factory") return "inside";
  if (location === "in_transit") return "enroute";
  
  return "unknown";
};

// ─── Stage Metadata ───────────────────────────────────────────────────────────
const STAGE_META = {
  waiting:  { label: "Waiting",  bg: "#fef9c3", color: "#92400e" },
  inside:   { label: "Inside",   bg: "#dcfce7", color: "#15803d" },
  enroute:  { label: "En Route", bg: "#dbeafe", color: "#1d4ed8" },
  unknown:  { label: "Unknown",  bg: "#f3f4f6", color: "#6b7280" },
};

const vehicleTypeLabel = {
  truck: "Truck", miniTruck: "Mini Truck", containerTruck: "Container Truck",
  mixerTruck: "Mixer Truck", waterTanker: "Water Tanker", tractor: "Tractor",
  car: "Car", bus: "Bus", ambulance: "Ambulance",
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  alert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
};

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, children, title, width = 700 }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
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

// ─── Status Badge ─────────────────────────────────────────────────────────────
function Badge({ stage }) {
  const s = STAGE_META[stage] || STAGE_META.unknown;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 10.5, fontWeight: 700, borderRadius: 5, padding: "2px 7px", letterSpacing: .3, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function TypeBadge({ type }) {
  return (
    <span style={{ background: "#f3f4f6", color: "#374151", fontSize: 10.5, fontWeight: 600, borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap" }}>
      {vehicleTypeLabel[type] || type}
    </span>
  );
}

/**
 * ROLE-BASED ACTIONS
 * 
 * atGate: Checkin (waiting_outside→inside) + Checkout (inside→in_transit)
 * storeSite: Load/Unload (affects Trip.loadStatus only)
 * dispatchSite: Load (final check before dispatch)
 */
function WorkflowActions({ vehicle, onAction, userFactoryId, userRole }) {
  const [loading, setLoading] = useState(false);

  const location = vehicle.location;
  const trip = vehicle;
  const phase = vehicle.phase;

  const doAction = async (fn) => {
    setLoading(true);
    try {
     const result = await fn();
     message.success(result.data?.message || "Action successful");
      onAction();
    } catch (e) {
      message.error(e.response?.data?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const btnStyle = (bg) => ({
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "9px 18px",
    fontWeight: 700,
    fontSize: 13,
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.7 : 1,
  });

  // 🛡️ GATE PERSON: CHECKIN
  if (userRole === "atGate" && (location === "outside_factory" || location === "enroute") && phase === "DESTINATION") {
    return (
      <button
        style={btnStyle("#10b981")}
        onClick={() =>
          doAction(() =>
            api.post(`/trip/checkin/${trip._id}`, {
              vehicleNumber: vehicle.vehicle?.vehicleNumber,
              factoryId: userFactoryId,
            })
          )
        }
      >
        ✓ Allow Entry (Checkin)
      </button>
    );
  }

  if (userRole === "atGate" && (location === "outside_factory" || location === "enroute") && phase === "ORIGIN") {
    return (
      <button
        style={btnStyle("#10b981")}
        onClick={() =>
          doAction(() =>
            api.post(`/trip/arrive/${trip._id}`, {
              vehicleNumber: vehicle.vehicle?.vehicleNumber,
              factoryId: userFactoryId,
            })
          )
        }
      >
        ✓ Mark Arrived 
      </button>
    );
  }

  // 🛡️ GATE PERSON: CHECKOUT
  if (userRole === "atGate" && location === "inside_factory" && phase === "ORIGIN" && userFactoryId !== trip.sourceFactoryId) {
    return (
      <button
        style={btnStyle("#6366f1")}
        onClick={() =>
          doAction(() =>
            api.post(`/trip/checkout/${trip._id}`, {
              vehicleNumber: vehicle.vehicle?.vehicleNumber,
              sourceFactoryId: userFactoryId,
              destinationFactoryId: trip?.destinationFactoryId,
              purpose: trip?.purpose || "pickup",
            })
          )
        }
      >
        → Dispatch Vehicle (Checkout)
      </button>
    );
  }

  //  STORE PERSON: UNLOAD (Delivery)
  if (userRole === "storeSite" && location === "inside_factory" && trip?.purpose === "Delivery" && trip?.loadStatus !== "unloaded" && (trip.type === "external_delivery" || trip.type === "internal_transfer")) {
    return (
      <button
        style={btnStyle("#f59e0b")}
        onClick={() =>
          doAction(() =>
            api.post(`/store/unload/${trip?._id}`, {
              vehicleNumber: vehicle.vehicle?.vehicleNumber,
              factoryId: userFactoryId,
            })
          )
        }
      >
        ↓ Mark Unloaded
      </button>
    );
  }

  //  STORE PERSON: LOAD (Pickup)
  if (userRole === "storeSite" && location === "inside_factory" && trip?.purpose === "pickup" && trip.type === "internal_transfer" && trip?.loadStatus !== "loaded") {
    return (
      <button
        style={btnStyle("#8b5cf6")}
        onClick={() =>
          doAction(() =>
            api.post(`/store/load/${trip?._id}`, {
              vehicleNumber: vehicle.vehicle?.vehicleNumber,
              tripId: trip?._id,
              factoryId: userFactoryId,
            })
          )
        }
      >
        ↑ Mark Load Complete
      </button>
    );
  }

  if (userRole === "storeSite" && location === "inside_factory" && trip?.purpose === "Delivery" && trip?.loadStatus === "unloaded" && trip?.tripState !== "CLOSED" && ( trip.type === "external_delivery" || trip.type === "internal_transfer")) {
    return (
      <div style={{ display: "flex", gap: 8 }}>

        { trip.type === 'internal_transfer' ? (
          <button
            style={btnStyle("#8b5cf6")}
            onClick={() =>
              doAction(() =>
                api.post(`/trip/close/${trip?._id}`, {
                  vehicleNumber: vehicle.vehicle?.vehicleNumber,
                  tripId: trip?._id,
                  factoryId: userFactoryId,
                })
              )
            }
        >
          Close Trip
        </button>):(
            <button
            style={btnStyle("#8b5cf6")}
            onClick={() =>
              doAction(() =>
                api.post(`/trip/close/${trip?._id}`, {
                  vehicleNumber: vehicle.vehicle?.vehicleNumber,
                  tripId: trip?._id,
                  factoryId: userFactoryId,
                })
              )
            }
        >
          Mark Delivery Complete
        </button>
        )}

        <button
          style={btnStyle("#8b5cf6")}
          onClick={() =>
            doAction(() =>
              api.post(`/trip/next/${trip?._id}`, {
                vehicleNumber: vehicle.vehicle?.vehicleNumber,
                tripId: trip?._id,
                factoryId: userFactoryId,
              })
            )
          }
        >
          Next Trip
        </button>

      </div>
    );
  }

  //  DISPATCH PERSON: FINAL LOAD (Pickup)
  if (userRole === "dispatchSite" && location === "inside_factory" && trip?.purpose === "Pickup" && trip.type === "internal_transfer" && trip?.loadStatus !== "loaded") {
    return (
      <button
        style={btnStyle("#ec4899")}
        onClick={() =>
          doAction(() =>
            api.post(`/dispatch/load/${trip?._id}`, {
              vehicleNumber: vehicle.vehicle?.vehicleNumber,
              tripId: trip?._id,
              factoryId: userFactoryId,
            })
          )
        }
      >
        ↑ Final Load Check
      </button>
    );
  }

  return null;
}

// ─── Vehicle Detail Modal ─────────────────────────────────────────────────────
export default function VehicleDetailModal({ vehicle, onClose, onRefresh, userFactoryId, userRole }) {
  if (!vehicle) return null;
  console.log("Opening Modal for Vehicle:", vehicle);

  const location = vehicle.location;
  const trip = vehicle;
  const vehicleData = vehicle.vehicle;
  const pucAlert = vehicleData.PUCExpiry;
  const phase = vehicle.phase;
  const stage = getWorkflowStage(vehicle);

  const Row = ({ label, value, warn, accent }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "5px 0", borderBottom: "1px solid #f9fafb" }}>
      <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, flexShrink: 0, minWidth: 110 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: warn ? "#dc2626" : accent ? "#6366f1" : "#111", textAlign: "right" }}>{value || "—"}</span>
    </div>
  );

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#6366f1", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>{title}</div>
      <div style={{ background: "#fafafa", borderRadius: 8, padding: "4px 10px" }}>{children}</div>
    </div>
  );

  return (
    <Modal open={!!vehicle} onClose={onClose} title={`${vehicleData?.vehicleNumber} — Vehicle Details`} width={640}>
      {/* Status & Phase */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {/* <Badge stage={stage} /> */}
        <TypeBadge type={vehicleData?.typeOfVehicle} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", background: "#f3f4f6", borderRadius: 5, padding: "2px 7px" }}>
          {trip?.purpose === "pickup" ? "📦 Pickup" : "🚚 Delivery"}
        </span>
        {phase && (
          <span style={{
            fontSize: 9.5, fontWeight: 800, letterSpacing: .8, textTransform: "uppercase",
            padding: "2px 8px", borderRadius: 20,
            background: phase === "ORIGIN" ? "#ede9fe" : "#dcfce7",
            color: phase === "ORIGIN" ? "#6366f1" : "#15803d",
          }}>
            {phase === "ORIGIN" ? "📤 Origin" : "📥 Destination"}
          </span>
        )}
        {pucAlert && (
          <span style={{ background: "#fef2f2", color: "#dc2626", fontSize: 10.5, fontWeight: 700, borderRadius: 5, padding: "2px 7px", display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ width: 11, height: 11 }}>{Icon.alert}</span> PUC Expired
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Section title="Driver" style={{ gridColumn: "1 / -1", boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 6px 12px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb" }}>
          <Row label="Name" value={vehicleData?.driverName} />
          <Row label="Contact" value={vehicleData?.driverContact} />
          <Row label="ID Type" value={vehicleData?.driverIdType} />
          <Row label="ID Number" value={vehicleData?.driverIdNumber} />
        </Section>
        <Section title="Vehicle">
          <Row label="Number" value={vehicleData?.vehicleNumber} accent />
          <Row label="Transporter" value={vehicleData?.transporterName} />
          <Row label="Type" value={vehicleTypeLabel[vehicleData?.typeOfVehicle] || vehicleData?.typeOfVehicle} />
          <Row label="PUC End" value={fmtDate(vehicleData?.PUCExpiry)} warn={pucAlert} />
        </Section>
        <Section title="Trip Details">
          <Row label="Status" value={trip?.status} />
          <Row label="Load Status" value={trip?.loadStatus} accent={trip?.loadStatus === "loaded"} />
          <Row label="Purpose" value={trip?.purpose} />
          <Row label="Type" value={trip?.type} />
        </Section>
        <Section title="Location">
          <Row label="State (Location)" value={location === "outside_factory" ? "Outside Factory" : location === "inside_factory" ? "Inside Factory" : "In Transit"} accent />
          <Row label="Source Factory" value={trip?.sourceFactoryId?.name || trip.type === "external_delivery" ? "External" : "Internal"} />
          <Row label="Destination" value={trip?.destinationFactoryId?.name || "N/A"} />
        </Section>
      </div>

      {/* Workflow actions */}
      <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid #f0f0f0", marginTop: 4, flexWrap: "wrap" }}>
        <WorkflowActions vehicle={vehicle} onAction={() => { onRefresh(); onClose(); }} userFactoryId={userFactoryId} userRole={userRole} />
        <button onClick={onClose} style={{ background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Close</button>
      </div>
    </Modal>
  );
}