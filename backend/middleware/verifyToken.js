const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) return res.status(401).json({ message: "Không có token" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Token lỗi" });
    req.user = decoded;
    next();
  });
}

function verifyAdmin(req, res, next) {
  const isStaff = req.user?.role === "admin" || req.user?.role === "super_admin";
  if (!isStaff) {
    return res.status(403).json({ message: "Chỉ quản trị viên mới được quyền truy cập" });
  }
  next();
}

module.exports = { verifyToken, verifyAdmin };
