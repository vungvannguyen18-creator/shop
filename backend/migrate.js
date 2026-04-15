require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

// Import Models
const Product = require("./models/Product");
const User = require("./models/User");
const { Voucher } = require("./models/Voucher");
const Order = require("./models/Order");

const DATA_DIR = path.join(__dirname, "data");

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/fashion-shop");
    console.log("✅ Connected to MongoDB for migration");

    // 1. Migrate Users
    const usersData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "users.json"), "utf-8"));
    console.log(`Migrating ${usersData.length} users...`);
    for (const u of usersData) {
        // Users in JSON already have hashed passwords
        await User.findOneAndUpdate(
            { username: u.username },
            { 
                email: u.email, 
                password: u.password, 
                role: u.role,
                fullName: u.fullName || u.username,
                isProfileComplete: !!u.isProfileComplete 
            },
            { upsert: true }
        );
    }

    // 2. Migrate Products
    const productsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "products.json"), "utf-8"));
    console.log(`Migrating ${productsData.length} products...`);
    for (const p of productsData) {
        const id = p.id || p._id;
        await Product.findOneAndUpdate(
            { name: p.name }, // Use name as unique identifier for migration
            { 
                price: p.price,
                cost: p.cost || Math.floor(p.price * 0.7),
                image: p.img || p.image,
                category: p.category || "Khác",
                stock: p.stock || 10,
                description: p.description,
                features: p.features || [],
                sizes: p.sizes || [],
                colors: p.colors || [],
                variants: p.variants || [],
                reviews: p.reviews || []
            },
            { upsert: true }
        );
    }

    // 3. Migrate Vouchers
    const vouchersData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "vouchers.json"), "utf-8"));
    console.log(`Migrating ${vouchersData.length} vouchers...`);
    for (const v of vouchersData) {
        await Voucher.findOneAndUpdate(
            { code: v.code.toUpperCase() },
            { 
                type: v.type,
                value: v.value,
                minOrder: v.minOrder,
                description: v.description,
                active: v.active,
                isPublic: v.isPublic
            },
            { upsert: true }
        );
    }

    console.log("🚀 Migration Completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration Failed:", error);
    process.exit(1);
  }
}

migrate();
