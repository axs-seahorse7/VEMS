import factoryModel from "../db/models/factory-model/factory.model.js";
import User from "../db/models/User-Model/user.model.js";
// controllers/siteController.js
import Site from "../db/models/Vehicle-Model/site.model.js";
import Block from "../db/models/Vehicle-Model/block.model.js";
import asyncHandler from "../middleware/Asynct-handler/asyncHandler.js";
import AppError from "../utils/AppError.js";


export const createFactory = async (req, res) => {
  try {
    const { name, location, contactNumber, email, factoryGioLocation, status, allowedSites, isIntraMovementAllowed } = req.body;

    if (!name || !location) {
      return res.status(400).json({ message: "Name and location are required" });
    }

    const intraAllowed = !!isIntraMovementAllowed;
    const safeAllowedSites = allowedSites || [];

    if (safeAllowedSites.length) {
      const sites = await Site.find({ _id: { $in: safeAllowedSites } });

      if (sites.length !== safeAllowedSites.length) {
        return res.status(400).json({ message: "One or more selected sites do not exist" });
      }
    }

    const newFactory = new factoryModel({
      name,
      location,
      contactNumber,
      email,
      factoryGioLocation,
      status: status || "active",
      allowedSites: safeAllowedSites,
      isIntraMovementAllowed: intraAllowed,
    });

    await newFactory.save();

    const populatedFactory = await factoryModel
      .findById(newFactory._id)
      .populate({
        path: "allowedSites",
        select: "name status supportsBlocks allowedBlocks",
        populate: { path: "allowedBlocks", select: "name isActive" },
      });

    return res.status(201).json({
      message: "Factory created successfully",
      success: true,
      factory: populatedFactory,
    });
  } catch (error) {
    console.error("Error creating factory:", error);
    return res.status(400).json({ message: error.message });
  }
};

export const updateFactory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, contactNumber, email, factoryGioLocation, status, allowedSites, isIntraMovementAllowed } = req.body;

    const existingFactory = await factoryModel.findOne({ _id: id, isDeleted: false });
    if (!existingFactory) {
      return res.status(404).json({ message: "Factory not found" });
    }

    if (allowedSites !== undefined && allowedSites.length) {
      const sites = await Site.find({ _id: { $in: allowedSites } });

      if (sites.length !== allowedSites.length) {
        return res.status(400).json({ message: "One or more selected sites do not exist" });
      }
    }

    const updateData = { name, location, contactNumber, email, factoryGioLocation, status };
    if (allowedSites !== undefined) updateData.allowedSites = allowedSites;
    if (isIntraMovementAllowed !== undefined) updateData.isIntraMovementAllowed = isIntraMovementAllowed;

    const updatedFactory = await factoryModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        updateData,
        { new: true, runValidators: true }
      )
      .populate({
        path: "allowedSites",
        select: "name status supportsBlocks allowedBlocks",
        populate: { path: "allowedBlocks", select: "name isActive" },
      });

    return res.status(200).json({ message: "Factory updated successfully", success: true, factory: updatedFactory });
  } catch (error) {
    console.error("Error updating factory:", error);
    return res.status(400).json({ message: error.message });
  }
};

export const getFactories = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const isAdmin = user && user.isSystemAdmin || user.role === "admin";
    const factories = await factoryModel
      .find({ isDeleted: isAdmin ? { $in: [true, false] } : false, status: isAdmin ? { $in: ["active", "inactive"] } : "active" })
      .populate({
        path: "allowedSites",
        select: "name status supportsBlocks allowedBlocks",
        populate: { path: "allowedBlocks", select: "name isActive" },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, factories });
  } catch (error) {
    console.error("Error fetching factories:", error);
    return res.status(400).json({ message: error.message });
  }
};

export const getFactoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const factory = await factoryModel
      .findOne({ _id: id, isDeleted: false })
      .populate({
        path: "allowedSites",
        select: "name status supportsBlocks allowedBlocks",
        populate: { path: "allowedBlocks", select: "name isActive" },
      });

    if (!factory) {
      return res.status(404).json({ message: "Factory not found" });
    }

    return res.status(200).json({ success: true, factory });
  } catch (error) {
    console.error("Error fetching factory:", error);
    return res.status(400).json({ message: error.message });
  }
};

export const getFactoriesByLocation = async (req, res) => {
    try {
        const { location } = req.query;
        if (!location) {
            return res.status(400).json({ message: "Location query parameter is required" });
        }

        const regexLocation = new RegExp(`^${location}$`, "i");

        const factories = await factoryModel.find({ location: regexLocation, isDeleted: false, status: "active" })
        return res.status(200).json({ success: true, factories });
    } catch (error) {
        console.error("Error getting factories by location:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ── Toggle active ↔ inactive ──────────────────────────────────────────────────
export const toggleFactoryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const factory = await factoryModel.findOne({ _id: id, isDeleted: false });
        if (!factory) {
            return res.status(404).json({ message: "Factory not found" });
        }
        factory.status = factory.status === "active" ? "inactive" : "active";
        await factory.save();
        return res.status(200).json({ message: `Factory marked as ${factory.status}`, success: true, factory });
    } catch (error) {
        console.error("Error toggling factory status:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ── Soft delete ───────────────────────────────────────────────────────────────
export const deleteFactory = async (req, res) => {
    try {
        const { id } = req.params;
        const factory = await factoryModel.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { isDeleted: true },
            { new: true }
        );
        if (!factory) {
            return res.status(404).json({ message: "Factory not found" });
        }
        return res.status(200).json({ message: "Factory deleted successfully", success: true });
    } catch (error) {
        console.error("Error deleting factory:", error);
        return res.status(500).json({ message: "Server error" });
    }
};



// ── Site Controllers ─────────────────────────────────────────────────────────

export const createSite = asyncHandler(async (req, res) => {
  const { name, supportsBlocks, allowedBlocks, status } = req.body;

  if (!name) {
    throw new AppError("Name is required", 400);
  }

  // Never persist allowedBlocks if the site doesn't support blocks
  const safeAllowedBlocks = supportsBlocks ? allowedBlocks || [] : [];

  if (safeAllowedBlocks.length) {
    const validCount = await Block.countDocuments({ _id: { $in: safeAllowedBlocks } });
    if (validCount !== safeAllowedBlocks.length) {
      throw new AppError("One or more selected blocks do not exist", 400);
    }
  }

  const site = await Site.create({
    name,
    supportsBlocks: !!supportsBlocks,
    allowedBlocks: safeAllowedBlocks,
    status: status || "active",
  });

  const populatedSite = await Site.findById(site._id).populate("allowedBlocks", "name isActive");

  res.status(201).json({
    success: true,
    message: "Site created successfully",
    data: populatedSite,
  });
});


export const getSites = asyncHandler(async (req, res) => {
  const { status, search } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (search) filter.name = { $regex: search, $options: "i" };

  const sites = await Site.find(filter)
    .populate("allowedBlocks", "name isActive")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: sites,
  });
});


export const getSiteById = asyncHandler(async (req, res) => {
  const site = await Site.findById(req.params.id).populate("allowedBlocks", "name isActive");

  if (!site) {
    throw new AppError("Site not found", 404);
  }

  res.status(200).json({
    success: true,
    data: site,
  });
});


export const updateSite = asyncHandler(async (req, res) => {
  const { name, supportsBlocks, allowedBlocks, status } = req.body;

  const site = await Site.findById(req.params.id);

  if (!site) {
    throw new AppError("Site not found", 404);
  }

  if (name !== undefined) site.name = name;
  if (status !== undefined) site.status = status;

  if (supportsBlocks !== undefined) {
    site.supportsBlocks = supportsBlocks;

    if (!supportsBlocks) {
      // turning support off always clears allowed blocks
      site.allowedBlocks = [];
    } else if (allowedBlocks !== undefined) {
      const validCount = await Block.countDocuments({ _id: { $in: allowedBlocks } });
      if (validCount !== allowedBlocks.length) {
        throw new AppError("One or more selected blocks do not exist", 400);
      }
      site.allowedBlocks = allowedBlocks;
    }
  } else if (allowedBlocks !== undefined && site.supportsBlocks) {
    const validCount = await Block.countDocuments({ _id: { $in: allowedBlocks } });
    if (validCount !== allowedBlocks.length) {
      throw new AppError("One or more selected blocks do not exist", 400);
    }
    site.allowedBlocks = allowedBlocks;
  }

  await site.save();

  const populatedSite = await Site.findById(site._id).populate("allowedBlocks", "name isActive");

  res.status(200).json({
    success: true,
    message: "Site updated successfully",
    data: populatedSite,
  });
});


export const deleteSite = asyncHandler(async (req, res) => {
  const site = await Site.findByIdAndDelete(req.params.id);

  if (!site) {
    throw new AppError("Site not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "Site deleted successfully",
  });
});

// ── Block Controllers ───────────────────────────────────────────────────────

export const createBlock = asyncHandler(async (req, res) => {
  try {
  const { name, siteId, factoryId, isActive } = req.body;

  if (!name) {
    throw new AppError("Name is required", 400);
  }

  const block = await Block.create({ name, isActive });

  return res.status(201).json({
    success: true,
    message: "Block created successfully",
    data: block,
  });
  } catch (error) {
    console.error("Error creating block:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

export const getBlocks = asyncHandler(async (req, res) => {
  try {
  const { factoryId, siteId, isActive, search } = req.query;

  const filter = {};
  if (isActive !== undefined) filter.isActive = isActive === "true";
  if (search) filter.name = { $regex: search, $options: "i" };

  const blocks = await Block.find(filter)
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    data: blocks,
  });
  } catch (error) {
    console.error("Error fetching blocks:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

export const getBlockById = asyncHandler(async (req, res) => {
  try {
    const block = await Block.findById(req.params.id);

    if (!block) {
      throw new AppError("Block not found", 404);
    }

    return  res.status(200).json({
      success: true,
      data: block,
    });
  } catch (error) {
    console.error("Error fetching block:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

export const updateBlock = asyncHandler(async (req, res) => {
  try {
  const { name, isActive } = req.body;

  const block = await Block.findById(req.params.id);

  if (!block) {
    throw new AppError("Block not found", 404);
  }

  if (name !== undefined) block.name = name;
  if (isActive !== undefined) block.isActive = isActive;

  await block.save();

  return res.status(200).json({
    success: true,
    message: "Block updated successfully",
    data: block,
  });
  } catch (error) {
    console.error("Error updating block:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

export const deleteBlock = asyncHandler(async (req, res) => {
  try {
    const block = await Block.findByIdAndDelete(req.params.id);

    if (!block) {
      throw new AppError("Block not found", 404);
    }

    return res.status(200).json({
      success: true,
      message: "Block deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting block:", error);
    return res.status(500).json({ message: "Server error" });
  }
});