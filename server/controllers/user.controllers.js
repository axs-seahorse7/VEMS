import userModel from "../db/models/User-Model/user.model.js";


export const getUsers = async (req, res) => {
    try {
      const data = await userModel.find().select("-password").populate("factory");
      const excludeAdmin = data.filter(user => !user.isSystemAdmin);
     return res.status(200).json({ users: excludeAdmin });
    } catch (err) {
        console.error("Error fetching users:", err);
        return res.status(500).json({ error: "Failed to fetch users" });
    }
}

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await userModel.findByIdAndDelete(id);
        if(!deleted) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({ message: "User deleted successfully" });
    } catch (err) {
        console.error("Error deleting user:", err);
        return res.status(500).json({ error: "Failed to delete user" });
    }
}

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, factoryLocation, workLocation, factory } = req.body;
        const updated = await userModel.findByIdAndUpdate(id, { name, email, role, factoryLocation, workLocation, factory }, { new: true }).select("-password").populate("factory");
        if(!updated) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({ message: "User updated successfully", user: updated });
    } catch (err) {
        console.error("Error updating user:", err);
        return res.status(500).json({ error: "Failed to update user" });
    }
}