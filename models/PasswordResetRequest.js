const mongoose = require("mongoose");

const passwordResetRequestSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true }
});

// ✅ Prevent "Cannot overwrite model" error
module.exports = mongoose.models.PasswordResetRequest || mongoose.model("PasswordResetRequest", passwordResetRequestSchema);