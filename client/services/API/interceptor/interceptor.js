import api from "../Api/api";
import { notification, Modal } from "antd";

let versionChecked  = false;  // soft update shown
let forceUpdateShown = false; // force update modal shown — separate flag

export const setupInterceptors = () => {
  api.interceptors.request.use(
    (config) => config,
    (error) => Promise.reject(error)
  );

  api.interceptors.response.use((response) => {
      if (versionChecked) return response;

      const latestVersion = response.headers["x-latest-version"];
      const isForceUpdate = response.headers["x-force-update"] === "true";

      if (!latestVersion) return response;

      // Set IMMEDIATELY before any async/modal 
      versionChecked = true;

      if (isForceUpdate) {
        forceUpdateShown = true;
        Modal.error({
          title:        "Update Required",
          content:      `Version v${latestVersion} is required. Please refresh.`,
          okText:       "Refresh Now",
          onOk:         () => reloadWithProgress(), // ← was window.location.reload()
          closable:     false,
          maskClosable: false,
        });
      } else {
        const key = `version-update-${latestVersion}`;
        notification.open({
          key,
          message:     `New Update Available — v${latestVersion}`,
          description: "A new version is ready. Refresh to get the latest.",
          placement:   "bottomRight",
          duration:    0,
          btn:         createRefreshButton(key),
        });
      }

      return response;
    },

    (error) => {
      const status      = error.response?.status;
      const currentPath = window.location.pathname;

      // ── Force update — show modal ONCE then swallow all future 426s ──
      if (status === 426) {
        if (!forceUpdateShown) {
          forceUpdateShown = true;
          versionChecked   = true;

          const { latestVersion, message: msg } = error.response.data;
          Modal.error({
            title:        "Update Required",
            content:      msg || `Version v${latestVersion} is required. Please update.`,
            okText:       "Update Now",
            onOk:         () => reloadWithProgress(),
            closable:     false,
            maskClosable: false,
          });
        }
        // Silently swallow — don't let 426 bubble up to your polling logic
        return Promise.resolve({ data: { success: false, forceUpdate: true } });
      }

      if (status === 401 && currentPath !== "/login") {
        console.warn("🔒 Session expired");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }

      return Promise.reject(error);
    }
  );
};

// ── Reload with progress overlay ─────────────────────────────────────────────
function reloadWithProgress() {
  if (!document.getElementById("vems-update-style")) {
    const style = document.createElement("style");
    style.id = "vems-update-style";
    style.textContent = `
      @keyframes spin-slow { 
        from { transform: rotate(0deg); } 
        to   { transform: rotate(360deg); } 
      }
      @keyframes fade-in { 
        from { opacity: 0; transform: translateY(8px); } 
        to   { opacity: 1; transform: translateY(0); } 
      }
    `;
    document.head.appendChild(style);
  }
  // Create overlay
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: rgba(255,255,255,0.97);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    gap: 20px;
  `;

  // Icon
  const icon = document.createElement("div");
  icon.innerHTML = `
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="7.5 4.21 12 6.81 16.5 4.21"/>
      <polyline points="7.5 19.79 7.5 14.6 3 12"/>
      <polyline points="21 12 16.5 14.6 16.5 19.79"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  `;
  icon.style.cssText = `
  display: flex;
  align-items: center;
  justify-content: center;
  animation: spin-slow 3s linear infinite;
  transform-origin: center;
`;

  // Title
  const title = document.createElement("div");
  title.textContent = "Updating Application…";
  title.style.cssText = `
    font-size: 20px; font-weight: 700; color: #111827; letter-spacing: -0.02em;
  `;

  // Subtitle
  const subtitle = document.createElement("div");
  subtitle.textContent = "Please wait while we apply the latest changes";
  subtitle.style.cssText = `font-size: 13px; color: #9ca3af;`;

  // Progress track
  const track = document.createElement("div");
  track.style.cssText = `
    width: 280px; height: 6px; background: #f3f4f6;
    border-radius: 99px; overflow: hidden;
  `;

  const bar = document.createElement("div");
  bar.style.cssText = `
    height: 100%; width: 0%; border-radius: 99px;
    background: linear-gradient(90deg, #6366f1, #818cf8);
    transition: width 0.1s linear;
    box-shadow: 0 0 8px rgba(99,102,241,0.5);
  `;
  track.appendChild(bar);

  // Countdown label
  const countdown = document.createElement("div");
  countdown.style.cssText = `font-size: 12px; color: #6b7280; font-weight: 500;`;

  // Inject keyframes once
  if (!document.getElementById("vems-update-style")) {
    const style = document.createElement("style");
    style.id = "vems-update-style";
    style.textContent = `
      @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes fade-in   { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
  }

  overlay.style.animation = "fade-in 0.25s ease";
  overlay.append(icon, title, subtitle, track, countdown);
  document.body.appendChild(overlay);

  // ── 5-second animated progress ───────────────────────────────────────────
  const DURATION  = 5000; // ms
  const INTERVAL  = 50;   // ms tick
  let   elapsed   = 0;

  const steps = [
    { at: 0,    text: "Preparing update…"         },
    { at: 20,   text: "Downloading latest build…" },
    { at: 50,   text: "Applying changes…"         },
    { at: 80,   text: "Almost there…"             },
    { at: 95,   text: "Finishing up…"             },
  ];

  const timer = setInterval(() => {
    elapsed += INTERVAL;
    const pct = Math.min((elapsed / DURATION) * 100, 99); // hold at 99 until reload

    bar.style.width = `${pct}%`;

    // Update label based on steps
    const currentStep = [...steps].reverse().find(s => pct >= s.at);
    if (currentStep) countdown.textContent = currentStep.text;

    if (elapsed >= DURATION) {
      clearInterval(timer);
      bar.style.width = "100%";
      countdown.textContent = "Done! Reloading…";
      setTimeout(() => window.location.reload(), 300);
    }
  }, INTERVAL);
}

// ── Plain DOM refresh button ──────────────────────────────────────────────────
function createRefreshButton(notifKey) {
  const btn = document.createElement("button");
  btn.textContent = "Update Now";
  btn.style.cssText = `
    background: #6366f1; color: #fff; border: none;
    border-radius: 6px; padding: 4px 12px;
    cursor: pointer; font-size: 12px; font-weight: 600;
  `;
  btn.onclick = () => {
    notification.destroy(notifKey);
    reloadWithProgress();
  };
  return btn;
}