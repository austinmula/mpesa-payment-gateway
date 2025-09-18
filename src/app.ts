import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import expressWinston from "express-winston";
import { config, validateConfig } from "./config";
import { logger } from "./utils/logger";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { requestLogger } from "./middleware/auth.middleware";
import paymentRoutes from "./routes/payment.routes";

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.validateEnvironment();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Validate environment configuration
   */
  private validateEnvironment(): void {
    try {
      validateConfig();
      logger.info("Environment configuration validated successfully");
    } catch (error: any) {
      logger.error("Environment validation failed", error);
      process.exit(1);
    }
  }

  /**
   * Initialize middlewares
   */
  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
          },
        },
        crossOriginEmbedderPolicy: false,
      })
    );

    // CORS configuration
    this.app.use(
      cors({
        origin:
          config.nodeEnv === "production"
            ? ["https://your-frontend-domain.com"] // Replace with your frontend domains
            : true,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "x-api-key",
          "x-signature",
        ],
      })
    );

    // Compression middleware
    this.app.use(compression());

    // Body parsing middleware
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Request logging
    this.app.use(requestLogger);

    // Winston express logger for HTTP requests
    this.app.use(
      expressWinston.logger({
        winstonInstance: logger,
        meta: true,
        msg: "HTTP {{req.method}} {{req.url}}",
        expressFormat: true,
        colorize: false,
        ignoreRoute: (req) => {
          // Don't log health check requests
          return req.url === "/api/v1/payments/health";
        },
      })
    );

    logger.info("Middlewares initialized successfully");
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    // API routes
    this.app.use("/api/v1/payments", paymentRoutes);

    // Root endpoint
    this.app.get("/", (req, res) => {
      res.json({
        success: true,
        message: "M-Pesa Payment Gateway API",
        version: "1.0.0",
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
      });
    });

    // API documentation endpoint
    this.app.get("/api", (req, res) => {
      res.json({
        success: true,
        message: "M-Pesa Payment Gateway API Documentation",
        version: "1.0.0",
        endpoints: {
          health: "GET /api/v1/payments/health",
          initiatePayment: "POST /api/v1/payments/initiate",
          queryStatus: "GET /api/v1/payments/status/:checkoutRequestId",
          stkCallback: "POST /api/v1/payments/callback/stk",
        },
        authentication: {
          type: "API Key",
          header: "x-api-key",
          note: "Required for all endpoints except callbacks and health check",
        },
        rateLimit: {
          general: `${config.rateLimit.maxRequests} requests per ${
            config.rateLimit.windowMs / 60000
          } minutes`,
          payments: "5 requests per minute per IP+phone combination",
        },
        timestamp: new Date().toISOString(),
      });
    });

    logger.info("Routes initialized successfully");
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    // Winston express error logger
    this.app.use(
      expressWinston.errorLogger({
        winstonInstance: logger,
        meta: true,
        msg: "HTTP {{req.method}} {{req.url}} {{err.message}}",
      })
    );

    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler (must be last)
    this.app.use(errorHandler);

    logger.info("Error handling initialized successfully");
  }

  /**
   * Start the server
   */
  public listen(): void {
    const port = config.port;

    this.app.listen(port, () => {
      logger.info(`Server started successfully`, {
        port,
        environment: config.nodeEnv,
        mpesaEnvironment: config.mpesa.environment,
      });

      console.log(`🚀 M-Pesa Payment Gateway running on port ${port}`);
      console.log(`📖 API Documentation: http://localhost:${port}/api`);
      console.log(
        `🏥 Health Check: http://localhost:${port}/api/v1/payments/health`
      );
    });

    // Graceful shutdown
    process.on("SIGTERM", this.gracefulShutdown);
    process.on("SIGINT", this.gracefulShutdown);
  }

  /**
   * Graceful shutdown handler
   */
  private gracefulShutdown = (signal: string): void => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    // Close server
    const server = this.app.listen();
    server.close(() => {
      logger.info("Server closed successfully");
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error("Force shutdown after timeout");
      process.exit(1);
    }, 10000);
  };
}

export default App;
