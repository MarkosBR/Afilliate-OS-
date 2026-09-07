import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  cancelPublicationController,
  getPublicationController,
  listPublicationsController,
} from "./publications.controller.js";

export const publicationsRouter = Router();

publicationsRouter.use(requireAuth);
publicationsRouter.get("/", listPublicationsController);
publicationsRouter.get("/:id", getPublicationController);
publicationsRouter.post("/:id/cancel", cancelPublicationController);
