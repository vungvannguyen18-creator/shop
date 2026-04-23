const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const router = express.Router();

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cấu hình Bộ lưu trữ Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "shopthoitrang", // Tên thư mục trên trang Cloudinary
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ width: 1000, height: 1000, crop: "limit" }] // Tối ưu hóa ảnh
  }
});

const upload = multer({ storage });

router.post("/", (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      console.error("Lỗi upload Cloudinary:", err);
      return res.status(500).json({ 
        message: "Lỗi tải ảnh lên Cloudinary", 
        error: err.message 
      });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Không có file" });
    }
    res.json({ url: req.file.path });
  });
});

// Upload nhiều ảnh cùng lúc
router.post("/multiple", (req, res, next) => {
  upload.array("images", 10)(req, res, (err) => {
    if (err) {
      console.error("Lỗi upload nhiều ảnh:", err);
      return res.status(500).json({ 
        message: "Lỗi tải nhiều ảnh lên Cloudinary", 
        error: err.message 
      });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Không có file nào được tải lên" });
    }
    const urls = req.files.map(file => file.path);
    res.json({ urls });
  });
});

module.exports = router;
