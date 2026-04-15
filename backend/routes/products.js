const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Order = require("../models/Order");
const rateLimit = require("express-rate-limit");
const { verifyToken, verifyAdmin } = require("../middleware/verifyToken");

// Chống spam đánh giá: 3 lần/tiếng
const reviewLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: "Bạn gửi đánh giá quá nhanh. Vui lòng quay lại sau 1 giờ."
});

// Khách hàng: Lấy danh sách sản phẩm
router.get("/", async (req, res) => {
  try {
    const data = await Product.find().sort({ createdAt: -1 });
    
    // Bảo mật: Ẩn giá vốn đối với người không phải super_admin
    const cleanData = data.map(p => {
      const obj = p.toObject();
      delete obj.cost;
      return obj;
    });
    
    res.json(cleanData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Admin: Lấy danh sách sản phẩm đầy đủ (bao gồm giá vốn)
router.get("/admin", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const data = await Product.find().sort({ createdAt: -1 });
        if (req.user.role !== 'super_admin') {
            return res.json(data.map(p => { const o = p.toObject(); delete o.cost; return o; }));
        }
        res.json(data);
    } catch (e) {
        res.status(500).json({ message: "Lỗi server" });
    }
});

// Admin: Thêm sản phẩm
router.post("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Admin: Cập nhật sản phẩm
router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Admin: Xóa sản phẩm
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const removed = await Product.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    res.json({ message: "Xóa thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Khách hàng: Gửi đánh giá sản phẩm (chỉ khi đã mua hàng thành công)
router.post("/:id/reviews", verifyToken, reviewLimiter, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

        const { text, rating } = req.body;
        if (!text) return res.status(400).json({ message: "Nội dung đánh giá không được để trống" });

        // Kiểm tra xem user đã từng mua sản phẩm này chưa
        const orders = await Order.find({ 
            user: req.user.id, 
            status: { $in: ['completed', 'shipping'] },
            'items.productId': req.params.id
        });

        const isVerified = orders.length > 0;

        const newReview = {
            user: req.user.username,
            text,
            rating: Number(rating) || 5,
            verified: isVerified
        };

        product.reviews.unshift(newReview);
        await product.save();

        res.json({ message: "Cảm ơn bạn đã đánh giá!", review: newReview });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "LỗI hệ thống khi gửi đánh giá" });
    }
});

module.exports = router;
