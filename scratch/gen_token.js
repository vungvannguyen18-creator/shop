const jwt = require("jsonwebtoken");
const JWT_SECRET = "fashionmodern-secret";
const token = jwt.sign({ id: 4, role: "user", username: "vungvannguyen1871" }, JWT_SECRET, { expiresIn: "24h" });
console.log(token);
