const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  subcategories: [String], // Danh sách các danh mục con (Mega Menu)
}, { timestamps: true });

module.exports = mongoose.model("Category", categorySchema);
