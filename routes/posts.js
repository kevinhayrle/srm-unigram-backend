const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const auth = require("../middleware/authMiddleware");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const streamifier = require("streamifier");

// ------------------
// Cloudinary config
// ------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ------------------
// Multer setup (memory storage for Cloudinary)
// ------------------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ---------------------
// Create a new post
// POST /api/posts
// ---------------------
router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const caption = req.body.caption;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const username = user.name;

    let imageUrl = null;

    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "unigram_posts" },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
      imageUrl = result.secure_url;
    }

    const newPost = new Post({
      userId,
      username,
      caption,
      imageUrl,
      timestamp: Date.now(),
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    console.error("Error creating post:", err);
    res.status(500).json({ error: "Server error creating post" });
  }
});

// ---------------------
// Get all posts for feed
// GET /api/posts
// ---------------------
router.get("/", async (req, res) => {
  try {
    let posts = await Post.find()
      .sort({ timestamp: -1 })
      .populate(
        "userId",
        "name profileImageUrl userhandle department pronoun linkedin instagram"
      )
      .populate({
        path: "comments.userId",
        select: "name",
      });

    posts = posts.map((post) => ({
      ...post._doc,
      username: post.userId?.name || post.username,
      userhandle: post.userId?.userhandle,
      profileImageUrl: post.userId?.profileImageUrl || "https://i.postimg.cc/bYKxqBFF/pfp.jpg",
      department: post.userId?.department,
      pronoun: post.userId?.pronoun,
      linkedin: post.userId?.linkedin,
      instagram: post.userId?.instagram,
      comments: post.comments.map((c) => ({
        _id: c._id,
        userId: c.userId?._id || c.userId,
        username: c.userId?.name || c.username || "User",
        text: c.text,
        timestamp: c.timestamp,
        replies: c.replies?.map((r) => ({
          _id: r._id,
          userId: r.userId,
          username: r.username || "User",
          text: r.text,
          timestamp: r.timestamp,
        })) || [],
      })),
    }));

    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching feed" });
  }
});

// ---------------------
// Get posts by user ID
// GET /api/posts/user/:id
// ---------------------
router.get("/user/:id", async (req, res) => {
  try {
    let posts = await Post.find({ userId: req.params.id })
      .sort({ timestamp: -1 })
      .populate(
        "userId",
        "name profileImageUrl userhandle department pronoun linkedin instagram"
      )
      .populate({
        path: "comments.userId",
        select: "name",
      });

    posts = posts.map((post) => ({
      ...post._doc,
      username: post.userId?.name || post.username,
      userhandle: post.userId?.userhandle,
      profileImageUrl: post.userId?.profileImageUrl || "https://i.postimg.cc/bYKxqBFF/pfp.jpg",
      department: post.userId?.department,
      pronoun: post.userId?.pronoun,
      linkedin: post.userId?.linkedin,
      instagram: post.userId?.instagram,
      comments: post.comments.map((c) => ({
        _id: c._id,
        userId: c.userId?._id || c.userId,
        username: c.userId?.name || c.username || "User",
        text: c.text,
        timestamp: c.timestamp,
        replies: c.replies?.map((r) => ({
          _id: r._id,
          userId: r.userId,
          username: r.username || "User",
          text: r.text,
          timestamp: r.timestamp,
        })) || [],
      })),
    }));

    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching posts" });
  }
});

// ---------------------
// Update user info by ID
// PUT /api/posts/users/:id
// ---------------------
router.put("/users/:id", async (req, res) => {
  try {
    const { bio, department, pronoun, linkedin, instagram, profileImageUrl } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { bio, department, pronoun, linkedin, instagram, profileImageUrl } },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ error: "User not found" });
    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error updating user" });
  }
});

// ---------------------
// Like / Unlike a post
// PUT /api/posts/:postId/like
// ---------------------
router.put("/:postId/like", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const userId = req.user.id || req.user.userId;
    const isOwner = post.userId.toString() === userId.toString();

    let liked;
    if (post.likes.includes(userId)) {
      // Unlike
      post.likes = post.likes.filter((id) => id.toString() !== userId);
      liked = false;
    } else {
      // Like
      post.likes.push(userId);
      liked = true;

      // Notify post owner
      if (!isOwner) {
        await Notification.create({
          userId: post.userId,  // recipient
          fromUser: userId,     // actor
          type: "like",
          postId: post._id,
        });
      }
    }

    await post.save();
    res.json({ likesCount: post.likes.length, liked });
  } catch (err) {
    console.error("Error liking/unliking post:", err);
    res.status(500).json({ error: "Server error liking post" });
  }
});

// ---------------------
// Add a comment to a post
// POST /api/posts/:postId/comment
// ---------------------
router.post("/:postId/comment", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const userId = req.user.id || req.user.userId;
    const text = req.body.text;

    if (!text) return res.status(400).json({ error: "Comment text required" });

    const user = await User.findById(userId);
    const username = user ? user.name : "User";

    const comment = {
      userId,
      text,
      timestamp: Date.now(),
    };

    post.comments.push(comment);
    await post.save();

    // Notify post owner
// Notify comment author
const recipientId = comment.userId?._id || comment.userId; // handles populated or raw ObjectId
if (recipientId.toString() !== userId.toString()) {
  await Notification.create({
    userId: recipientId, // recipient
    fromUser: userId,
    type: "reply",
    postId: post._id,
    commentId: comment._id,
  });
}
    // Return comments with usernames
    const populatedComments = await Post.findById(post._id).populate({
      path: "comments.userId",
      select: "name",
    });

    const commentsWithUsernames = populatedComments.comments.map((c) => ({
      _id: c._id,
      userId: c.userId ? c.userId._id : c.userId,
      username: c.userId ? c.userId.name : username,
      text: c.text,
      timestamp: c.timestamp,
    }));

    res.status(201).json(commentsWithUsernames);
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Server error adding comment" });
  }
});

// ---------------------
// Add a reply to a comment
// POST /api/posts/:postId/comment/:commentId/reply
// ---------------------
router.post("/:postId/comment/:commentId/reply", auth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Reply text required" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const userId = req.user.id || req.user.userId;
    const user = await User.findById(userId);
    const username = user ? user.name : "User";

    // Create reply object
    const reply = {
      userId,
      text,
      username,
      timestamp: Date.now(),
    };

    comment.replies.push(reply);
    await post.save();

    // Notify comment author
    if (comment.userId.toString() !== userId.toString()) {
      await Notification.create({
        userId: comment.userId, // recipient
        fromUser: userId,
        type: "reply",
        postId: post._id,
        commentId: comment._id,
      });
    }

    // Return updated comments with usernames for frontend
    const populatedPost = await Post.findById(postId).populate({
      path: "comments.userId",
      select: "name",
    });

    const commentsWithUsernames = populatedPost.comments.map((c) => ({
      _id: c._id,
      userId: c.userId ? c.userId._id : c.userId,
      username: c.userId ? c.userId.name : c.username,
      text: c.text,
      timestamp: c.timestamp,
      replies: c.replies.map((r) => ({
        _id: r._id,
        userId: r.userId,
        username: r.username || "User",
        text: r.text,
        timestamp: r.timestamp,
      })),
    }));

    res.status(201).json(commentsWithUsernames);
  } catch (err) {
    console.error("Error adding reply:", err);
    res.status(500).json({ error: "Server error adding reply" });
  }
});

module.exports = router;