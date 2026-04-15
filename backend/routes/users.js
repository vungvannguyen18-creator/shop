const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { verifyToken, verifyAdmin } = require("../middleware/verifyToken");

// Admin: Lấy danh sách người dùng
router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Khách hàng: Cập nhật thông tin cá nhân (Onboarding)
router.put("/profile", verifyToken, async (req, res) => {
    try {
        const { fullName, phone, address } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });

        user.fullName = fullName || user.fullName;
        user.phone = phone || user.phone;
        user.address = address || user.address;
        user.isProfileComplete = true;

        await user.save();
        res.json({ message: "Cập nhật hồ sơ thành công", user: { username: user.username, role: user.role, isProfileComplete: true } });
    } catch (e) {
        res.status(500).json({ message: "Lỗi cập nhật hồ sơ" });
    }
});

// Admin: Thay đổi quyền hạn (Chỉ Super Admin mới được đổi quyền người khác)
router.patch("/:id/role", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    
    // Bảo vệ Super Admin tối cao
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Hành động này yêu cầu quyền Siêu quản trị viên" });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: "Người dùng không tồn tại" });

    if (targetUser.username.toLowerCase() === 'vung1602') {
        return res.status(400).json({ message: "Không thể thay đổi quyền của quản trị viên tối cao" });
    }

    targetUser.role = role;
    await targetUser.save();
    
    res.json({ message: `Đã cập nhật quyền thành ${role}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
