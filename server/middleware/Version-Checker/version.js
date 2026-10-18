// middleware/versionCheck.middleware.js

import Version from "../../db/models/Version-Model/version.model.js";

// Cache the active version per platform. Re-fetched at most every 60s,
// and cleared right away when a version is activated (see clearVersionCache).
const cache = new Map(); // platform -> { at, latest }
const CACHE_TTL_MS = 60 * 1000;

async function getActiveVersion(platform) {
  const hit = cache.get(platform);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.latest;

  const latest = await Version.findOne({ isActive: true, isDeleted: false, platform }).sort({ createdAt: -1 })
    .lean();
  cache.set(platform, { at: Date.now(), latest });
  return latest;
}

// Call this in PATCH /versions/:id/set-active (and delete/patch) so clients see changes at once
export const clearVersionCache = () => cache.clear();
const norm = (v) => String(v ?? "").trim().replace(/^v/i, "");
const cmpVersion = (a, b) => norm(a).localeCompare(norm(b), undefined, { numeric: true });

export const versionCheckMiddleware = async (req, res, next) => {
  const clientVersion = req.headers["x-app-version"];
  const platform = req.headers["x-app-platform"] || "web";

  
  // Skip if client didn't send a version header (Postman, server-to-server)
  if (!clientVersion) return next();

  // Skip the version check route itself
  if (req.path.includes("/versions/check")) return next();

  try {
    const latest = await getActiveVersion(platform);

    // Only an OLDER client is outdated. Same or newer (e.g. after a rollback) is fine.
    if (latest) {
        const outdated = cmpVersion(clientVersion, latest.versionNumber) < 0;
        res.setHeader("x-latest-version", latest.versionNumber);
        res.setHeader("x-force-update", String(outdated && !!latest.isForceUpdate));
        res.vary("x-app-version");
        if (outdated) {
          res.locals.versionMismatch = true;
          res.locals.latestVersion = latest.versionNumber;
        }
      }
  } catch (err) {
    // Never block a request because of a version check failure
    console.error("Version check middleware error:", err.message);
  }

  next();
};