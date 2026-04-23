const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const { verifyToken, verifyAdmin } = require("../middleware/verifyToken");

// Lấy danh sách danh mục
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Lỗi tải danh mục" });
  }
});

// Admin: Thêm danh mục mới
router.post("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, subcategories } = req.body;
    const existing = await Category.findOne({ name });
    if (existing) return res.status(400).json({ message: "Danh mục này đã tồn tại" });

    const category = new Category({ name, subcategories });
    await category.save();
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lưu danh mục" });
  }
});

// Admin: Xóa danh mục
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: "Đã xóa danh mục" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xóa danh mục" });
  }
});

module.exports = router;
