const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  cost: { type: Number }, // Giá vốn để tính lợi nhuận
  image: { type: String, required: true },
  category: { type: String, default: "Khác" },
  stock: { type: Number, default: 0 },
  description: { type: String },
  features: [{ type: String }], // Ưu điểm ngắn gọn
  thumbnails: [{ type: String }], // Danh sách ảnh chi tiết
  highlights: [ // Các khối đặc điểm nổi bật kiểu YaMe
    {
      icon: String,
      title: String,
      text: String
    }
  ],
  ugcPhotos: [{ type: String }], // Ảnh thực tế từ khách hàng
  sizes: [{ type: String }],
  colors: [{ type: String }],
  variants: [
    {
      color: String,
      size: String,
      inStock: { type: Boolean, default: true }
    }
  ],
  reviews: [
    {
      user: String,
      text: String,
      rating: { type: Number, default: 5 },
      date: { type: Date, default: Date.now },
      verified: { type: Boolean, default: true }
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ProductSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Product", ProductSchema);
