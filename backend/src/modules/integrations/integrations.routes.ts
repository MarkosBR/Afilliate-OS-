import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  connectPlatformController,
  disconnectIntegrationController,
  getIntegrationController,
  integrationStatusController,
  listIntegrationsController,
  metaCallbackController,
  metaConnectController,
  tiktokCallbackController,
  tiktokConnectController,
  youtubeCallbackController,
  youtubeConnectController,
} from "./integrations.controller.js";

export const integrationsRouter = Router();

integrationsRouter.get("/youtube/callback", youtubeCallbackController);
integrationsRouter.get("/youtube/connect", requireAuth, youtubeConnectController);
integrationsRouter.get("/tiktok/callback", tiktokCallbackController);
integrationsRouter.get("/tiktok/connect", requireAuth, tiktokConnectController);
integrationsRouter.get("/meta/callback", metaCallbackController);
integrationsRouter.get("/meta/connect", requireAuth, metaConnectController);
integrationsRouter.use(requireAuth);
integrationsRouter.get("/", listIntegrationsController);
integrationsRouter.post("/:platform/connect", connectPlatformController);
integrationsRouter.get("/:id/status", integrationStatusController);
integrationsRouter.post("/:id/disconnect", disconnectIntegrationController);
integrationsRouter.get("/:id", getIntegrationController);
