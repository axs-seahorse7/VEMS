import mongoose from "mongoose";
import User from "../db/models/User-Model/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendMail } from "../services/sendMaile.js";
import { emailTemplates } from "../Templates/Emails/emailsTemplates.js";

export const createUser = async (req, res) => {
  const {  email, password, } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.warn(`Attempt to register with existing email: ${email}`);
      return res.status(400).json({ message: "User already exists" });
    }
    // Hash the password    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // Create new user
    const newUser = new User({
      ...req.body,
      password: hashedPassword,
    });
    
    await newUser.save();
   return res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Error creating user:", error);
   return res.status(400).json({ message: error.message });
  }
};

// ─── In-memory OTP store (swap for Redis in production) ───
const otpStore = new Map();
// Structure: { [email]: { otp, expiresAt, userId } }

// ─────────────────────────────────────────
// STEP 1: Validate credentials → send OTP
// POST /auth/login
// ─────────────────────────────────────────
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    // Check user
    const user = await User.findOne({ email }).populate("factory", "name location");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn(`Failed login attempt for email: ${email}`);
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store OTP against email
    otpStore.set(email, { otp, expiresAt, userId: user._id });

    // Send OTP email
    await sendMail({
      to: email,
      type: "OTP",
      payload: { name: user.name, otp },
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent to your registered email.",
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────
// STEP 2: Verify OTP → issue token
// POST /auth/verify-otp
// ─────────────────────────────────────────
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const record = otpStore.get(email);

    // Check existence
    if (!record) {
      return res.status(400).json({ success: false, message: "No OTP found. Please login again." });
    }

    // Check expiry
    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ success: false, message: "OTP has expired. Please login again." });
    }

    // Check match
    if (record.otp !== otp) {
      return res.status(401).json({ success: false, message: "Invalid OTP. Please try again." });
    }

    // OTP valid — clean up
    otpStore.delete(email);

    // Fetch full user
    const user = await User.findById(record.userId).populate("factory", "name location");

    // Issue JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.SERVER_ENV === "production",
      sameSite: process.env.SERVER_ENV === "production" ? "none" : "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user,
    });

  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────
// RESEND OTP
// POST /auth/resend-otp
// ─────────────────────────────────────────
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // User must have attempted login already
    const existing = otpStore.get(email);
    if (!existing) {
      return res.status(400).json({ success: false, message: "Session expired. Please login again." });
    }

    const user = await User.findById(existing.userId);

    // Generate fresh OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    otpStore.set(email, { otp, expiresAt, userId: existing.userId });

    await sendMail({
      to: email,
      type: "OTP",
      payload: { name: user.name, otp },
    });

    return res.status(200).json({ success: true, message: "OTP resent successfully." });

  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const logoutUser = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.SERVER_ENV === "production",
    sameSite: process.env.SERVER_ENV === "production" ? "none" : "strict",
  });

  return res.json({ message: "Logged out successfully" });
};

export const getMe = async (req, res) => {
  try {
    const userId = req.userId; // from auth middleware

    if (!userId) {
      console.warn("getMe: No userId in request");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId).select("-password").populate("factory", "name location");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

   return res.status(200).json({ user });
  } catch (error) {
    console.error("getMe error:", error);
   return res.status(500).json({ message: "Server error" });
  }
};

