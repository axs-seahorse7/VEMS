import mongoose from "mongoose";
import User from "../db/models/User-Model/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendMail } from "../services/sendMaile.js";
import { emailTemplates } from "../Templates/Emails/emailsTemplates.js";

export const createUser = async (req, res) => {
  const {  email, password, } = req.body;
  console.log("Creating user:", req.body);
  try {
    const emailInLower = email.toLowerCase();

    const existingUser = await User.findOne({ email: emailInLower });
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
      email: emailInLower,
      workLocation: req.body.role === "admin"? null : req.body.workLocation, // Set workLocation to null for admin
      password: hashedPassword,
    });
    
    await newUser.save();
   return res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Error creating user:", error);
   return res.status(400).json({ message: error.message });
  }
};

const otpStore = new Map();

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
    const emailInLower = email.toLowerCase();
    const user = await User.findOne({ email: emailInLower }).populate("factory", "name location");
    if (!user) {
      return res.status(401).json({ success: false, message: "User not registered" });
    }



    if(user.isBlocked){
      return res.status(403).json({ success: false, message: "Your account is blocked. Please contact support." });
    }


    console.log("User found for login:", { email: user.email, id: user._id });

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.warn(`Invalid password attempt for email: ${email}`);
      return res.status(401).json({ success: false, message: "Invalid Password" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store OTP against email
    otpStore.set(emailInLower, { otp, expiresAt, userId: user._id });

    // Send OTP email
    await sendMail({
      to: emailInLower,
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

    const emailInLower = email.toLowerCase();
    const record = otpStore.get(emailInLower);

    // Check existence
    if (!record) {
      return res.status(400).json({ success: false, message: " OTP not Matched. Please resend and continue" });
    }

    // Check expiry
    if (Date.now() > record.expiresAt) {
      otpStore.delete(emailInLower);
      return res.status(400).json({ success: false, message: "OTP has expired. Please login again." });
    }

    // Check match
    if (record.otp !== otp) {
      return res.status(401).json({ success: false, message: "Invalid OTP. Please try again." });
    }

    // OTP valid — clean up
    otpStore.delete(emailInLower);

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
    const emailInLower = email.toLowerCase();
    const existing = otpStore.get(emailInLower);
    if (!existing) {
      console.warn(`Resend OTP requested for email with no existing OTP: ${email}`);
      return res.status(400).json({ success: false, message: "Session expired. Please login again." });
    }

    const user = await User.findById(existing.userId);

    // Generate fresh OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    otpStore.set(emailInLower, { otp, expiresAt, userId: existing.userId });

    await sendMail({
      to: emailInLower,
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


export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: "currentPassword and newPassword are required" });

    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Your current password is invalid." });

    const sameAsOld = await bcrypt.compare(newPassword, user.password);
    if (sameAsOld) return res.status(400).json({ success: false, message: "New password must be different from current password" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const searchUsers = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || !email.trim())
      return res.status(400).json({ success: false, message: "email query param is required" });

    const admin = await User.findById(req.userId);

    if(!admin) return res.status(404).json({ success: false, message: "Not Authenticated, please login." });

    const adminFactoryId = !admin?.isSystemAdmin ? admin.factory : null;    
    if (!adminFactoryId && !admin?.isSystemAdmin) return res.status(403).json({ success: false, message: "No factory associated with this account" });

    const safeEmail = escapeRegex(email.trim());

    let users = null;

    if (admin.isSystemAdmin) {
      users = await User.find({
        email: { $regex: safeEmail, $options: "i" },
        role: { $ne: "admin" },
        isBlocked: false,
      })
      .select("name email role factory")
      .populate("factory", "name location")
      .limit(20)
      .lean();
    }else {
     users = await User.find({
        factory: adminFactoryId,
        email: { $regex: safeEmail, $options: "i" },
        isBlocked: false,
        role: { $ne: "admin" }
      })
      .select("name email role factory")
      .populate("factory", "name location")
      .limit(20)
      .lean();
    }

    const normalized = users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      factoryName: u.factory?.name ?? null,
    }));

    return res.json({ success: true, data: normalized, total: normalized.length });
  } catch (error) {
    console.error("Error searching users:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const { id } = req.params;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "newPassword must be at least 6 characters",
      });
    }

    const admin = await User.findById(req.userId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let targetUser;

    if (admin.isSystemAdmin) {
      // system admin can target anyone EXCEPT admins
      targetUser = await User.findById(id);
    } else {
      if (!admin.factory) {
        return res.status(403).json({
          success: false,
          message: "No factory associated with this account",
        });
      }

      targetUser = await User.findOne({
        _id: id,
        factory: admin.factory,
      });
    }

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Target user not found",
      });
    }

    // Nobody can reset admin passwords (except if later you change business rule)
    if (targetUser.role === "admin" && !admin.isSystemAdmin) {
      return res.status(403).json({
        success: false,
        message: "Admin password cannot be reset",
      });
    }

    targetUser.password = await bcrypt.hash(newPassword, 10);
    await targetUser.save();

    return res.json({
      success: true,
      message: `Password updated for ${targetUser.name}`,
    });

  } catch (error) {
    console.error("Error resetting user password:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};