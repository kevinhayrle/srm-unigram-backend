const mongoose = require("mongoose");

const unisnapSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  imageUrl: { type: String, required: true },
  textOverlay: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now },
});

// Snap expires after 24 hours
unisnapSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 }); // 24h = 86400s

module.exports = mongoose.model("UniSnap", unisnapSchema);