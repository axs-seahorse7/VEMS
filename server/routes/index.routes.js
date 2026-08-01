import express from "express";
import {
    createFactory,
    getFactories,
    getFactoryById,
    updateFactory,
    toggleFactoryStatus,
    deleteFactory,
    getFactoriesByLocation,

    createSite,
    getSites,
    getSiteById,
    updateSite,
    deleteSite,

    createBlock,
    getBlocks,
    getBlockById,
    updateBlock,
    deleteBlock
} from "../controllers/factory.contoller.js";
import { isAuthenticated } from "../middleware/isAuth/isAuthenticated.js";

const router = express.Router();


// ── Factory ───────────────────────────────────────────────────────────────────
router.post  ("/factory",                     isAuthenticated, createFactory);
router.put   ("/factory/:id",                 isAuthenticated, updateFactory);
router.patch ("/factory/:id/status",          isAuthenticated, toggleFactoryStatus);
router.delete("/factory/:id",                 isAuthenticated, deleteFactory);

router.get   ("/factory/:id",                 isAuthenticated, getFactoryById);
router.get   ("/factories",                   isAuthenticated, getFactories);
router.get   ("/factories-by-location",       isAuthenticated, getFactoriesByLocation);


// ── Site ───────────────────────────────────────────────────────────────────
router.post  ("/site",                        isAuthenticated, createSite);
router.put   ("/site/:id",                    isAuthenticated, updateSite);
router.delete("/site/:id",                    isAuthenticated, deleteSite);

router.get   ("/site/:id",                    isAuthenticated, getSiteById);
router.get   ("/sites",                       isAuthenticated, getSites);

// ── Block ───────────────────────────────────────────────────────────────────
router.post  ("/block",                       isAuthenticated, createBlock);
router.put   ("/block/:id",                   isAuthenticated, updateBlock);
router.delete("/block/:id",                   isAuthenticated, deleteBlock);

router.get   ("/block/:id",                   isAuthenticated, getBlockById);
router.get   ("/blocks",                      isAuthenticated, getBlocks);

export default router;