const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Giới hạn cho các luồng xác thực: 5 lần thử/10 phút
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 5,
  message: "Quá nhiều lần thử đăng nhập thất bại. Vui lòng quay lại sau 10 phút."
});

router.post("/register", authLimiter, async (req, res) => {
  try {
    const { username, password, email } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Vui lòng nhập username và password" });
    }

    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ message: "Tài khoản đã tồn tại" });

    const hashed = await bcrypt.hash(password, 10);
    const role = (username.toLowerCase() === "admin" || username.toLowerCase() === "vung1602") ? "admin" : "user";
    const user = new User({ username, email: email || `${username}@fashionmodern.vn`, password: hashed, role });
    await user.save();

    res.json({ message: "Đăng ký OK", user: { username: user.username, role: user.role, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "Không tồn tại" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Sai mật khẩu" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    res.json({ token, role: user.role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

router.post("/social-login", authLimiter, async (req, res) => {
  try {
    const { email, displayName, provider } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Thiếu thông tin email từ mạng xã hội." });
    }

    let user = await User.findOne({ email });

    if (!user) {
      // Nếu chưa có, tự động tạo tài khoản mới. 
      // Mật khẩu giả để thỏa mãn schema (không bao giờ dùng để đăng nhập thường được vì đã hash ngẫu nhiên)
      const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
      const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
      user = new User({ 
        username, 
        email, 
        password: randomPassword, 
        role: "user" 
      });
      await user.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "SECRET_KEY", {
      expiresIn: "7d"
    });

    res.json({ token, role: user.role, username: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server khi đăng nhập mạng xã hội" });
  }
});

module.exports = router;
