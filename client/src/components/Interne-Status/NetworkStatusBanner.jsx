import { useEffect, useState, useRef, useCallback } from "react";

const SLOW_THRESHOLD_MS = 1500;
const OFFLINE_CHECK_URL = "https://www.gstatic.com/generate_204";
const CHECK_INTERVAL_MS = 6000;
const SLOW_CONFIRM_COUNT = 2;

function useNetworkStatus() {
  const [status, setStatus] = useState("good");
  const [ping,   setPing]   = useState(null);
  const slowCount           = useRef(0);

  const check = useCallback(async () => {
    if (!navigator.onLine) {
      slowCount.current = SLOW_CONFIRM_COUNT;
      setStatus("offline"); setPing(null); return;
    }
    const start = performance.now();
    try {
      await fetch(`${OFFLINE_CHECK_URL}?_=${Date.now()}`, { method:"HEAD", cache:"no-store", mode:"no-cors" });
      const ms = Math.round(performance.now() - start);
      setPing(ms);
      if (ms > SLOW_THRESHOLD_MS) {
        slowCount.current += 1;
        if (slowCount.current >= SLOW_CONFIRM_COUNT) setStatus("slow");
      } else {
        slowCount.current = 0; setStatus("good");
      }
    } catch {
      slowCount.current += 1;
      if (slowCount.current >= SLOW_CONFIRM_COUNT) setStatus("offline");
      setPing(null);
    }
  }, []);

  useEffect(() => {
    check();
    const iv = setInterval(check, CHECK_INTERVAL_MS);
    window.addEventListener("offline", () => { setStatus("offline"); setPing(null); });
    window.addEventListener("online",  () => { slowCount.current = 0; check(); });
    return () => clearInterval(iv);
  }, [check]);

  return { status, ping };
}

export default function NetworkStatusBanner() {
  const { status, ping } = useNetworkStatus();
  const [visible, setVisible]     = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const prevStatus = useRef("good");

  useEffect(() => {
    if (status !== "good") {
      setDismissed(false); setVisible(true);
    } else if (prevStatus.current !== "good") {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
    prevStatus.current = status;
  }, [status]);

  if (!visible || dismissed) return null;

  const CONFIG = {
    offline: { icon:<i class="ri-wifi-off-fill"></i>, label:"No internet",         color:"#dc2626", bg:"#fef2f2", border:"#fecaca" },
    slow:    { icon:<i class="ri-wifi-fill"></i>, label:`Slow connection${ping ? ` · ${ping}ms` : ""}`, color:"#d97706", bg:"#fffbeb", border:"#fde68a" },
    good:    { icon:<i class="ri-wifi-fill"></i>, label:"Connection restored",  color:"#16a34a", bg:"#f0fdf4", border:"#bbf7d0" },
  };

  const c = CONFIG[status];

  return (
    <>
      <style>{`
        @keyframes netUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes netBlink { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>
      <div style={{
        position:   "fixed", bottom: 50, left: "50%",
        transform:  "translateX(-50%)", zIndex: 99999,
        background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: 10, padding: "8px 14px",
        display:    "flex", alignItems: "center", gap: 8,
        boxShadow:  "0 2px 12px rgba(0,0,0,.08)",
        animation:  `netUp .2s ease${status !== "good" ? ", netBlink 2s ease-in-out infinite" : ""}`,
        fontSize:   12, fontWeight: 600, color: c.color,
        whiteSpace: "nowrap",
      }}>
        <span>{c.icon}</span>
        <span>{c.label}</span>
        
      </div>
    </>
  );
}