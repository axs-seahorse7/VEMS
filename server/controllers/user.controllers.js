import userModel from "../db/models/User-Model/user.model.js";


export const getUsers = async (req, res) => {
    try {
        const data = await userModel
            .find({ isDeleted: false, isSystemAdmin: false })
            .select("-password")
            .populate("factory");
        return res.status(200).json({ users: data });
    } catch (err) {
        console.error("Error fetching users:", err);
        return res.status(500).json({ error: "Failed to fetch users" });
    }
};

// Soft delete — sets isDeleted: true instead of removing the document
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await userModel.findByIdAndUpdate(
            id,
            { isDeleted: true },
            { new: true }
        );
        if (!deleted) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({ message: "User deleted successfully" });
    } catch (err) {
        console.error("Error deleting user:", err);
        return res.status(500).json({ error: "Failed to delete user" });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, factoryLocation, workLocation, factory, status } = req.body;

        const updated = await userModel
            .findByIdAndUpdate(
                id,
                { name, email, factoryLocation, workLocation, factory, status },
                { new: true }
            )
            .select("-password")
            .populate("factory");

        if (!updated) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({ message: "User updated successfully", user: updated });
    } catch (err) {
        console.error("Error updating user:", err);
        return res.status(500).json({ error: "Failed to update user" });
    }
};

// Toggle block/unblock — flips isBlocked and syncs status field
export const toggleBlockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userModel.findById(id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const nowBlocked = !user.isBlocked;
        const updated = await userModel
            .findByIdAndUpdate(
                id,
                {
                    isBlocked: nowBlocked,
                    status: nowBlocked ? "inactive" : "active",
                },
                { new: true }
            )
            .select("-password")
            .populate("factory");

        return res.status(200).json({
            message: nowBlocked ? "User blocked successfully" : "User unblocked successfully",
            user: updated,
        });
    } catch (err) {
        console.error("Error toggling block:", err);
        return res.status(500).json({ error: "Failed to update user block status" });
    }
};