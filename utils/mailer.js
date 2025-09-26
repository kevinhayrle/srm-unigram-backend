const nodemailer = require('nodemailer');

// 🔒 Create transporter with Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,       // Your Unigram Gmail
    pass: process.env.EMAIL_PASSWORD    // App password
  }
});

// 🔑 OTP email function for signup and forgot-password
function sendOTPEmail(email, otp, name = '') {
  console.log('📧 Sending OTP to:', email);

  const purposeText = name
    ? `Use the following One-Time Password (OTP) to verify your SRM email and complete your registration:`
    : `Use the following One-Time Password (OTP) to reset your Unigram password:`;

  const greeting = name ? `<p>Hello ${name},</p>` : <p>Hello,</p>;

  const mailOptions = {
    from: '"Unigram" <your-unigram-gmail@gmail.com>',
    to: email,
    subject: 'Your Unigram OTP',
    html: `
      ${greeting}
      <p>${purposeText}</p>
      <h2>${otp}</h2>
      <p>This OTP is valid for 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    `
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('❌ OTP email failed:', err);
    } else {
      console.log('✅ OTP email sent:', info.response);
    }
  });
}