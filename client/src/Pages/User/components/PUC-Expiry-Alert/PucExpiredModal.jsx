import { Modal } from "antd";
import { AlertTriangle, FileWarning } from "lucide-react";

export default function PucExpiredModal({ open, onClose, vehicleNumber, pucExpiryDate }) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={420}
      centered
      closeIcon={
        <span style={{
          width: 26, height: 26, borderRadius: 8,
          background: "#f3f4f6", display: "flex",
          alignItems: "center", justifyContent: "center",
          fontSize: 12, color: "#6b7280", cursor: "pointer",
        }}>✕</span>
      }
      styles={{
        content: { padding: 0, borderRadius: 16, overflow: "hidden" },
        mask: { backdropFilter: "blur(4px)", background: "rgba(0,0,0,0.4)" },
      }}
      title={null}
    >
      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
        padding: "24px 24px 20px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, position: "relative" }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <AlertTriangle size={26} color="#fff" strokeWidth={2.2} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: -0.2 }}>
              PUC Certificate Expired
            </div>
            {vehicleNumber && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2, fontWeight: 500 }}>
                {vehicleNumber}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "20px 24px 24px", background: "#fff" }}>
        <div style={{
          display: "flex", gap: 10, alignItems: "flex-start",
          background: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: 12, padding: "12px 14px", marginBottom: 16,
        }}>
          <FileWarning size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#991b1b" }}>
              This vehicle's PUC (Pollution Under Control) certificate has expired.
            </div>
            {pucExpiryDate && (
              <div style={{ fontSize: 11.5, color: "#b91c1c", marginTop: 3 }}>
                Expired on: {pucExpiryDate}
              </div>
            )}
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.6, marginBottom: 20 }}>
          Please ask the driver to provide a valid, updated PUC certificate before allowing
          this vehicle to proceed. Entry may not be permitted with an expired certificate,
          as per factory compliance policy.
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px 20px", borderRadius: 9, fontSize: 13, fontWeight: 700,
            border: "none", cursor: "pointer", transition: "all .15s",
            background: "linear-gradient(135deg, #dc2626, #b91c1c)",
            color: "#fff", boxShadow: "0 4px 14px rgba(220,38,38,0.35)",
          }}
          onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.filter = ""; }}
        >
          Understood, Ask Driver for New PUC
        </button>
      </div>
    </Modal>
  );
}