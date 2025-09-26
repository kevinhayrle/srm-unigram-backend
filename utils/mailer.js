const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com', // Outlook SMTP server
  port: 465,
  secure: true, // use TLS
  auth: {
    user: process.env.EMAIL_USER, // your Outlook email
    pass: process.env.EMAIL_PASSWORD // your app password or regular password if allowed
  }
});

function sendOTPEmail(email, otp, name = '') {
  console.log('📧 Sending OTP to:', email);

  const purposeText = name
    ? `Use the following One-Time Password (OTP) to verify your SRM email and complete your registration:`
    : `Use the following One-Time Password (OTP) to reset your Unigram password:`;

  const greeting = name ? `<p>Hello ${name},</p>` : `<p>Hello,</p>`;

  const mailOptions = {
    from: '"Unigram" <srmunigram@outlook.com>', // change to your Outlook email
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