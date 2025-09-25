const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const Post = require("../models/Post");

// ---------------------
// Get user info by ID
// ---------------------
router.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const user = await User.findById(id).select(
      "name bio profileImageUrl email department pronoun linkedin instagram userhandle"
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------
// Get posts by user ID
// ---------------------
router.get("/posts/user/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    let posts = await Post.find({ userId: id })
      .sort({ timestamp: -1 })
      .populate(
        "userId",
        "name profileImageUrl userhandle department pronoun linkedin instagram"
      );

    posts = posts.map((post) => ({
      ...post._doc,
      username: post.userId?.name,
      userhandle: post.userId?.userhandle,
      profileImageUrl: post.userId?.profileImageUrl || 'https://i.postimg.cc/bYKxqBFF/pfp.jpg',
      department: post.userId?.department,
      pronoun: post.userId?.pronoun,
      linkedin: post.userId?.linkedin,
      instagram: post.userId?.instagram,
    }));

    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching posts" });
  }
});

// ---------------------
// Update user info by ID
// ---------------------
router.put("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { bio, department, pronoun, linkedin, instagram, profileImageUrl } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        $set: { bio, department, pronoun, linkedin, instagram, profileImageUrl },
      },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ error: "User not found" });
    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error updating user" });
  }
});

module.exports = router;