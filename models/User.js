const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  regNumber: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // New profile fields
  userhandle: { type: String, required: true, unique: true }, // immutable
  profileImageUrl: { type: String, default: "https://i.postimg.cc/bYKxqBFF/pfp.jpg" },
  bio: { type: String, default: "" },
  department: { type: String, default: "" },
  pronoun: { type: String, default: "" },
  linkedin: { type: String, default: "" },
  instagram: { type: String, default: "" },

  verified: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Generate userhandle from email before saving
userSchema.pre("save", function (next) {
  if (this.isNew && !this.userhandle) {
    const emailPrefix = this.email.split("@")[0];
    this.userhandle = emailPrefix.toLowerCase(); // convert to lowercase
  }
  next();
});

// Prevent userhandle from being updated
userSchema.pre('findOneAndUpdate', function(next) {
  if (this._update.userhandle) {
    delete this._update.userhandle;
  }
  next();
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);