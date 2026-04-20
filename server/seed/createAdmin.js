import User from "../db/models/User-Model/user.model.js";
import bcrypt from "bcryptjs";

export const createAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log("⚠️ Admin already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await User.create({
      name: "System Admin",
      email: adminEmail,
      password: hashedPassword,
      isSystemAdmin: true,
      factoryLocation: "NGM",
      workLocation: "atGate"
    });

    console.log("✅ Admin user created:", adminEmail);
  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
  }
};