import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  connectPlatformController,
  disconnectIntegrationController,
  getIntegrationController,
  integrationStatusController,
  listIntegrationsController,
  youtubeCallbackController,
  youtubeConnectController,
} from "./integrations.controller.js";

export const integrationsRouter = Router();

integrationsRouter.get("/youtube/callback", youtubeCallbackController);
integrationsRouter.get("/youtube/connect", requireAuth, youtubeConnectController);
integrationsRouter.use(requireAuth);
integrationsRouter.get("/", listIntegrationsController);
integrationsRouter.post("/:platform/connect", connectPlatformController);
integrationsRouter.get("/:id/status", integrationStatusController);
integrationsRouter.post("/:id/disconnect", disconnectIntegrationController);
integrationsRouter.get("/:id", getIntegrationController);
