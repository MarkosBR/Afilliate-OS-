import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { createPlaceholderRouter } from "./modules/_placeholders/placeholder.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { productsRouter } from "./modules/products/products.routes.js";
import { linksRouter } from "./modules/links/links.routes.js";
import { campaignsRouter } from "./modules/campaigns/campaigns.routes.js";
import { analyticsRouter } from "./modules/analytics/analytics.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { trackingRouter } from "./modules/tracking/tracking.routes.js";
import { contentRouter } from "./modules/content/content.routes.js";
import { aiRouter } from "./modules/ai/ai.routes.js";
import { calendarRouter } from "./modules/calendar/calendar.routes.js";
import { publicationsRouter } from "./modules/publications/publications.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { integrationsRouter } from "./modules/integrations/integrations.routes.js";

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
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/links", linksRouter);
  app.use("/api/campaigns", campaignsRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/admin", adminRouter);
  app.use("/go", trackingRouter);
  app.use("/api/content", contentRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/calendar", calendarRouter);
  app.use("/api/publications", publicationsRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/integrations", integrationsRouter);
  app.use("/api/leads", createPlaceholderRouter("Leads"));
  app.use("/api/sales", createPlaceholderRouter("Sales"));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
