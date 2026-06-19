import { Router } from "express";
import { AlertEmailUsers } from "../db/models/Alert-Users/alertEmailUsers.model.js"; // adjust path as needed
import factoryModel from "../db/models/factory-model/factory.model.js";
import User from "../db/models/User-Model/user.model.js"; // adjust path as needed
import Version from "../db/models/Version-Model/version.model.js"; // adjust path as needed



const router = Router();

// ════════════════════════════════════════════════════════════════════════════
//  HELPER — wrap async handlers so errors bubble up to Express error handler
// ════════════════════════════════════════════════════════════════════════════
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const ok   = (res, data, meta = {})  => res.status(200).json({ success: true,  data, ...meta });
const fail = (res, message, code = 400) => res.status(code).json({ success: false, message });

// ════════════════════════════════════════════════════════════════════════════
//  ALERT EMAIL USERS
//  Base route: /api/settings/alert-users
// ════════════════════════════════════════════════════════════════════════════
const ALERT_TYPES = ["tripCancelled", "delayTrips", "vehicleEntry", "vehicleExit"];

router.get("/alert-users", wrap(async (req, res) => {
  const filter = {};
  if (req.query.factoryId) filter.factoryId = req.query.factoryId;
  if (req.query.excludePaused === "true") filter.isPaused = { $ne: true };

  const users = await AlertEmailUsers
    .find(filter)
    .populate("factoryId", "name location")
    .sort({ createdAt: -1 })
    .lean();

  ok(res, users, { total: users.length });
}));

router.post("/alert-users", wrap(async (req, res) => {
  try {
    const { name, email, factoryId, alertTypes, alertInterval } = req.body;

    if (!name || !email || !factoryId)
      return fail(res, "name, email, and factoryId are required");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return fail(res, "Invalid email format");

    if (alertTypes !== undefined) {
      if (!Array.isArray(alertTypes) || alertTypes.length === 0)
        return fail(res, "alertTypes must be a non-empty array");
      const invalidType = alertTypes.find(t => !ALERT_TYPES.includes(t));
      if (invalidType)
        return fail(res, `Invalid alert type: ${invalidType}`);
    }

    if (alertInterval !== undefined) {
      if (typeof alertInterval !== "number" || alertInterval < 1)
        return fail(res, "alertInterval must be a number >= 1");
    }

    const factoryExists = await factoryModel.exists({ _id: factoryId });
    if (!factoryExists)
      return fail(res, "Factory not found", 404);

  const confilictByFactory = await AlertEmailUsers.findOne({ factoryId, email: email.toLowerCase().trim() });
  if (confilictByFactory) return fail(res, "User already assigned to this factory", 409);

  const user = await AlertEmailUsers.create({
    name,
    email: email.toLowerCase().trim(),
    factoryId,
    ...(alertTypes !== undefined && { alertTypes }),
    ...(alertInterval !== undefined && { alertInterval }),
  });
  const populated = await user.populate("factoryId", "name location");

  return res.status(201).json({ success: true, data: populated });
  } catch (error) {
  console.error("Error creating alert recipient:", error);
  return res.status(500).json({ success: false, message: "Server error" });
  }
}));

router.patch("/alert-users/:id/pause", wrap(async (req, res) => {
  try {
    const { id } = req.params;
    const { isPaused } = req.body;

    if (typeof isPaused !== "boolean")
      return fail(res, "isPaused (boolean) is required");

    const user = await AlertEmailUsers.findByIdAndUpdate(
      id,
      { isPaused },
      { new: true }
    ).populate("factoryId", "name location");

    if (!user) return fail(res, "Alert recipient not found", 404);

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Error updating pause status:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}));

router.get("/alert-users/:id", wrap(async (req, res) => {
  const user = await AlertEmailUsers
    .findById(req.params.id)
    .populate("factoryId", "name location");

  if (!user) return fail(res, "Recipient not found", 404);
  ok(res, user);
}));

router.patch("/alert-users/:id", wrap(async (req, res) => {
  try {
    const allowed = ["name", "email", "factoryId", "isPaused", "alertTypes", "alertInterval"];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );

    if (updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email))
        return res.status(400).json({ success: false, message: "Invalid email format" });
      updates.email = updates.email.toLowerCase().trim();
    }

    if (updates.factoryId) {
      const factoryExists = await factoryModel.exists({ _id: updates.factoryId });
      if (!factoryExists) return res.status(404).json({ success: false, message: "Factory not found" });
    }

    if (updates.alertTypes !== undefined) {
      if (!Array.isArray(updates.alertTypes) || updates.alertTypes.length === 0)
        return res.status(400).json({ success: false, message: "alertTypes must be a non-empty array" });
      const invalidType = updates.alertTypes.find(t => !ALERT_TYPES.includes(t));
      if (invalidType)
        return res.status(400).json({ success: false, message: `Invalid alert type: ${invalidType}` });
    }

    if (updates.alertInterval !== undefined) {
      if (typeof updates.alertInterval !== "number" || updates.alertInterval < 1)
        return res.status(400).json({ success: false, message: "alertInterval must be a number >= 1" });
    }

    if (updates.isPaused !== undefined && typeof updates.isPaused !== "boolean")
      return res.status(400).json({ success: false, message: "isPaused must be a boolean" });

    // Prevent duplicate (factoryId, email) pair when either changes
    if (updates.factoryId || updates.email) {
      const existing = await AlertEmailUsers.findById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, message: "Recipient not found" });

      const checkFactoryId = updates.factoryId ?? existing.factoryId;
      const checkEmail = updates.email ?? existing.email;

      const conflict = await AlertEmailUsers.findOne({
        _id: { $ne: req.params.id },
        factoryId: checkFactoryId,
        email: checkEmail,
      });
      if (conflict) return res.status(409).json({ success: false, message: "User already assigned to this factory" });
    }

    const user = await AlertEmailUsers
      .findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate("factoryId", "name location");

    if (!user) return res.status(404).json({ success: false, message: "Recipient not found" });
    return res.json({ success: true, data: user, message: "Recipient updated successfully" });
  } catch (error) {
    console.error("Error updating alert recipient:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}));

router.delete("/alert-users/:id", wrap(async (req, res) => {
  try {
      const user = await AlertEmailUsers.findByIdAndDelete(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: "Recipient not found" }   );
      return res.json({ success: true, message: "Recipient deleted" });
  } catch (error) {
      console.error("Error deleting alert recipient:", error);
      return res.status(500).json({ success: false, message: "Server error" });
  }
}));


// ════════════════════════════════════════════════════════════════════════════
//  NOTIFICATIONS
//  Base route: /api/settings/notifications
// ════════════════════════════════════════════════════════════════════════════
 
 

function buildUserFilter(body) {
  const { targetMode, factoryIds, factoryLocation, workLocations } = body;
 
  const filter = {
    isDeleted: false,
    isBlocked: false,
    status:    "active",
    isSystemAdmin: false,
  };
 
  switch (targetMode) {
 
    case "all":
      // no extra filters — send to everyone active
      break;
 
    case "by_factory":
      if (!factoryIds?.length) throw new AppError("factoryIds required for by_factory mode", 400);
      filter.factory = { $in: factoryIds };
      break;
 
    case "by_factory_worklocation":
      if (!factoryIds?.length)    throw new AppError("factoryIds required", 400);
      if (!workLocations?.length) throw new AppError("workLocations required", 400);
      filter.factory      = { $in: factoryIds };
      filter.workLocation = { $in: workLocations };
      if (factoryLocation) filter.factoryLocation = factoryLocation;
      break;
 
    case "by_worklocation":
      if (!workLocations?.length) throw new AppError("workLocations required", 400);
      filter.workLocation = { $in: workLocations };
      break;
 
    case "selective":
      // selective mode: frontend must pass userIds array
      if (!body.userIds?.length) throw new AppError("userIds required for selective mode", 400);
      filter._id = { $in: body.userIds };
      break;
 
    default:
      throw new AppError("Invalid targetMode", 400);
  }
 
  return filter;
}
 

router.post("/notifications/preview", wrap(async (req, res) => {
try {
  const filter = buildUserFilter(req.body);
 
  const users = await User.find(filter)
    .populate("factory", "name location")
    .select("name email factoryLocation workLocation status factory")
    .lean();
 
  return res.json({ success: true, users, total: users.length });
} catch (error) {
  console.error("Error generating notification preview:", error);
  return res.status(500).json({ success: false, message: "Server error" });
}
}));
 

router.post("/notifications/send", wrap(async (req, res) => {
  const { header, message: msgText } = req.body;
 
  if (!header?.trim())  return fail(res, "header is required");
  if (!msgText?.trim()) return fail(res, "message is required");
 
  const filter = buildUserFilter(req.body);
 
  // Fetch only IDs — we don't need full docs for the bulk update
  const users = await User.find(filter).select("_id").lean();
 
  if (!users.length) return fail(res, "No users matched the selected filters", 404);
 
  const notification = {
    header:    header.trim(),
    message:   msgText.trim(),
    isRead:    false,
    createdAt: new Date(),
  };
 

  const bulkOps = users.map(u => ({
    updateOne: {
      filter: { _id: u._id },
      update: {
        $push: {
          notifications: {
            $each:     [notification],
            $sort:     { createdAt: -1 },  // newest first
            $slice:    10,                  // keep only 10 latest
          },
        },
      },
    },
  }));
 
  const bulkResult = await User.bulkWrite(bulkOps, { ordered: false });
 
  ok(res, {
    sentCount:    bulkResult.modifiedCount,
    failedCount:  users.length - bulkResult.modifiedCount,
    total:        users.length,
  });
}));


router.get("/notifications/mine", wrap(async (req, res) => {
  const user = await User
    .findById(req.userId)
    .select("notifications")
    .lean();

  if (!user) return fail(res, "User not found", 404);

  const sorted = [...(user.notifications ?? [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.json({ success: true, sorted, total: sorted.length });
}));

router.get("/notifications/unread-count", wrap(async (req, res) => {
try {
  const user = await User
    .findById(req.userId)
    .select("notifications")
    .lean();

  if (!user) return fail(res, "User not found", 404);

  const count = (user.notifications ?? []).filter(n => !n.isRead).length;
  return res.json({ success: true, count });
} catch (error) {
  console.error("Error fetching unread notification count:", error);
  return res.status(500).json({ success: false, message: "Server error" });
}
}));


router.patch("/notifications/mark-read", wrap(async (req, res) => {
  await User.updateOne(
    { _id: req.userId },
    { $set: { "notifications.$[].isRead": true } }  // $[] updates all array elements
  );
  return res.json({ success: true, marked: true });
}));


router.patch("/notifications/mark-read/:notifId", wrap(async (req, res) => {
  const result = await User.updateOne(
    { _id: req.userId, "notifications._id": req.params.notifId },
    { $set: { "notifications.$.isRead": true } }  // $ is the positional operator
  );

  if (result.matchedCount === 0) return fail(res, "Notification not found", 404);
  ok(res, { marked: true });
}));


/** GET /api/settings/versions — all versions, newest first */
router.get("/versions", wrap(async (req, res) => {
  const { platform } = req.query;
  const filter = { isDeleted: false };
  if (platform) filter.platform = platform;
 
  const versions = await Version.find(filter).sort({ createdAt: -1 }).lean();
  ok(res, versions);
}));
 
router.get("/versions/active", wrap(async (req, res) => {
  const platform = req.query.platform ?? "web";
  const version  = await Version.findOne({ isActive: true, isDeleted: false, platform }).lean();
  if (!version) return fail(res, "No active version found", 404);
  ok(res, version);
}));
 
router.post("/versions", wrap(async (req, res) => {
  try {
  const { versionNumber, platform = "web" } = req.body;
 
  if (!versionNumber?.trim()) return fail(res, "versionNumber is required");
 
  const exists = await Version.findOne({ versionNumber: versionNumber.trim(), platform });
  if (exists) return fail(res, `Version ${versionNumber} already exists for ${platform}`, 409);
 
  const version = await Version.create({
    ...req.body,
    versionNumber: versionNumber.trim(),
  });
 
  return res.status(201).json({ success: true, data: version });
} catch (error) {
  console.error("Error creating version:", error);
  return res.status(500).json({ success: false, message: "Server error" });
}
}));
 
router.patch("/versions/:id", wrap(async (req, res) => {
  try {
  const allowed = [
    "versionNumber", "buildNumber", "releaseDate", "title",
    "description", "features", "bugFixes", "isForceUpdate", "isActive", "platform"
  ];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );
 
  const version = await Version.findByIdAndUpdate(
    req.params.id, updates, { new: true, runValidators: true }
  );
  if (!version) return res.status(404).json({ success: false, message: "Version not found" });
 
  return res.status(200).json({ success: true, data: version }  );
} catch (error) {
  console.error("Error updating version:", error);
  return res.status(500).json({ success: false, message: "Server error" });
}
}));
 
router.delete("/versions/:id", wrap(async (req, res) => {
  try {
  const version = await Version.findByIdAndUpdate(
    req.params.id, { isDeleted: true, isActive: false }, { new: true }
  );
  if (!version) return res.status(404).json({ success: false, message: "Version not found" });
  return res.status(200).json({ success: true, message: "Version deleted", data: { _id: req.params.id } });
} catch (error) {
  console.error("Error deleting version:", error);
  return res.status(500).json({ success: false, message: "Server error" });
}
}));
 

router.patch("/versions/:id/set-active", wrap(async (req, res) => {
  try {
  const newActive = await Version.findById(req.params.id);
  if (!newActive) return fail(res, "Version not found", 404);
 
  // 1. Deactivate all other versions for this platform
  await Version.updateMany(
    { _id: { $ne: newActive._id }, platform: newActive.platform },
    { $set: { isActive: false } }
  );
 
  // 2. Activate this one
  newActive.isActive = true;
  await newActive.save();
 
  // 3. Push update notification to all active, non-admin users
  const notification = {
    header:    `Update Available — v${newActive.versionNumber}`,
    message:   newActive.isForceUpdate
      ? `A required update (v${newActive.versionNumber}) is available. Please refresh to continue.`
      : `A new version (v${newActive.versionNumber}) is available. ${newActive.title ?? ""}`.trim(),
    isRead:    false,
    createdAt: new Date(),
  };
 
  await User.updateMany(
    { isDeleted: false, isBlocked: false, isSystemAdmin: false, status: "active" },
    {
      $push: {
        notifications: {
          $each:  [notification],
          $sort:  { createdAt: -1 },
          $slice: 10,
        },
      },
    }
  );
 
  ok(res, newActive);
} catch (error) {
  console.error("Error setting active version:", error);
  return res.status(500).json({ success: false, message: "Server error" });
}
}));
 
router.get("/versions/check", wrap(async (req, res) => {
  // read from header (preferred) OR fallback to query param
  const clientVersion = req.headers["x-app-version"] || req.query.v;
  const platform      = req.headers["x-app-platform"] || req.query.platform || "web";

  try {
    if (!clientVersion) return res.status(400).json({ success: false, message: "version header missing" });

    const latest = await Version.findOne({ isActive: true, isDeleted: false, platform }).lean();
    if (!latest) return res.status(200).json({ success: true, data: { upToDate: true } });

    const upToDate = latest.versionNumber === clientVersion;
    return res.status(200).json({ success: true, data: {
      upToDate,
      currentVersion: clientVersion,
      latestVersion:  latest.versionNumber,
      isForceUpdate:  !upToDate && latest.isForceUpdate,
      title:          latest.title,
      } 
    });
  } catch (error) {
    console.error("Error checking version:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  } 
}));

export default router;