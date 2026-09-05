import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { createPlaceholderRouter } from "./modules/_placeholders/placeholder.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(requestLogger);
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
      validate: { xForwardedForHeader: false },
    }),
  );

  app.use("/api/health", healthRouter);

  app.use("/api/auth", createPlaceholderRouter("Auth"));
  app.use("/api/users", createPlaceholderRouter("Users"));
  app.use("/api/products", createPlaceholderRouter("Products"));
  app.use("/api/campaigns", createPlaceholderRouter("Campaigns"));
  app.use("/api/content", createPlaceholderRouter("Content"));
  app.use("/api/analytics", createPlaceholderRouter("Analytics"));
  app.use("/api/leads", createPlaceholderRouter("Leads"));
  app.use("/api/sales", createPlaceholderRouter("Sales"));
  app.use("/api/ai", createPlaceholderRouter("AI"));
  app.use("/api/integrations", createPlaceholderRouter("Integrations"));
  app.use("/api/notifications", createPlaceholderRouter("Notifications"));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
