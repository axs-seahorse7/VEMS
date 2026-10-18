import api, {CURRENT_VERSION} from "../Api/api"; // adjust path

let versionChecked   = false; // an update has already been announced
let forceUpdateShown = false; // force flag — swallow repeated 426s

const cmp = (a, b) =>
  String(a).trim().replace(/^v/i, "")
    .localeCompare(String(b).trim().replace(/^v/i, ""), undefined, { numeric: true });
export const setupInterceptors = () => {
  api.interceptors.request.use(
    (config) => config,
    (error) => Promise.reject(error)
  );

  api.interceptors.response.use(
  (response) => {
    if (versionChecked) return response;

    const latestVersion = response.headers["x-latest-version"];
    if (!latestVersion) return response;

    // already on this version or newer → ignore (also ignores stale cached headers)
    if (cmp(CURRENT_VERSION, latestVersion) >= 0) return response;

    const isForceUpdate = response.headers["x-force-update"] === "true";

    // set immediately, before anything async
    versionChecked = true;
    if (isForceUpdate) forceUpdateShown = true;

    showUpdateBar({ version: latestVersion, force: isForceUpdate });
    return response;
  },

    (error) => {
      const status      = error.response?.status;
      const currentPath = window.location.pathname;

      // ── 426: announce once, then swallow every later 426 ──
      if (status === 426) {
        if (!forceUpdateShown) {
          forceUpdateShown = true;
          versionChecked   = true;
          const { latestVersion } = error.response.data || {};
          showUpdateBar({ version: latestVersion, force: true });
        }
        error.isForceUpdate = true;     // lets you skip error toasts: if (err.isForceUpdate) return;
        return Promise.reject(error);
      }

      if (status === 401 && currentPath !== "/login" && !error.config?.skipAuthRedirect) {
        console.warn("Session expired");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }

      return Promise.reject(error);
    }
  );
};

// ── Small, non-blocking update bar (bottom-left) ─────────────────────────────
const BAR_ID = "vems-update-bar";

function showUpdateBar({ version, force = false }) {
  if (document.getElementById(BAR_ID)) return;

  if (!document.getElementById("vems-update-style")) {
    const style = document.createElement("style");
    style.id = "vems-update-style";
    style.textContent = `
      @keyframes vems-bar-in {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      #${BAR_ID} {
        position: fixed; left: 16px; bottom: 16px; z-index: 99999;
        display: flex; align-items: center; gap: 12px;
        max-width: calc(100vw - 32px);
        padding: 9px 10px 9px 14px;
        background: #111827; color: #f9fafb;
        border-radius: 10px; border: 1px solid #1f2937;
        box-shadow: 0 8px 24px rgba(0,0,0,0.22);
        font: 500 13px/1.3 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        animation: vems-bar-in 0.25s ease;
      }
      #${BAR_ID} .vems-dot {
        width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
        background: #818cf8; box-shadow: 0 0 0 3px rgba(129,140,248,0.25);
      }
      #${BAR_ID} .vems-refresh {
        background: #6366f1; color: #fff; border: none; border-radius: 6px;
        padding: 5px 12px; font: 600 12px 'Segoe UI', sans-serif; cursor: pointer;
        white-space: nowrap;
      }
      #${BAR_ID} .vems-refresh:hover { background: #4f46e5; }
      #${BAR_ID} .vems-refresh:disabled { opacity: .7; cursor: default; }
      #${BAR_ID} .vems-close {
        background: none; border: none; color: #9ca3af; cursor: pointer;
        font-size: 16px; line-height: 1; padding: 2px 4px;
      }
      #${BAR_ID} .vems-close:hover { color: #fff; }
    `;
    document.head.appendChild(style);
  }

  const bar = document.createElement("div");
  bar.id = BAR_ID;
  bar.setAttribute("role", "status");

  const dot = document.createElement("span");
  dot.className = "vems-dot";

  const text = document.createElement("span");
  text.textContent = version
    ? `New update available (v${version})`
    : "New update available";

  const btn = document.createElement("button");
  btn.className = "vems-refresh";
  btn.type = "button";
  btn.textContent = "Refresh";
  btn.onclick = () => {
    btn.disabled = true;
    btn.textContent = "Refreshing…";
    window.location.reload();
  };

  bar.append(dot, text, btn);

  // optional update: user may dismiss it. Forced update: stays until refreshed.
  if (!force) {
    const close = document.createElement("button");
    close.className = "vems-close";
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss");
    close.textContent = "×";
    close.onclick = () => bar.remove();
    bar.append(close);
  }

  document.body.appendChild(bar);
}