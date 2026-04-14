import mongoose from "mongoose";
import User from "../db/models/User-Model/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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

export const loginUser = async (req, res) => {
  
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Check user
    const user = await User.findOne({ email }).populate("factory", "name location");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" } 
    );

    // Set cookie (IMPORTANT)
    res.cookie("token", token, {
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production", 
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 24 * 60 * 60 * 1000, 
    });

    // Send minimal response
   return res.status(200).json({
      message: "Login successful",
      success: true,
      user,
    });

  } catch (error) {
  return  res.status(500).json({ message: "Server error" });
  }
};

export const logoutUser = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
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

