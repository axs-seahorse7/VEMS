import User from "../db/models/User-Model/user.model.js";
import bcrypt from "bcryptjs";

export const createAdmin = async () => {
  console.log("🔥 createAdmin file loaded");
  try {
    const adminEmail = process.env.ADMIN_EMAIL; // change if needed
    const adminPassword = process.env.ADMIN_PASSWORD; // change if needed

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log("⚠️ Admin already exists");
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin
    const admin = await User.create({
      name: "System Admin",
      email: adminEmail,
      password: hashedPassword,
      isSystemAdmin: true,
      factoryLocation: "NGM", // default, can be updated later
      workLocation: "atGate" // default, can be updated later
    });

    console.log("✅ Admin user created:", adminEmail);
    return res.status(201).json({ message: "Admin user created successfully" });
  } catch (error) {
    console.error(" Error creating admin:", error.message);
    return res.status(500).json({ message: "Failed to create admin", error: error.message });
  }
};