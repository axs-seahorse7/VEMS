// middleware/versionCheck.middleware.js

import Version from "../../db/models/Version-Model/version.model.js";

// Cache the active version in memory — re-fetch only every 60 seconds
// so you're not hitting the DB on every single request
let cachedVersion   = null;
let lastFetchedAt   = null;
const CACHE_TTL_MS  = 5 * 60 * 1000; // 5 minutes

async function getActiveVersion(platform) {
  const now = Date.now();
  if (cachedVersion && lastFetchedAt && (now - lastFetchedAt) < CACHE_TTL_MS) {
    return cachedVersion;
  }

  cachedVersion  = await Version.findOne({ isActive: true, isDeleted: false, platform }).lean();
  lastFetchedAt  = now;
  return cachedVersion;
}

export const versionCheckMiddleware = async (req, res, next) => {
  const clientVersion = req.headers["x-app-version"];
  const platform      = req.headers["x-app-platform"] || "web";

  // Skip if client didn't send version header (e.g. Postman, server-to-server)
  if (!clientVersion) return next();

  // Skip the version check route itself to avoid circular logic
  if (req.path.includes("/versions/check")) return next();

  try {
    const latest = await getActiveVersion(platform);

    if (!latest) return next();

    if (latest.versionNumber !== clientVersion) {
     
      res.setHeader("x-latest-version",   latest.versionNumber);
      res.setHeader("x-force-update",     String(latest.isForceUpdate));

      if (latest.isForceUpdate) {
        return res.status(426).json({   // 426 = Upgrade Required
          success:       false,
          forceUpdate:   true,
          latestVersion: latest.versionNumber,
          message:       `Version v${latest.versionNumber} is required. Please refresh the app.`,
        });
    }
      // Soft update — let request through but tag it so frontend knows
      res.locals.versionMismatch = true;
      res.locals.latestVersion   = latest.versionNumber;
    }

  } catch (err) {
    // Never block a request because of a version check failure
    console.error("Version check middleware error:", err.message);
  }

  next();
};