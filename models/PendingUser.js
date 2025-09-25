const mongoose = require("mongoose");

const pendingUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  regNumber: { type: String, required: true }, // <-- Add this line
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true }
});

// ✅ Prevent "Cannot overwrite model" error
module.exports = mongoose.models.PendingUser || mongoose.model("PendingUser", pendingUserSchema);