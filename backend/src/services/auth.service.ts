import nodemailer from "nodemailer";

/**
 * Validate password strength
 * Requirements:
 * - Min 12 characters, max 128
 * - At least 1 uppercase, 1 lowercase, 1 number, 1 symbol
 * - No spaces
 * - Cannot contain email local part
 * - Block common passwords
 */
export function validatePassword(password: string, email: string = ""): string | null {
  if (!password) return "Password is required";

  const issues: string[] = [];

  // Length checks
  if (password.length < 12) {
    issues.push("at least 12 characters");
  }
  if (password.length > 128) {
    issues.push("no more than 128 characters");
  }

  // Character checks
  if (/\s/.test(password)) {
    issues.push("no spaces");
  }
  if (!/[a-z]/.test(password)) {
    issues.push("a lowercase letter");
  }
  if (!/[A-Z]/.test(password)) {
    issues.push("an uppercase letter");
  }
  if (!/\d/.test(password)) {
    issues.push("a number");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    issues.push("a symbol");
  }

  // Common password check
  const commonPasswords = [
    "password",
    "password1",
    "password123",
    "admin123",
    "welcome123",
    "qwerty123",
    "letmein123",
    "restaurant123",
    "cafe12345",
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    issues.push("not a common password");
  }

  // Email local part check
  if (email && email.includes("@")) {
    const localPart = email.split("@")[0].toLowerCase();
    if (localPart && password.toLowerCase().includes(localPart)) {
      issues.push("not contain your email name");
    }
  }

  if (issues.length === 0) return null;

  // Return specific error message or generic one
  if (issues.length === 1 && issues[0] === "at least 12 characters") {
    return "Password must be at least 12 characters long.";
  }

  return (
    "Password must be at least 12 characters and include an uppercase letter, " +
    "a lowercase letter, a number, and a symbol. It must also avoid spaces, " +
    "common passwords, and your email name."
  );
}

/**
 * Generate 6-digit OTP
 */
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send password reset email
 * Supports both SMTP and Resend email services
 */
export async function sendResetEmail(email: string, otp: string): Promise<boolean> {
  try {
    // Try Resend API first
    if (process.env.RESEND_API_KEY) {
      return await sendViaResend(email, otp);
    }

    // Fallback to SMTP
    if (process.env.SMTP_HOST) {
      return await sendViaSMTP(email, otp);
    }

    console.warn("No email service configured");
    return false;
  } catch (error) {
    console.error("Email sending failed:", error);
    return false;
  }
}

/**
 * Send email via Resend
 */
async function sendViaResend(email: string, otp: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "onboarding@resend.dev",
        to: email,
        subject: "POS Cafe - Password Reset Code",
        html: `
          <h2>Password Reset Request</h2>
          <p>Your password reset code is:</p>
          <h1 style="font-size: 2em; letter-spacing: 0.1em; font-family: monospace;">
            ${otp}
          </h1>
          <p>This code expires in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Resend API error:", error);
    return false;
  }
}

/**
 * Send email via SMTP
 */
async function sendViaSMTP(email: string, otp: string): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_USE_TLS === "0" ? false : true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: "POS Cafe - Password Reset Code",
      html: `
        <h2>Password Reset Request</h2>
        <p>Your password reset code is:</p>
        <h1 style="font-size: 2em; letter-spacing: 0.1em; font-family: monospace;">
          ${otp}
        </h1>
        <p>This code expires in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("SMTP error:", error);
    return false;
  }
}
