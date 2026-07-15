const nodemailer = require("nodemailer");

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      // do not fail on invalid/expired certs
      rejectUnauthorized: false
    }
  });
};

const sendResetEmail = async (toEmail, userName, resetToken) => {
  const transporter = createTransporter();

  const frontEndUrl = process.env.FRONTEND_URL;
  const resetLink = `${frontEndUrl}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"QueErp" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Reset Your QueErp Password",
    text: `Hello ${userName},\n\nWe received a request to reset your password.\n\nClick the link below to reset your password:\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, simply ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e40af;">Reset Your Password</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>We received a request to reset your password.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>Or click this link:</p>
        <p><a href="${resetLink}" style="color: #2563eb;">${resetLink}</a></p>
        <p style="color: #64748b; font-size: 14px; margin-top: 30px;">This link will expire in 1 hour.</p>
        <p style="color: #64748b; font-size: 14px;">If you did not request this, simply ignore this email.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = {
  sendResetEmail
};
