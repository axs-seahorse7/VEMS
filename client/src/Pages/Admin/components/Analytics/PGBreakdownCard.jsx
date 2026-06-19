import TripTypeDonut from "./TripTypeDonut.jsx";


function PGBreakdownCard({ delivery, pickup }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      padding: "16px 18px",
      boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.07em",
        textTransform: "uppercase", color: "#9ca3af", marginBottom: 14,
      }}>
        PG to PG vs Customer (Delivery vs Pickup)
      </div>

      <div style={{ display: "flex", marginTop: 40, alignItems: "center", gap: 5 }}>
        {/* Delivery donut — blue / amber */}
        <TripTypeDonut
          title="Delivery"
          p2p={delivery.p2p}
          customerOrExternal={{ ...delivery.customerDelivery, label: "Customer Delivery" }}
          colorP2P="#3b82f6"
          colorOther="#f59e0b"
        />

        {/* Pickup donut — violet / emerald */}
        <TripTypeDonut
          title="Pickup"
          p2p={pickup.p2p}
          customerOrExternal={{ ...pickup.external, label: "External" }}
          colorP2P="#8b5cf6"
          colorOther="#10b981"
        />
      </div>
      
      
       
    </div>
  );
}

export default PGBreakdownCard;