import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { config } from "../config";
import { logger } from "../utils/logger";
import { verifySignature } from "../utils/encryption";
import { ApiResponse, AuthPayload } from "../types/api.types";

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * API Key authentication middleware
 */
export const authenticateApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey) {
      logger.warn("API request without API key", {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        path: req.path,
      });

      res.status(401).json({
        success: false,
        message: "API key is required",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    if (apiKey !== config.apiKey) {
      logger.warn("Invalid API key attempt", {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        path: req.path,
        providedKey: apiKey.substring(0, 8) + "...",
      });

      res.status(401).json({
        success: false,
        message: "Invalid API key",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    logger.info("API key authenticated successfully", {
      ip: req.ip,
      path: req.path,
    });

    next();
  } catch (error) {
    logger.error("API key authentication error", error);
    res.status(500).json({
      success: false,
      message: "Authentication error",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

/**
 * JWT authentication middleware (optional for advanced features)
 */
export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Access token is required",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    jwt.verify(token, config.jwt.secret, (err, decoded) => {
      if (err) {
        logger.warn("Invalid JWT token", {
          error: err.message,
          ip: req.ip,
          path: req.path,
        });

        res.status(403).json({
          success: false,
          message: "Invalid or expired token",
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      req.user = decoded as AuthPayload;
      next();
    });
  } catch (error) {
    logger.error("JWT authentication error", error);
    res.status(500).json({
      success: false,
      message: "Authentication error",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

/**
 * Webhook signature verification middleware
 */
export const verifyWebhookSignature = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const signature = req.headers["x-signature"] as string;
    const payload = JSON.stringify(req.body);

    if (!signature) {
      logger.warn("Webhook request without signature", {
        ip: req.ip,
        path: req.path,
      });

      res.status(401).json({
        success: false,
        message: "Webhook signature is required",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const isValid = verifySignature(payload, signature, config.webhookSecret);

    if (!isValid) {
      logger.warn("Invalid webhook signature", {
        ip: req.ip,
        path: req.path,
        signature: signature.substring(0, 8) + "...",
      });

      res.status(401).json({
        success: false,
        message: "Invalid webhook signature",
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    logger.info("Webhook signature verified successfully", {
      ip: req.ip,
      path: req.path,
    });

    next();
  } catch (error) {
    logger.error("Webhook signature verification error", error);
    res.status(500).json({
      success: false,
      message: "Signature verification error",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

/**
 * Rate limiting middleware
 */
export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: "Too many requests, please try again later",
    timestamp: new Date().toISOString(),
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn("Rate limit exceeded", {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      path: req.path,
    });

    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  },
});

/**
 * Strict rate limiting for payment endpoints
 */
export const paymentRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 5, // 5 requests per minute
  message: {
    success: false,
    message: "Too many payment requests, please wait before trying again",
    timestamp: new Date().toISOString(),
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Rate limit per IP and phone number combination
    const phoneNumber = req.body?.phoneNumber || "unknown";
    return `${req.ip}-${phoneNumber}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn("Payment rate limit exceeded", {
      ip: req.ip,
      phoneNumber: req.body?.phoneNumber,
      path: req.path,
    });

    res.status(429).json({
      success: false,
      message: "Too many payment requests, please wait before trying again",
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  },
});

/**
 * Request logging middleware
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Log request
  logger.info("Incoming request", {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    contentType: req.headers["content-type"],
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function (body: any) {
    const duration = Date.now() - startTime;

    logger.info("Outgoing response", {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: JSON.stringify(body).length,
    });

    return originalJson.call(this, body);
  };

  next();
};
