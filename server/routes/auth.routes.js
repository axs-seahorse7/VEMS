import e from "express";
import { loginUser, verifyOtp, resendOtp, createUser, getMe, logoutUser, changePassword, searchUsers, resetUserPassword } from "../controllers/auth.controllers.js";
import { isAuthenticated } from "../middleware/isAuth/isAuthenticated.js";

const router = e.Router()

router.post("/login", loginUser);
router.get("/me", isAuthenticated, getMe);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/logout", isAuthenticated, logoutUser);
router.post("/register", isAuthenticated, createUser);
router.post("/change-password", isAuthenticated, changePassword);
router.get("/users/search", isAuthenticated, searchUsers);
router.patch("/users/:id/password", isAuthenticated, resetUserPassword);

export default router