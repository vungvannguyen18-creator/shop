const mongoose = require("mongoose");

const VoucherSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  type: { type: String, enum: ["fixed", "percent", "freeship"], default: "fixed" },
  value: { type: Number, required: true },
  minOrder: { type: Number, default: 0 },
  description: { type: String },
  active: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: false }, // Hiển thị trên banner trang chủ
  createdAt: { type: Date, default: Date.now }
});

const UserVoucherSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  voucherCode: { type: String, required: true },
  savedAt: { type: Date, default: Date.now },
  used: { type: Boolean, default: false }
});

const Voucher = mongoose.model("Voucher", VoucherSchema);
const UserVoucher = mongoose.model("UserVoucher", UserVoucherSchema);

module.exports = { Voucher, UserVoucher };
