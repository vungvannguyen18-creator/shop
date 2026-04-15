require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function createAdmin() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/fashion-shop";
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("Connected to MongoDB");

    const username = "vung1602";
    const password = "Tvjuvung1@";
    
    // Hash password with salt rounds = 12 for higher security
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      existingUser.password = hashedPassword;
      existingUser.role = "admin";
      await existingUser.save();
      console.log(`Updated existing user ${username} to admin with new password.`);
    } else {
      const newUser = new User({
        username,
        email: "vung1602@admin.com",
        password: hashedPassword,
        role: "admin"
      });
      await newUser.save();
      console.log(`Created new admin user: ${username}`);
    }

  } catch (error) {
    console.error("Error creating admin:", error);
  } finally {
    mongoose.connection.close();
  }
}

createAdmin();
