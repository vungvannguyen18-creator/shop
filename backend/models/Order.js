const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  readableId: { type: String, unique: true }, // FM12345
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  customerName: { type: String },
  customerPhone: { type: String },
  address: { type: String, default: "Chưa có địa chỉ" },
  note: { type: String },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      name: String,
      price: Number,
      quantity: Number,
      selectedSize: String,
      selectedColor: String,
      cost: Number // Lưu lại giá vốn tại thời điểm mua để báo cáo lợi nhuận
    }
  ],
  total: { type: Number, required: true },
  paymentMethod: { type: String, default: "cod" }, // cod, bank
  paymentStatus: { type: String, default: "pending" }, // pending, paid, cod_pending
  shippingMethod: { type: String }, // self, ghn
  status: { 
    type: String, 
    enum: ["pending", "processing", "shipping", "completed", "cancelled"], 
    default: "pending" 
  },
  auditLog: [
    {
      action: String,
      handledBy: String,
      timestamp: { type: Date, default: Date.now },
      details: String
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

OrderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Order", OrderSchema);
