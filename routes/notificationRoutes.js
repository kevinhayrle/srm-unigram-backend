const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const mongoose = require("mongoose");
const auth = require("../middleware/authMiddleware");
// ------------------ Fetch notifications for a user ------------------
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const notifications = await Notification.find({ userId })
      .sort({ timestamp: -1 })
      .populate("fromUser", "name profileImageUrl"); // actor info
const formatted = notifications.map((n) => {
  // Determine actorName
  let actorName;
if (n.fromUser?._id.toString() === n.userId.toString()) {
  actorName = "You";
} else {
  actorName = n.fromUser?.name || "Someone";
}

  // Build message
  let message = "";
  switch (n.type) {
    case "like":
      message = `${actorName} liked your post`;
      break;
    case "comment":
      message = `${actorName} commented on your post`;
      break;
    case "reply":
      message = `${actorName} replied to your comment`;
      break;
    default:
      message = `${actorName} interacted with your post`;
  }

  // Return formatted notification
  return {
    _id: n._id,
    userId: n.userId,
    fromUser: n.fromUser,
    type: n.type,
    postId: n.postId,
    commentId: n.commentId || null,
    read: n.read,
    seen: n.read,
    timestamp: n.timestamp,
    message, // <-- now this correctly uses "You" when needed
  };
});

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching notifications" });
  }
});

// ------------------ Mark all notifications as read ------------------
router.post("/mark-seen/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    await Notification.updateMany({ userId, read: false }, { read: true });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error marking notifications as read" });
  }
});

// ------------------ Create a new notification ------------------
router.post("/", async (req, res) => {
  // now accept userId and fromUser (frontend-friendly)
  const { userId, fromUser, type, postId, commentId } = req.body;

  if (!userId || !fromUser || !type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!["like", "comment", "reply"].includes(type)) {
    return res.status(400).json({ error: "Invalid notification type" });
  }

  try {
    const notif = new Notification({
      userId,
      fromUser,
      type,
      postId: postId || null,
      commentId: commentId || null,
    });

    await notif.save();
    res.status(201).json(notif);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error creating notification" });
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

    // ----------------- Notification -----------------
    const recipientId = comment.userId?._id || comment.userId; // safe check
    if (recipientId && recipientId.toString() !== userId.toString()) {
      await Notification.create({
        userId: recipientId, // recipient
        fromUser: userId,    // actor
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