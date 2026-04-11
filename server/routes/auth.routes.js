import e from "express";
import { loginUser, createUser, getMe, logoutUser } from "../controllers/auth.controllers.js";
import { isAuthenticated } from "../middleware/isAuth/isAuthenticated.js";

const router = e.Router()

router.get("/me", isAuthenticated, getMe);
router.post("/login", loginUser);
router.post("/logout", isAuthenticated, logoutUser);
router.post("/register", isAuthenticated, createUser);

export default router