const mongoose = require("mongoose");

const visitSchema = new mongoose.Schema({
  date: {
    type: String, // Định dạng YYYY-MM-DD để dễ truy vấn theo ngày
    unique: true,
    required: true
  },
  count: {
    type: Number,
    default: 0
  },
  uniqueIps: [String] // Lưu IP để đếm số khách truy cập duy nhất
}, { timestamps: true });

module.exports = mongoose.model("Visit", visitSchema);
