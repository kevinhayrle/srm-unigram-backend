const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");

router.get("/test", verifyToken, (req, res) => {
  res.status(200).json({
    message: "Protected route accessed ✅",
    userId: req.user.userId
  });
});

module.exports = router;