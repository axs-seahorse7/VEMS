import User from "../db/models/User-Model/user.model.js";
import bcrypt from "bcryptjs";

export const createAdmin = async () => {
  console.log("🔥 createAdmin file loaded");
  try {
    const adminEmail = "admin@example.com"; // change if needed

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log("⚠️ Admin already exists");
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("admin123", 10);

    // Create admin
    const admin = await User.create({
      name: "System Admin",
      email: adminEmail,
      password: hashedPassword,
      isSystemAdmin: true,
      factoryLocation: "NGM", // default, can be updated later
      workLocation: "atGate" // default, can be updated later
    });

    console.log("✅ Admin created successfully");
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: admin123`);

  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
  }
};