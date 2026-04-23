require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const uploadRoutes = require("./routes/upload");
const orderRoutes = require("./routes/orders");
const userRoutes = require("./routes/users");
const voucherRoutes = require("./routes/vouchers");
const wishlistRoutes = require("./routes/wishlist");
const categoryRoutes = require("./routes/categories");

const app = express();
const PORT = process.env.PORT || 3000;

const Visit = require("./models/Visit");

// 0. Middleware Theo dõi lượt truy cập (Visits Tracker)
app.use(async (req, res, next) => {
  // Chỉ tính lượt truy cập vào các route chính, tránh track file tĩnh hoặc API phụ
  if (req.method === "GET" && (req.path === "/" || req.path.includes("/api/products"))) {
    try {
      const today = new Date().toISOString().split("T")[0];
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

      await Visit.findOneAndUpdate(
        { date: today },
        { 
          $inc: { count: 1 },
          $addToSet: { uniqueIps: ip } 
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error("Lỗi track lượt truy cập:", err);
    }
  }
  next();
});

// 1. Middleware Bảo mật (Headers)
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// 2. Chống NoSQL Injection
app.use(mongoSanitize());

// 3. Chống XSS (Data sanitization)
app.use(xss());

// 4. Chống HTTP Parameter Pollution
app.use(hpp());

// 5. Rate Limiting toàn cục
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 200, // Tăng nhẹ cho toàn cục
  message: { message: "Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút." },
  standardHeaders: true, 
  legacyHeaders: false,
});
app.use("/api", limiter);

// 6. Giới hạn kích thước Body (Body parser)
app.use(express.json({ limit: "10kb" }));

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Tạo thư mục uploads
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use("/uploads", express.static(uploadDir));

// Đăng ký Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/categories", categoryRoutes);

const { verifyToken, verifyAdmin } = require("./middleware/verifyToken");

app.get("/api/stats/visits", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const stats = await Visit.findOne({ date: today });
    const allStats = await Visit.find().sort({ date: -1 }).limit(7);
    
    res.json({
      today: stats ? stats.count : 0,
      todayUnique: stats ? stats.uniqueIps.length : 0,
      history: allStats
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi tải thống kê" });
  }
});

// Mock Settings (Tạm thời dùng chung với logic cũ hoặc lưu DB sau)
app.get("/api/settings", (req, res) => {
  res.json({
    freeShipThreshold: 500000,
    maintenanceMode: false,
    announcement: "Chào mừng bạn đến với ONEVORA!"
  });
});

app.get("/", (req, res) => {
  res.send("ONEVORA Backend is running on MongoDB Mode");
});

// Xử lý lỗi tập trung
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Đã xảy ra lỗi hệ thống!" });
});

mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/fashion-shop")
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(error => {
    console.error("❌ MongoDB connection error:", error);
  });
