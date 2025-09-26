const User = require("../models/User");
const PendingUser = require("../models/PendingUser");
const PasswordResetRequest = require("../models/PasswordResetRequest");
const jwt = require("jsonwebtoken");
const { hashPassword, comparePassword } = require("../utils/hash");
const { sendOTPEmail } = require("../utils/mailer");

// ---------------- SIGNUP ----------------
exports.signupUser = async (req, res) => {
  const { name, email, password, regNumber } = req.body;

  if (!name || !email || !password || !regNumber) {
    return res.status(400).json({ error: "Please fill all the fields" });
  }

  // SRM domain restriction
  if (!email.endsWith(`@${process.env.SRM_DOMAIN}`)) {
    return res.status(400).json({ error: "Only SRM email addresses are allowed" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "Email is already registered. Please log in." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await hashPassword(password);

    await PendingUser.deleteOne({ email });

    const pendingUser = new PendingUser({
      name,
      regNumber,
      email,
      password: hashedPassword,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    await pendingUser.save();
    await sendOTPEmail(email, otp, name);

    res.status(200).json({ message: "OTP sent to your SRM email. Please verify to complete signup." });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error during signup" });
  }
};

// ---------------- VERIFY OTP ----------------
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "OTP is required" });

  try {
    // ---------------- DEV BYPASS START ----------------
    const devBypassEnabled = process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_OTP === 'true';
    const devTestOtp = process.env.DEV_TEST_OTP || '123';

    if (devBypassEnabled && otp === devTestOtp) {
      console.log('[DEV BYPASS] accepted dev OTP for', email);

      // move to User collection as usual
      const pendingUser = await PendingUser.findOne({ email });
      if (!pendingUser) return res.status(400).json({ error: "No pending user found for dev bypass" });

      const userhandle = pendingUser.email.replace("@srmist.edu.in", "");

      const newUser = new User({
        name: pendingUser.name,
        regNumber: pendingUser.regNumber,
        email: pendingUser.email,
        password: pendingUser.password,
        userhandle,
        verified: true,
        createdAt: new Date()
      });

      await newUser.save();
      await PendingUser.deleteOne({ email });

      const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

      return res.status(201).json({ message: "Signup complete (dev bypass)", token, name: newUser.name });
    }
    // ---------------- DEV BYPASS END ----------------

    // ---------------- ORIGINAL VERIFY LOGIC ----------------
    const pendingUser = await PendingUser.findOne({ email, otp });
    if (!pendingUser) return res.status(400).json({ error: "Invalid or expired OTP" });

    const userhandle = pendingUser.email.replace("@srmist.edu.in", "");

    const newUser = new User({
      name: pendingUser.name,
      regNumber: pendingUser.regNumber,
      email: pendingUser.email,
      password: pendingUser.password,
      userhandle,
      verified: true,
      createdAt: new Date()
    });

    await newUser.save();
    await PendingUser.deleteOne({ email });

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.status(201).json({ message: "Signup complete", token, name: newUser.name });

  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ error: "Server error during OTP verification" });
  }
};

// ---------------- LOGIN ----------------
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Please fill all the fields" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "No account found for this email" });

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Incorrect password" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    // ✅ Send userId along with token and name
    res.status(200).json({ message: "Login successful", token, name: user.name, userId: user._id });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
};

// ---------------- FORGOT PASSWORD ----------------
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PasswordResetRequest.findOneAndUpdate(
      { email },
      { otp, expiresAt },
      { upsert: true }
    );

    await sendOTPEmail(email, otp);

    res.status(200).json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Server error during forgot password" });
  }
};

// ---------------- RESET PASSWORD ----------------
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ error: "All fields are required" });

  try {
    const request = await PasswordResetRequest.findOne({ email, otp });
    if (!request || request.expiresAt < new Date()) return res.status(400).json({ error: "Invalid or expired OTP" });

    const hashedPassword = await hashPassword(newPassword);
    await User.findOneAndUpdate({ email }, { password: hashedPassword });
    await PasswordResetRequest.deleteOne({ email });

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Server error during password reset" });
  }
};