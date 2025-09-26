const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  auth: {
    user: process.env.EMAIL_USER, // your outlook email
    pass: process.env.EMAIL_PASSWORD, // app password if 2FA enabled
  },
});

async function sendOTPEmail(email, otp, name = '') {
  console.log('📧 Sending OTP to:', email);

  const purposeText = name
    ? `Use the following One-Time Password (OTP) to verify your SRM email and complete your registration:`
    : `Use the following One-Time Password (OTP) to reset your Unigram password:`;

  const greeting = name ? `<p>Hello ${name},</p>` : `<p>Hello,</p>`;

  const mailOptions = {
    from: `"Unigram" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Unigram OTP',
    html: `
      ${greeting}
      <p>${purposeText}</p>
      <h2>${otp}</h2>
      <p>This OTP is valid for 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent:', info.response);
    return true;
  } catch (err) {
    console.error('❌ OTP email failed:', err.message || err);
    return false; // allows backend to continue
  }
}

module.exports = { sendOTPEmail };