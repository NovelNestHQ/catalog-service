import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import jwt, { JwtPayload } from "jsonwebtoken";

dotenv.config();

// Define a specific interface for the JWT payload
export interface JwtPayloadWithUserId extends JwtPayload {
  userId: string;
}

// Extend the Express Request interface to include the 'user' property
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayloadWithUserId; // Use the specific payload type
    }
  }
}

// Middleware to verify JWT token
const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Access denied. No token provided." });
    return; // Explicitly return void
  }

  try {
    // Ensure JWT_SECRET is defined
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined in environment variables.");
    }
    const decoded = jwt.verify(token, secret);
    // Check if the decoded payload is an object and not a string
    if (typeof decoded === "object" && decoded !== null) {
      // Assert the type to our specific payload interface
      req.user = decoded as JwtPayloadWithUserId;
      next();
    } else {
      // Handle cases where decoded is a string or verification returned unexpected type
      throw new Error("Invalid token payload format.");
    }
  } catch (err) {
    // Log the error for debugging purposes
    console.error("JWT verification error:", err);
    // Provide a generic error message to the client
    res.status(400).json({ error: "Invalid token." });
    return; // Explicitly return void
  }
};

export default verifyToken;
