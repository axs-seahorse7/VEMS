import { useState } from "react";
import { Segmented, Button } from "antd";
import {Settings} from 'lucide-react';
const Icon = {
  truck: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  grid: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  list: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  refresh: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  plus: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  alert: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  signout: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  clock: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  map: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  ),
  package: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  location: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  search: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  dispatch: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  ),
  close: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  table: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="9" x2="9" y2="21" />
    </svg>
  ),
};
export default function FloatingActions({ viewMode, setViewMode, setIsFilterDrawerOpen }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <style>{`
        .fab-toggle {
          position: fixed;
          bottom: 32px;
          right: 32px;
          z-index: 999;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #3b82f6);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(99,102,241,0.45);
          transition: transform .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s;
        }
        .fab-toggle:hover { box-shadow: 0 6px 28px rgba(99,102,241,0.55); }
        .fab-toggle.is-open { transform: rotate(45deg); }

        .fab-popup {
          position: fixed;
          bottom: 90px;
          right: 32px;
          z-index: 998;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
          pointer-events: none;
        }

        .fab-item {
          opacity: 0;
          transform: translateY(12px) scale(0.92);
          transition: opacity .22s ease, transform .22s ease;
          pointer-events: none;
        }
        .fab-item.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: all;
        }
        .fab-item:nth-child(1) { transition-delay: .08s; }
        .fab-item:nth-child(2) { transition-delay: .04s; }

        .fab-backdrop {
          position: fixed;
          inset: 0;
          z-index: 997;
        }
      `}</style>

      {/* Backdrop to close on outside click */}
      {open && <div className="fab-backdrop" onClick={() => setOpen(false)} />}

      {/* Popup items */}
      <div className="fab-popup">
        <div className={`fab-item${open ? " visible" : ""}`}>
          <Button
            shape="round"
            onClick={() => { setIsFilterDrawerOpen(true); setOpen(false); }}
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}
          >
            Available vehicles
          </Button>
        </div>

        <div className={`fab-item${open ? " visible" : ""}`}>
          <Segmented
            value={viewMode}
            onChange={(val) => { setViewMode(val); }}
            shape="round"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.12)", background: "#fff" }}
            options={[
              { value: "grid",  icon: <span style={{ display: "flex", gap: 4 }}>{Icon.grid}  Grid</span>  },
              { value: "table", icon: <span style={{ display: "flex", gap: 4 }}>{Icon.table} Table</span> },
            ]}
          />
        </div>
      </div>

      {/* FAB toggle button */}
      <button
        className={`fab-toggle${open ? " is-open" : ""}`}
        onClick={() => setOpen(o => !o)}
        title="Actions"
      >
         {/* <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
         <line x1="12" y1="5" x2="12" y2="19" />
         <line x1="5" y1="12" x2="19" y2="12" />
         </svg> */}

        <Settings color="white" />
      </button>
    </>
  );
}