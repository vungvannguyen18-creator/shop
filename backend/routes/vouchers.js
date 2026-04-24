const express = require("express");
const router = express.Router();
const { Voucher, UserVoucher } = require("../models/Voucher");
const { verifyToken, verifyAdmin } = require("../middleware/verifyToken");

// Khách hàng: Lấy danh sách voucher công khai (banner)
router.get("/public", async (req, res) => {
  try {
    const vouchers = await Voucher.find({ active: true, isPublic: true });
    res.json(vouchers);
  } catch (error) {
    res.status(500).json({ message: "Lỗi tải voucher công khai" });
  }
});

// Khách hàng: Lưu voucher vào ví
router.post("/save", verifyToken, async (req, res) => {
  try {
    const { code } = req.body;
    const existing = await UserVoucher.findOne({ userId: req.user.id, voucherCode: code.toUpperCase() });
    if (existing) return res.status(400).json({ message: "Bạn đã lưu mã này rồi!" });

    const uv = new UserVoucher({ userId: req.user.id, voucherCode: code.toUpperCase() });
    await uv.save();
    res.json({ message: "Đã lưu voucher vào ví của bạn" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi lưu voucher" });
  }
});

// Khách hàng: Xem ví voucher
router.get("/my", verifyToken, async (req, res) => {
  try {
    const userVouchers = await UserVoucher.find({ userId: req.user.id });
    const codes = userVouchers.map(uv => uv.voucherCode);
    const vouchers = await Voucher.find({ code: { $in: codes } });
    res.json(vouchers);
  } catch (error) {
    res.status(500).json({ message: "Lỗi tải ví voucher" });
  }
});

// Admin: Danh sách tất cả voucher
router.get("/admin", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const vouchers = await Voucher.find().sort({ createdAt: -1 });
    res.json(vouchers);
  } catch (error) {
    res.status(500).json({ message: "Lỗi tải danh sách admin" });
  }
});

// Admin: Tạo voucher mới
router.post("/create", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const voucher = new Voucher(req.body);
    await voucher.save();
    res.json({ message: "Tạo voucher thành công", voucher });
  } catch (error) {
    res.status(500).json({ message: "Lỗi tạo voucher (Mã có thể bị trùng)" });
  }
});

// Admin: Bật/Tắt trạng thái voucher
router.patch("/:code/toggle", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const v = await Voucher.findOne({ code: req.params.code });
    if (!v) return res.status(404).json({ message: "Không tìm thấy mã" });
    v.active = !v.active;
    await v.save();
    res.json({ message: "Cập nhật trạng thái thành công", active: v.active });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật" });
  }
});

// Admin: Xóa voucher
router.delete("/:code", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const deleted = await Voucher.findOneAndDelete({ code: req.params.code });
    if (!deleted) return res.status(404).json({ message: "Không tìm thấy mã để xóa" });
    res.json({ message: "Đã xóa voucher thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa voucher" });
  }
});

module.exports = router;
