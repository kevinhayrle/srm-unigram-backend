const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'in-v3.mailjet.com',
  port: 587,
  auth: {
    user: process.env.MAILJET_API_KEY,
    pass: process.env.MAILJET_API_SECRET,
  },
});

function sendOTPEmail(email, otp, name = '') {
  console.log('📧 Sending OTP to:', email);

  const purposeText = name
    ? `Use the following One-Time Password (OTP) to verify your SRM email and complete your registration:`
    : `Use the following One-Time Password (OTP) to reset your Unigram password:`;

  const greeting = name ? `<p>Hello ${name},</p>` : <p>Hello,</p>;

  const mailOptions = {
    from: '"Unigram" <srmunigram@gmail.com>', // your Gmail still works as sender
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
    if (err) console.error('❌ OTP email failed:', err);
    else console.log('✅ OTP email sent:', info.response);
  });
}

module.exports = { sendOTPEmail };