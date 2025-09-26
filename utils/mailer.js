const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendOTPEmail(email, otp, name = '') {
  console.log('📧 Sending OTP to:', email);

  const purposeText = name
    ? `Use the following One-Time Password (OTP) to verify your SRM email and complete your registration:`
    : `Use the following One-Time Password (OTP) to reset your Unigram password:`;

  const greeting = name ? `Hello ${name},` : 'Hello,';

  try {
    const response = await resend.emails.send({
      from: 'Unigram <no-reply@yourdomain.com>',
      to: email,
      subject: 'Your Unigram OTP',
      html: `
        <p>${greeting}</p>
        <p>${purposeText}</p>
        <h2>${otp}</h2>
        <p>This OTP is valid for 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `
    });

    console.log('✅ OTP email sent via Resend:', response.id);
  } catch (err) {
    console.error('❌ OTP email failed (Resend):', err);
  }
}

module.exports = { sendOTPEmail };