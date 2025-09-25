const express = require("express");
const router = express.Router();
const Unisnap = require("../models/UniSnap");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const streamifier = require("streamifier");

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

// ---------------------
// Create a new Unisnap
// POST /api/unisnaps
// ---------------------
router.post("/", auth, upload.single("photo"), async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const textOverlay = req.body.text || "";

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!req.file) return res.status(400).json({ error: "Photo required" });

    // Upload photo to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "unisnaps" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    const newUnisnap = new Unisnap({
      userId,
      imageUrl: result.secure_url,
      textOverlay,
    });

    await newUnisnap.save();

    // Refined response
    res.status(201).json({
      _id: newUnisnap._id,
      username: user.name,
      profileImageUrl: user.profileImageUrl,
      imageUrl: newUnisnap.imageUrl,
      textOverlay: newUnisnap.textOverlay,
      timestamp: newUnisnap.timestamp,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error creating unisnap" });
  }
});

// ---------------------
// Get all active Unisnaps (last 24h), grouped by user
// GET /api/unisnaps
// ---------------------
router.get("/", async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h ago

    let unisnaps = await Unisnap.find({ timestamp: { $gte: cutoff } })
      .sort({ timestamp: -1 })
      .populate("userId", "name profileImageUrl");

    // Group snaps by userId
    const grouped = {};
    unisnaps.forEach((snap) => {
      const userId = snap.userId?._id.toString() || snap.userId;
      if (!grouped[userId]) {
        grouped[userId] = {
          userId,
          username: snap.userId?.name || snap.username,
          profileImageUrl: snap.userId?.profileImageUrl || "https://i.postimg.cc/bYKxqBFF/pfp.jpg",
          snaps: [],
        };
      }
      grouped[userId].snaps.push({
        _id: snap._id,
        imageUrl: snap.imageUrl,
        textOverlay: snap.textOverlay,
        timestamp: snap.timestamp,
      });
    });

    res.json(Object.values(grouped));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching unisnaps" });
  }
});

// ---------------------
// Delete a Unisnap
// DELETE /api/unisnaps/:id
// ---------------------
router.delete("/:id", auth, async (req, res) => {
  try {
    const snap = await Unisnap.findById(req.params.id);
    if (!snap) return res.status(404).json({ error: "Snap not found" });

    // Only the owner can delete
    if (snap.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await snap.deleteOne();
    res.json({ message: "Unisnap deleted successfully", snapId: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error deleting unisnap" });
  }
});

module.exports = router;