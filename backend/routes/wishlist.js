const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { verifyToken } = require("../middleware/verifyToken");

// Lấy danh sách yêu thích
router.get("/", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate("wishlist");
        res.json(user.wishlist);
    } catch (e) {
        res.status(500).json({ message: "Lỗi lấy danh sách yêu thích" });
    }
});

// Thêm/Xóa khỏi danh sách yêu thích (Toggle)
router.post("/toggle", verifyToken, async (req, res) => {
    try {
        const { productId } = req.body;
        const user = await User.findById(req.user.id);
        
        const index = user.wishlist.indexOf(productId);
        if (index === -1) {
            user.wishlist.push(productId);
            await user.save();
            res.json({ message: "Đã thêm vào yêu thích", status: "added" });
        } else {
            user.wishlist.splice(index, 1);
            await user.save();
            res.json({ message: "Đã xóa khỏi yêu thích", status: "removed" });
        }
    } catch (e) {
        res.status(500).json({ message: "Lỗi xử lý danh sách yêu thích" });
    }
});

module.exports = router;
