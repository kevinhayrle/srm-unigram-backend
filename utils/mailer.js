// mailer.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

async function sendOTPEmail(email, otp, name = '') {
  const purposeText = name
    ? `Use the following OTP to verify your SRM email and complete your registration:`
    : `Use the following OTP to reset your Unigram password:`;

  const greeting = name ? `Hello ${name},` : `Hello,`;

  const mailOptions = {
    from: `"Unigram" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Unigram OTP',
    html: `
      <p>${greeting}</p>
      <p>${purposeText}</p>
      <h2>${otp}</h2>
      <p>This OTP is valid for 10 minutes.</p>
      <p>If you did not request this, ignore this email.</p>
    `
  };

  // ✅ Use async/await instead of callback
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent:', info.response);
  } catch (err) {
    console.error('❌ OTP email failed:', err);
  }
}

module.exports = { sendOTPEmail };