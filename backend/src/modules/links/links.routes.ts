import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  createLinkController,
  deleteLinkController,
  getLinkController,
  listLinksController,
  updateLinkController,
} from "./links.controller.js";

export const linksRouter = Router();

linksRouter.use(requireAuth);
linksRouter.get("/", listLinksController);
linksRouter.post("/", createLinkController);
linksRouter.get("/:id", getLinkController);
linksRouter.patch("/:id", updateLinkController);
linksRouter.delete("/:id", deleteLinkController);
