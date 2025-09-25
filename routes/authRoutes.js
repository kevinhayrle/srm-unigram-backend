const express = require('express');
const router = express.Router();

const {
  signupUser,
  loginUser,
  verifyOTP,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

// Signup route — sends OTP
router.post('/signup', signupUser);

// Verify OTP for signup
router.post('/verify-otp', verifyOTP);

// Login
router.post('/login', loginUser);

// Forgot Password — sends OTP
router.post('/forgot-password', forgotPassword);

// Reset Password — using OTP
router.post('/reset-password', resetPassword);

module.exports = router;