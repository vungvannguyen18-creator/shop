const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const { verifyToken, verifyAdmin } = require("../middleware/verifyToken");

const VIETQR_ACCOUNT = "100872584135";
const VIETQR_BANK = "ICB";
const VIETQR_NAME = "NGUYEN VAN VUNG";
const SEPAY_API_KEY = process.env.SEPAY_API_KEY || "ONEVORA_BRAND_2026";

const getQRLink = (amount, readableId) => {
  return `https://img.vietqr.io/image/${VIETQR_BANK}-${VIETQR_ACCOUNT}-compact.png?amount=${amount}&addInfo=Thanh toan don hang ${readableId}&accountName=${encodeURIComponent(VIETQR_NAME)}`;
};

// Admin: Lấy tất cả đơn hàng
router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const orders = await Order.find().populate("user", "username email role").sort({ createdAt: -1 });
    
    // Bảo mật: Nếu không phải super_admin, ẩn giá vốn (cost)
    if (req.user.role !== 'super_admin') {
      const safeOrders = orders.map(o => {
        const obj = o.toObject();
        if (obj.items) {
          obj.items = obj.items.map(it => { delete it.cost; return it; });
        }
        return obj;
      });
      return res.json(safeOrders);
    }
    
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// User: Lấy đơn hàng của tôi
router.get("/my", verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    const formattedOrders = orders.map(order => {
      const orderObj = order.toObject();
      orderObj.paymentQR = getQRLink(order.total, order.readableId || order._id);
      return orderObj;
    });
    res.json(formattedOrders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// User: Tạo đơn hàng mới
router.post("/", verifyToken, async (req, res) => {
  try {
    const { items, total, address, customerName, customerPhone, note, paymentMethod } = req.body;
    if (!items || items.length === 0 || !total) {
      return res.status(400).json({ message: "Dữ liệu đơn hàng không hợp lệ" });
    }

    // Lấy thông tin sản phẩm và giá vốn hiện tại
    const orderItems = await Promise.all(items.map(async item => {
      const product = await Product.findById(item.productId || item.id);
      return {
        productId: product?._id || item.productId,
        name: item.name || product?.name,
        price: item.price || product?.price,
        quantity: item.quantity || 1,
        selectedSize: item.selectedSize || 'Free Size',
        selectedColor: item.selectedColor || 'Default',
        cost: product ? (product.cost || Math.floor(product.price * 0.7)) : Math.floor(item.price * 0.7)
      };
    }));

    // Tạo readableId (OV + timestamp)
    const timestamp = Date.now();
    const readableId = "OV" + (timestamp % 100000).toString().padStart(5, '0');

    const order = new Order({ 
      readableId,
      user: req.user.id, 
      items: orderItems, 
      total, 
      address,
      customerName,
      customerPhone,
      note,
      paymentMethod: paymentMethod || "cod",
      paymentStatus: paymentMethod === 'bank' ? 'pending' : 'cod_pending'
    });
    
    await order.save();

    const orderObj = order.toObject();
    orderObj.paymentQR = getQRLink(order.total, order.readableId);
    res.json(orderObj);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi tạo đơn hàng" });
  }
});

// Admin: Cập nhật trạng thái đơn hàng (với State Machine & Audit Log)
router.put("/:id/status", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Đơn hàng không tồn tại" });

    const validStatuses = ['pending', 'processing', 'shipping', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    // Ràng buộc luồng (State Machine)
    const flow = {
        'pending': ['processing', 'cancelled'],
        'processing': ['shipping', 'cancelled'],
        'shipping': ['completed', 'cancelled'],
        'completed': [],
        'cancelled': []
    };

    const currentStatus = order.status || 'pending';
    if (currentStatus !== status) {
        const allowedNext = flow[currentStatus] || [];
        if (!allowedNext.includes(status)) {
           return res.status(400).json({ message: `Không thể chuyển từ '${currentStatus}' sang '${status}'.`});
        }
        
        // Ghi Audit Log
        order.auditLog.push({
            action: `${currentStatus} -> ${status}`,
            handledBy: req.user.username || "Admin",
            details: `Trạng thái thay đổi bởi Admin`
        });
        
        order.status = status;
        await order.save();
    }

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi cập nhật trạng thái" });
  }
});

// Webhook: Tự động xác nhận thanh toán (SePay/VietQR)
router.post("/webhook", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && !authHeader.includes(SEPAY_API_KEY)) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const content = req.body.content || req.body.description;
  const amount = req.body.transferAmount || req.body.amount;

  if (!content) return res.status(400).json({ success: false, message: "Thiếu nội dung" });

  const regex = /OV\d{5,}/;
  const matchCode = content.match(regex);
  const searchableId = matchCode ? matchCode[0] : null;

  if (!searchableId) return res.status(400).json({ success: false, message: "Mã đơn hàng không hợp lệ" });

  try {
    const order = await Order.findOne({ readableId: searchableId });
    if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });

    if (order.paymentStatus === 'paid') return res.json({ success: true, message: "Đã thanh toán trước đó" });

    if (amount && Number(amount) < order.total) {
      return res.status(400).json({ success: false, message: "Số tiền không đủ" });
    }

    order.paymentStatus = 'paid';
    order.auditLog.push({
      action: "Payment Verified via Webhook",
      handledBy: "System (Auto)",
      details: `Giao dịch: ${content}, Số tiền: ${amount}`
    });

    await order.save();
    res.json({ success: true, message: "Xác nhận thành công" });
  } catch (e) {
    res.status(500).json({ success: false, message: "Lỗi xử lý Webhook" });
  }
});

// Admin: Xóa đơn hàng (Chỉ Super Admin)
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: "Hành động này yêu cầu quyền Super Admin" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "Đã xóa đơn hàng thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa đơn hàng" });
  }
});

module.exports = router;
