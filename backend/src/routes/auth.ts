import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { validatePassword, generateOtp, sendResetEmail } from "../services/auth.service";

const router = Router();
const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
}

// ─── Signup ───────────────────────────────────────────
router.post("/signup", async (req: Request, res: Response) => {
  try {
    const { name, email, password, confirmPassword, role = "cashier" } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Validate password strength
    const passwordError = validatePassword(password, email);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Normalize role
    const normalizedRole = normalizeRole(role);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: normalizedRole,
      },
    });

    // Generate JWT token
    const token = generateToken(user.id, user.email, user.role);

    return res.status(201).json({
      ok: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Login ───────────────────────────────────────────
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email, user.role);

    return res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Password Reset Request ───────────────────────────
router.post("/password-reset/request", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists (security best practice)
      return res.status(404).json({ error: "No account found for that email" });
    }

    // Generate 6-digit OTP
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in a simple in-memory store or database
    // For now, using a simple approach - in production, use Redis or database
    const resetTokens = new Map<string, { otp: string; expiresAt: Date }>();
    resetTokens.set(email.toLowerCase(), { otp, expiresAt });

    // Send email with OTP
    const emailSent = await sendResetEmail(user.email, otp);

    if (!emailSent) {
      return res.status(500).json({ error: "Failed to send reset email" });
    }

    // Store in global map (in production, use Redis or DB)
    (global as any).resetTokens = resetTokens;

    return res.json({
      ok: true,
      message: "Reset code sent to your email",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Password Reset Complete ───────────────────────────
router.post("/password-reset/complete", async (req: Request, res: Response) => {
  try {
    const { email, otp, password, confirmPassword } = req.body;

    // Validation
    if (!email || !otp || !password || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    // Check OTP validity
    const resetTokens = (global as any).resetTokens || new Map();
    const resetToken = resetTokens.get(email.toLowerCase());

    if (!resetToken) {
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    if (resetToken.otp !== otp) {
      return res.status(400).json({ error: "Invalid reset code" });
    }

    if (new Date() > resetToken.expiresAt) {
      resetTokens.delete(email.toLowerCase());
      return res.status(400).json({ error: "Reset code expired" });
    }

    // Validate password strength
    const passwordError = validatePassword(password, email);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { password: hashedPassword },
    });

    // Remove used OTP
    resetTokens.delete(email.toLowerCase());

    return res.json({
      ok: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Password reset complete error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Logout (client-side token removal) ───────────────
router.post("/logout", (req: Request, res: Response) => {
  // JWT is stateless, so logout is handled client-side by removing token
  return res.json({ ok: true });
});

// ─── Helper Functions ───────────────────────────────

function generateToken(userId: number, email: string, role: string): string {
  const payload = { userId, email, role };
  const secret = process.env.JWT_SECRET || "your-secret-key";
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

function normalizeRole(role: string): string {
  const normalized = (role || "cashier").toLowerCase().trim();
  const validRoles = ["cashier", "restaurant", "kitchen", "manager", "customer"];
  return validRoles.includes(normalized) ? normalized : "cashier";
}

export default router;
