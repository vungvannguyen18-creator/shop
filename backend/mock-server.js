const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || "fashionmodern-secret";
const SEPAY_API_KEY = "FASHION_MODERN_2026"; // Mã bảo mật để dán vào SePay

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const getFilePath = (filename) => path.join(DATA_DIR, filename);

function removeAccents(str) {
  if (!str) return "";
  return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D')
            .replace(/[^a-zA-Z0-9\s,.-]/g, ''); 
}

function readData(filename, defaultVal = []) {
  try {
    const filePath = getFilePath(filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2));
      return defaultVal;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    console.error(`Error reading ${filename}:`, e);
    return defaultVal;
  }
}

function writeData(filename, data) {
  try {
    fs.writeFileSync(getFilePath(filename), JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(`Error writing ${filename}:`, e);
  }
}

app.use(cors());
app.use(express.json());

// Tăng cường bảo mật: Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Tăng cường bảo mật: Rate Limiter cho Login (In-memory)
const loginAttempts = new Map();
const RATE_LIMIT_MS = 15 * 60 * 1000; // 15 phút
const MAX_ATTEMPTS = 5;

function checkRateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const userData = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };

  if (userData.count >= MAX_ATTEMPTS && (now - userData.lastAttempt) < RATE_LIMIT_MS) {
    const waitTime = Math.ceil((RATE_LIMIT_MS - (now - userData.lastAttempt)) / 60000);
    return res.status(429).json({ message: `Quá nhiều lần thử sai. Vui lòng thử lại sau ${waitTime} phút.` });
  }
  next();
}

function recordLoginAttempt(ip, success) {
  const now = Date.now();
  const userData = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  
  if (success) {
    loginAttempts.delete(ip);
  } else {
    userData.count += 1;
    userData.lastAttempt = now;
    loginAttempts.set(ip, userData);
  }
}

app.get("/api/products", (req, res) => {
  const products = readData("products.json");
  const category = req.query.category?.toLowerCase() || null;
  const search = req.query.search?.toLowerCase() || null;
  const priceMax = parseInt(req.query.price_max, 10) || null;

  let filtered = products;
  if (category) {
    filtered = filtered.filter(p => p.category.toLowerCase() === category);
  }
  if (search) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(search) || (p.description && p.description.toLowerCase().includes(search)));
  }
  if (priceMax) {
    filtered = filtered.filter(p => p.price <= priceMax);
  }

  // --- SECURITY: Strip cost for non-privileged users ---
  const authHeader = req.headers.authorization;
  let isSuperAdmin = false;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.role === 'super_admin') isSuperAdmin = true;
    } catch (e) {}
  }

  const result = filtered.map(p => {
    const clone = { ...p };
    if (!isSuperAdmin) delete clone.cost;
    return clone;
  });

  res.json(result);
});

const getUserRole = username => {
  const normalized = username.toLowerCase().trim();
  if (normalized === "vung1602") return "super_admin";
  if (normalized === "admin") return "admin";
  return "user";
};

app.post("/api/auth/register", async (req, res) => {
  const users = readData("users.json");
  const { username, password, email } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Vui lòng nhập username và password" });
  }

  const exists = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(400).json({ message: "Tài khoản đã tồn tại" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: users.length + 1,
    username,
    email: email || `${username}@fashionmodern.vn`,
    password: hashedPassword,
    role: getUserRole(username),
    isProfileComplete: getUserRole(username) !== "user" // Admins/Super are auto-complete
  };
  users.push(newUser);
  writeData("users.json", users);

  res.json({ 
    message: "Đăng ký OK", 
    user: { username: newUser.username, role: newUser.role, email: newUser.email },
    isProfileComplete: newUser.isProfileComplete
  });
});

app.post("/api/auth/login", checkRateLimit, async (req, res) => {
  const users = readData("users.json");
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Vui lòng nhập username và password" });
  }

  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    return res.status(404).json({ message: "Không tồn tại" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    recordLoginAttempt(req.ip, false);
    return res.status(401).json({ message: "Sai mật khẩu" });
  }

  recordLoginAttempt(req.ip, true);
  const token = jwt.sign(
    { id: user.id, role: user.role, username: user.username }, 
    JWT_SECRET, 
    { expiresIn: "24h" }
  );
  res.json({ token, role: user.role, username: user.username, email: user.email, isProfileComplete: !!user.isProfileComplete });
});

app.post("/api/auth/social-login", async (req, res) => {
  const users = readData("users.json");
  const { email, displayName, provider } = req.body;
  if (!email) return res.status(400).json({ message: "Thiếu thông tin email từ mạng xã hội." });

  let user = users.find(u => u.email === email);
  if (!user) {
    const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
    const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
    user = {
      id: users.length + 1,
      username,
      email,
      password: randomPassword,
      role: getUserRole(username),
      isProfileComplete: false
    };
    users.push(user);
    writeData("users.json", users);
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, username: user.username }, 
    JWT_SECRET, 
    { expiresIn: "24h" }
  );
  res.json({ token, role: user.role, username: user.username, isProfileComplete: !!user.isProfileComplete });
});

// Route: Update profile (Onboarding)
app.put("/api/users/profile", verifyToken, (req, res) => {
  const users = readData("users.json");
  const userIndex = users.findIndex(u => u.id === req.user.id);
  
  if (userIndex === -1) return res.status(404).json({ message: "Không tìm thấy người dùng" });

  const { fullName, phone, address } = req.body;
  
  users[userIndex].fullName = fullName || users[userIndex].fullName;
  users[userIndex].phone = phone || users[userIndex].phone;
  users[userIndex].address = address || users[userIndex].address;
  users[userIndex].isProfileComplete = true;

  writeData("users.json", users);
  
  res.json({ 
    message: "Profile updated successfully", 
    user: { 
      username: users[userIndex].username, 
      role: users[userIndex].role,
      fullName: users[userIndex].fullName,
      phone: users[userIndex].phone,
      address: users[userIndex].address
    } 
  });
});

// Mock upload endpoint
const multer = require("multer");

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });
app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Không có file" });
  res.json({ url: `http://localhost:5001/uploads/${req.file.filename}` });
});

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Không có token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token không hợp lệ" });
  }
}

app.post("/api/orders", verifyToken, (req, res) => {
  const orders = readData("orders.json");
  const products = readData("products.json");
  const { items, total, address, customerName, customerPhone, note, paymentMethod } = req.body;
  
  // Sanitize text data to remove accents (Safe for Java/Encoding)
  const safeCustomerName = removeAccents(customerName);
  const safeAddress = removeAccents(address);
  const safeNote = removeAccents(note);

  if (!items || !total) {
    return res.status(400).json({ message: "Dữ liệu đơn hàng không hợp lệ" });
  }

  // Snapshot cost into items
  const enrichedItems = items.map(item => {
    const p = products.find(prod => prod.id === item.id || prod._id === item.id);
    return {
      ...item,
      cost: p ? (p.cost || Math.floor(item.price * 0.7)) : Math.floor(item.price * 0.7)
    };
  });

  const timestamp = Date.now();
  const readableId = "FM" + (timestamp % 100000).toString().padStart(5, '0');

  const order = {
    _id: `o${timestamp}`,
    readableId: readableId, 
    userId: req.user.id,
    customerName: safeCustomerName || "Khach hang",
    customerPhone: customerPhone || "",
    address: safeAddress || "Dia chi mac dinh",
    note: safeNote || "",
    paymentMethod: paymentMethod || "cod",
    paymentStatus: paymentMethod === 'bank' ? 'unpaid' : 'cod_pending',
    items: enrichedItems,
    total,
    status: "pending",
    shippingMethod: null,
    createdAt: new Date().toISOString()
  };
  orders.push(order);
  writeData("orders.json", orders);
  res.json(order);
});

app.get("/api/orders", verifyToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ message: "Chỉ Admin/Super Admin mới có quyền xem tất cả đơn hàng" });
  }
  const orders = readData("orders.json");
  
  // --- SECURITY: Strip cost for non-super admins ---
  if (req.user.role !== 'super_admin') {
    const safeOrders = orders.map(o => ({
      ...o,
      items: o.items.map(it => {
        const itClone = { ...it };
        delete itClone.cost;
        return itClone;
      })
    }));
    return res.json(safeOrders);
  }

  res.json(orders);
});

app.put("/api/orders/:id/status", verifyToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ message: "Forbidden - role: " + req.user.role });
  }
  const orders = readData("orders.json");
  const validStatuses = ['pending', 'processing', 'shipping', 'completed', 'cancelled'];
  const { status } = req.body;
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: "Trạng thái không hợp lệ: " + status });
  }
  const order = orders.find(o => o._id === req.params.id);
  if (!order) {
    return res.status(404).json({ message: "Không tìm thấy đơn hàng với id: " + req.params.id });
  }

  // --- STATE MACHINE CONSTRAINTS ---
  const flow = {
      'pending': ['processing', 'cancelled'],
      'processing': ['shipping', 'cancelled'],
      'shipping': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': [] // No reverting from cancelled in standard flow
  };

  const currentStatus = order.status || 'pending';
  if (currentStatus !== status) {
      const allowedNext = flow[currentStatus] || [];
      if (!allowedNext.includes(status)) {
         return res.status(400).json({ message: `Lỗi luồng Vận đơn: Không thể chuyển từ '${currentStatus}' sang '${status}'.`});
      }
  }

  // --- AUDIT LOG (Ghi nhận vết tích Nhân sự) ---
  if (!order.auditLog) order.auditLog = [];
  if (currentStatus !== status) {
      order.auditLog.push({
          action: `${currentStatus} -> ${status}`,
          handledBy: req.user.username,
          timestamp: new Date().toISOString()
      });
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();
  writeData("orders.json", orders);
  res.json(order);
});

// Route: Admin xac nhan don hang nhanh
app.put("/api/orders/:id/confirm", verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
  const orders = readData("orders.json");
  const order = orders.find(o => o._id === req.params.id);
  if (!order) return res.status(404).json({ message: "Khong tim thay don hang" });
  if (order.status !== 'processing') return res.status(400).json({ message: "Chỉ có thể xác nhận đơn hàng đang chờ xử lý" });
  order.status = 'confirmed';
  order.confirmedAt = new Date().toISOString();
  order.updatedAt = new Date().toISOString();
  writeData("orders.json", orders);
  res.json(order);
});

// Route: Admin chon phuong thuc van chuyen
app.put("/api/orders/:id/shipping", verifyToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Forbidden" });
  }
  const { shippingMethod } = req.body;
  if (!['self', 'ghn'].includes(shippingMethod)) {
    return res.status(400).json({ message: "Phương thức vận chuyển (shippingMethod) phải là 'self' hoặc 'ghn'" });
  }
  const orders = readData("orders.json");
  const order = orders.find(o => o._id === req.params.id);
  if (!order) return res.status(404).json({ message: "Khong tim thay don hang" });
  order.shippingMethod = shippingMethod;
  if (order.status === 'processing') order.status = 'shipping';
  order.updatedAt = new Date().toISOString();
  writeData("orders.json", orders);
  res.json(order);
});

// --- AUTOMATED PAYMENT & WEBHOOKS ---

// API: Check payment status (Polling)
app.get("/api/orders/:id/status", (req, res) => {
  const orders = readData("orders.json");
  // Check by _id or readableId
  const order = orders.find(o => o._id === req.params.id || o.readableId === req.params.id);
  if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
  res.json({ 
    id: order._id,
    readableId: order.readableId,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    status: order.status
  });
});

// API: Automated Payment Webhook (SePay / Casso / Simulation)
app.post(["/api/payment/webhook", "/api/webhooks/payment"], (req, res) => {
  // 1. Xác thực API Key từ SePay (nếu có cấu hình)
  const authHeader = req.headers.authorization;
  if (authHeader && !authHeader.includes(SEPAY_API_KEY)) {
    console.warn("[Webhook] Unauthorized attempt with wrong API Key");
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  // 2. Lấy dữ liệu (SePay dùng transferAmount và content, mock dùng amount và content)
  const content = req.body.content || req.body.description;
  const amount = req.body.transferAmount || req.body.amount;

  if (!content) return res.status(400).json({ success: false, message: "Thiếu nội dung giao dịch" });

  const orders = readData("orders.json");
  // Cải tiến Regex: Tìm chuỗi có dạng FM + 5 chữ số (VD: FM10005)
  const regex = /FM\d{5,}/;
  const matchCode = content.match(regex);
  const searchableId = matchCode ? matchCode[0] : content;

  console.log(`[Webhook] Receiving: ${content} - Amount: ${amount}`);

  const match = orders.find(o => o.readableId === searchableId || content.includes(o.readableId));
  
  if (!match) {
    console.warn(`[Webhook] No order found for: ${searchableId}`);
    return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
  }

  if (match.paymentStatus === 'paid') {
    return res.json({ success: true, message: "Đã thanh toán trước đó" });
  }

  // 3. Kiểm tra số tiền (Cho phép sai số nhỏ hoặc >= tiền đơn)
  if (amount && Number(amount) < match.total) {
    console.warn(`[Webhook] Amount mismatch for ${match.readableId}: Need ${match.total}, got ${amount}`);
    return res.status(400).json({ success: false, message: "Số tiền không đủ" });
  }

  // 4. Cập nhật trạng thái
  match.paymentStatus = 'paid';
  match.updatedAt = new Date().toISOString();
  if (!match.auditLog) match.auditLog = [];
  match.auditLog.push({
    action: "Payment Verified via Real Webhook (SePay)",
    handledBy: "System (SePay)",
    timestamp: new Date().toISOString(),
    details: `Content: ${content}, Amount: ${amount}`
  });

  writeData("orders.json", orders);
  console.log(`[Webhook] ✅ Order ${match.readableId} marked as PAID.`);
  
  // Trả về success: true theo yêu cầu của SePay
  res.json({ success: true, message: "Xác nhận thành công" });
});

app.post("/api/products", verifyToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ message: "Chỉ admin/super admin mới được thực hiện chức năng này" });
  }
  const products = readData("products.json");
  const { name, price, cost, image, stock, category, sizes, colors, features, description, variants } = req.body;
  const newProduct = {
    id: "p" + Date.now(),
    name, 
    price: Number(price), 
    cost: cost ? Number(cost) : Math.floor(Number(price) * 0.7),
    image,
    stock: stock ? Number(stock) : 10,
    category: category || "Khác",
    description: description || "Sản phẩm mới thêm bởi Admin.",
    sizes: Array.isArray(sizes) ? sizes : [],
    colors: Array.isArray(colors) ? colors : [],
    features: Array.isArray(features) ? features : [],
    variants: Array.isArray(variants) ? variants : []
  };
  products.push(newProduct);
  writeData("products.json", products);
  res.json(newProduct);
});

app.put("/api/products/:id", verifyToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ message: "Chỉ admin/super admin mới được thực hiện chức năng này" });
  }
  const products = readData("products.json");
  const idToUpdate = req.params.id;
  const productIndex = products.findIndex(p => p.id === idToUpdate || p._id === idToUpdate);
  
  if (productIndex !== -1) {
    const { name, price, cost, image, stock, category, sizes, colors, features, description, variants } = req.body;
    if (name) products[productIndex].name = name;
    if (price) products[productIndex].price = Number(price);
    if (cost) products[productIndex].cost = Number(cost);
    if (image) products[productIndex].image = image;
    if (stock !== undefined) products[productIndex].stock = Number(stock);
    if (category) products[productIndex].category = category;
    if (description !== undefined) products[productIndex].description = description;
    if (sizes) products[productIndex].sizes = sizes;
    if (colors) products[productIndex].colors = colors;
    if (features) products[productIndex].features = features;
    if (variants) products[productIndex].variants = variants;
    
    products[productIndex].updatedAt = new Date().toISOString();
    writeData("products.json", products);
    res.json(products[productIndex]);
  } else {
    res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  }
});

app.delete("/api/products/:id", verifyToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ message: "Chỉ admin/super admin mới được thực hiện chức năng này" });
  }
  const products = readData("products.json");
  const idToDelete = req.params.id;
  const productIndex = products.findIndex(p => p.id === idToDelete || p._id === idToDelete);
  
  if (productIndex !== -1) {
    products.splice(productIndex, 1);
    writeData("products.json", products);
    res.json({ message: "Đã xóa sản phẩm thành công" });
  } else {
    res.status(404).json({ message: "Không tìm thấy sản phẩm để xóa" });
  }
});

// --- REVIEWS API ---
app.post("/api/products/:id/reviews", verifyToken, (req, res) => {
  const products = readData("products.json");
  const targetId = req.params.id;
  const productIndex = products.findIndex(p => p.id === targetId || p._id === targetId);

  if (productIndex === -1) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

  const { text, rating } = req.body;
  if (!text) return res.status(400).json({ message: "Nội dung đánh giá không được để trống" });
  
  if (!products[productIndex].reviews) {
    products[productIndex].reviews = [];
  }

  const newReview = {
    id: "r" + Date.now(),
    user: req.user.username,
    text: text,
    rating: Number(rating) || 5,
    date: new Date().toISOString(),
    verified: true // Backend implicitly trusts the Frontend 3-Ring validation gate for this Mock Server 
  };

  products[productIndex].reviews.unshift(newReview);
  writeData("products.json", products);

  res.json({ message: "Đã thêm đánh giá thành công", review: newReview });
});

app.get("/api/categories", (req, res) => {
  res.json(readData("categories.json"));
});

app.post("/api/categories", verifyToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') return res.status(403).json({ message: "Forbidden" });
  const cats = readData("categories.json");
  const newCat = { id: "c" + Date.now(), name: req.body.name, subcategories: req.body.subcategories || [] };
  cats.push(newCat);
  writeData("categories.json", cats);
  res.json(newCat);
});

app.put("/api/categories/:id", verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
  const cats = readData("categories.json");
  const index = cats.findIndex(c => c.id === req.params.id);
  if (index !== -1) {
    if (req.body.name) cats[index].name = req.body.name;
    if (req.body.subcategories) cats[index].subcategories = req.body.subcategories;
    writeData("categories.json", cats);
    res.json(cats[index]);
  } else res.status(404).json({ message: "Not found" });
});

app.delete("/api/categories/:id", verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
  const cats = readData("categories.json");
  const index = cats.findIndex(c => c.id === req.params.id);
  if (index !== -1) {
      cats.splice(index, 1);
      writeData("categories.json", cats);
  }
  res.json({ message: "Deleted" });
});

app.get("/api/users", verifyToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ message: "Truy cập bị từ chối" });
  }
  const users = readData("users.json");
  const safeUsers = users.map(u => ({ 
    id: u.id, 
    username: u.username, 
    email: u.email, 
    role: u.role,
    fullName: u.fullName || u.username
  }));
  res.json(safeUsers);
});

// Route: Update User Role (RBAC)
app.patch("/api/users/:id/role", verifyToken, (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: "Chỉ Siêu quản trị viên mới có thể thay đổi phân quyền" });
  }

  const users = readData("users.json");
  const targetId = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === targetId);

  if (userIndex === -1) return res.status(404).json({ message: "Người dùng không tồn tại" });

  const targetUser = users[userIndex];

  // Bảo vệ Super Admin tối cao
  if (targetUser.username.toLowerCase() === "vung1602") {
    return res.status(400).json({ message: "Không thể thay đổi quyền của Siêu quản trị viên tối cao" });
  }

  const { role } = req.body;
  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ message: "Quyền hạn không hợp lệ" });
  }

  users[userIndex].role = role;
  writeData("users.json", users);

  res.json({ message: `Đã cập nhật quyền cho ${targetUser.username} thành ${role}` });
});

// --- VOUCHER API ---
app.get("/api/vouchers", (req, res) => {
  const vouchers = readData("vouchers.json", []);
  const activeVouchers = vouchers.filter(v => v.active);
  res.json(activeVouchers);
});

// Lấy danh sách voucher hiển thị trên trang chủ (Banner)
app.get("/api/vouchers/public", (req, res) => {
  const vouchers = readData("vouchers.json", []);
  const publicVouchers = vouchers.filter(v => v.active && v.isPublic !== false);
  res.json(publicVouchers);
});

// Admin: Phát hành voucher ra trang chủ
app.post("/api/vouchers/publish", verifyToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') return res.status(403).json({ message: "Forbidden" });
  
  const { code } = req.body;
  const vouchers = readData("vouchers.json", []);
  
  const updated = vouchers.map(v => ({
    ...v,
    isPublic: v.code === code
  }));
  
  writeData("vouchers.json", updated);
  res.json({ message: `Đã phát hành mã ${code} ra trang chủ.` });
});

// Admin: Lấy tất cả voucher (kể cả đã khóa)
app.get("/api/vouchers/admin", verifyToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') return res.status(403).json({ message: "Forbidden" });
  const vouchers = readData("vouchers.json", []);
  res.json(vouchers);
});

// Admin: Tạo mới voucher
app.post("/api/vouchers/create", verifyToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') return res.status(403).json({ message: "Forbidden" });
  const { code, type, value, minOrder, description } = req.body;
  const vouchers = readData("vouchers.json", []);
  
  if (vouchers.find(v => v.code.toUpperCase() === code.toUpperCase())) {
    return res.status(400).json({ message: "Mã giảm giá này đã tồn tại!" });
  }

  const newVoucher = {
    code: code.toUpperCase(),
    type,
    value: Number(value),
    minOrder: Number(minOrder),
    description,
    active: true,
    isPublic: false
  };

  vouchers.push(newVoucher);
  writeData("vouchers.json", vouchers);
  res.json({ message: "Tạo voucher mới thành công!", voucher: newVoucher });
});

// Admin: Bật/Tắt trạng thái voucher
app.patch("/api/vouchers/:code/toggle", verifyToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') return res.status(403).json({ message: "Forbidden" });
  const { code } = req.params;
  const vouchers = readData("vouchers.json", []);
  const index = vouchers.findIndex(v => v.code === code);
  
  if (index === -1) return res.status(404).json({ message: "Không tìm thấy mã" });
  
  vouchers[index].active = !vouchers[index].active;
  writeData("vouchers.json", vouchers);
  res.json({ message: "Đã cập nhật trạng thái", active: vouchers[index].active });
});

// Admin: Xóa voucher
app.delete("/api/vouchers/:code", verifyToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') return res.status(403).json({ message: "Forbidden" });
  const { code } = req.params;
  let vouchers = readData("vouchers.json", []);
  
  const initialLen = vouchers.length;
  vouchers = vouchers.filter(v => v.code !== code);
  
  if (vouchers.length === initialLen) return res.status(404).json({ message: "Không tìm thấy mã" });

  writeData("vouchers.json", vouchers);
  res.json({ message: "Đã xóa voucher thành công" });
});

// Khách hàng: Lưu voucher vào ví
app.post("/api/vouchers/save", verifyToken, (req, res) => {
  const { code } = req.body;
  const userVouchers = readData("user_vouchers.json", []);
  
  // Kiểm tra xem đã lưu chưa
  const exists = userVouchers.find(uv => uv.userId === req.user.id && uv.voucherCode === code);
  if (exists) return res.status(400).json({ message: "Bạn đã lưu mã này rồi!" });
  
  userVouchers.push({
    userId: req.user.id,
    voucherCode: code,
    savedAt: new Date().toISOString()
  });
  
  writeData("user_vouchers.json", userVouchers);
  res.json({ message: "Đã lưu voucher vào ví thành công!" });
});

// Khách hàng: Lấy danh sách voucher trong ví (Kho Voucher)
app.get("/api/vouchers/my", verifyToken, (req, res) => {
  const vouchers = readData("vouchers.json", []);
  const userVouchers = readData("user_vouchers.json", []);
  
  const myVoucherCodes = userVouchers
    .filter(uv => uv.userId === req.user.id)
    .map(uv => uv.voucherCode);
    
  const myVouchers = vouchers.filter(v => myVoucherCodes.includes(v.code));
  res.json(myVouchers);
});

app.post("/api/vouchers/apply", (req, res) => {
  const { code, subtotal } = req.body;
  if (!code) return res.status(400).json({ message: "Vui lòng nhập mã giảm giá" });

  const vouchers = readData("vouchers.json", []);
  const voucher = vouchers.find(v => v.code.toUpperCase() === code.toUpperCase());

  if (!voucher) {
    return res.status(404).json({ message: "Mã giảm giá không tồn tại hoặc đã hết hạn." });
  }

  if (!voucher.active) {
    return res.status(400).json({ message: "Mã giảm giá này đã hết hiệu lực (Sharp Refusal)." });
  }

  if (subtotal < voucher.minOrder) {
    return res.status(400).json({ 
      message: `Đơn hàng tối thiểu ${voucher.minOrder.toLocaleString()}đ mới được áp dụng mã này.` 
    });
  }

  let discount = 0;
  if (voucher.type === "fixed") {
    discount = voucher.value;
  } else if (voucher.type === "percent") {
    discount = (subtotal * voucher.value) / 100;
    if (voucher.maxDiscount > 0 && discount > voucher.maxDiscount) {
      discount = voucher.maxDiscount;
    }
  } else if (voucher.type === "freeship") {
    discount = 0; // We'll handle this specially on frontend or return a flag
  }

  res.json({
    success: true,
    code: voucher.code,
    type: voucher.type,
    value: voucher.value,
    discount: Math.floor(discount),
    message: "Áp dụng mã giảm giá thành công!"
  });
});

app.get("/api/orders/my", verifyToken, (req, res) => {
  const orders = readData("orders.json");
  const userOrders = orders.filter(order => order.userId === req.user.id);
  res.json(userOrders);
});

// --- SETTINGS API ---
app.get("/api/settings", (req, res) => {
  res.json(readData("settings.json", {}));
});

app.post("/api/settings", verifyToken, (req, res) => {
  // Chỉ vung1602 mới được quyền sửa cài đặt hệ thống
  if (req.user.username.toLowerCase() !== "vung1602") {
    return res.status(403).json({ message: "Chỉ Siêu quản trị viên (vung1602) mới có quyền thay đổi cài đặt hệ thống" });
  }

  const newSettings = req.body;
  writeData("settings.json", newSettings);
  res.json({ message: "Đã lưu cài đặt hệ thống thành công", settings: newSettings });
});

app.get("/", (req, res) => {
  res.send("Mock Fashion Modern API is running");
});

app.listen(PORT, () => {
  console.log(`Mock server running on port ${PORT}`);
});
