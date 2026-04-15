import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
}

/**
 * Middleware: Verify JWT token
 * Extracts user info and attaches to request
 */
export function verifyToken(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const secret = process.env.JWT_SECRET || "your-secret-key";
    const decoded = jwt.verify(token, secret) as any;

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Middleware: Require staff access
 * Denies customers and unauthenticated users
 */
export function requireStaff(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const staffRoles = ["cashier", "kitchen", "manager", "restaurant"];
  if (!staffRoles.includes(req.user.role)) {
    res.status(403).json({ error: "Forbidden: At least staff access required" });
    return;
  }

  next();
}

/**
 * Middleware: Require admin access
 * Only restaurant/admin role
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (req.user.role !== "restaurant") {
    res.status(403).json({ error: "Forbidden: Admin access required" });
    return;
  }

  next();
}

/**
 * Middleware: Optional auth
 * Attaches user if token provided, but doesn't require it
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (token) {
      const secret = process.env.JWT_SECRET || "your-secret-key";
      const decoded = jwt.verify(token, secret) as any;
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
    }
  } catch (error) {
    // Token is invalid but we don't care - it's optional
  }

  next();
}
