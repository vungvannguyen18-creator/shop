const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Bộ nhớ tạm lưu trữ OTP (Chỉ dùng cho môi trường giả lập/Dev)
const otpStore = {};

// Giới hạn cho các luồng xác thực: 5 lần thử/10 phút
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 20, // Nới lỏng chút để tránh chặn nhầm người dùng thật
  message: { message: "Quá nhiều lần thử đăng nhập thất bại. Vui lòng quay lại sau 10 phút." },
  standardHeaders: true, 
  legacyHeaders: false,
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

router.post("/forgot-password", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Vui lòng nhập số điện thoại hoặc email." });

    const user = await User.findOne({ 
      $or: [{ email: email }, { username: email }] 
    });
    
    if (!user) return res.status(404).json({ message: "Tài khoản không tồn tại trong hệ thống." });

    // Tạo mã OTP 6 số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = {
      otp: otp,
      expiresAt: Date.now() + 5 * 60 * 1000 // Hết hạn sau 5 phút
    };

    console.log(`[OTP GENERATED] Mã OTP cho ${email} là: ${otp}`);

    // Gửi OTP về client để dễ test (Trong thực tế sẽ gửi qua SMS/Email và không trả về qua API)
    res.json({ 
      message: `Gửi mã thành công! (Mã OTP Demo: ${otp})`, 
      otp: otp // Trả về để tự điền tự động hoặc hiển thị thông báo
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

router.post("/reset-password", authLimiter, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
    }

    const record = otpStore[email];
    if (!record) {
      return res.status(400).json({ message: "Mã OTP không hợp lệ hoặc chưa được yêu cầu." });
    }

    if (Date.now() > record.expiresAt) {
      delete otpStore[email];
      return res.status(400).json({ message: "Mã OTP đã hết hạn." });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: "Mã OTP không chính xác." });
    }

    // OTP đúng, tiến hành đổi mật khẩu
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate(
      { $or: [{ email: email }, { username: email }] },
      { password: hashed }
    );

    // Xóa OTP sau khi dùng xong
    delete otpStore[email];

    res.json({ message: "Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
