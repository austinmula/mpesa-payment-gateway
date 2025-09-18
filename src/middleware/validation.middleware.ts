import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { logger } from "../utils/logger";
import { ApiResponse } from "../types/api.types";

/**
 * Middleware to handle validation errors from express-validator
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.param,
      message: error.msg,
      value: error.value,
    }));

    logger.warn("Validation errors", {
      errors: errorMessages,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errorMessages,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
    return;
  }

  next();
};
