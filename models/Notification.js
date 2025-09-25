const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },      // who gets notified
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },    // who triggered
  type: { type: String, enum: ["like", "comment", "reply"], required: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
  commentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
  read: { type: Boolean, default: false },                             // unread = true for dot/glow
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", notificationSchema);