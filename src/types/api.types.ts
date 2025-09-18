export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface AuthPayload {
  userId?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface RateLimitInfo {
  windowMs: number;
  maxRequests: number;
  remaining: number;
  resetTime: Date;
}
