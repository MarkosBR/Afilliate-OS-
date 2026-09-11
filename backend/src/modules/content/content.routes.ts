import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  approveContentController,
  createContentController,
  deleteContentController,
  getContentController,
  listContentsController,
  rejectContentController,
  updateContentController,
  uploadContentVideoController,
} from "./content.controller.js";
import { listPublicationsController, scheduleContentController } from "../publications/publications.controller.js";

export const contentRouter = Router();

contentRouter.use(requireAuth);
contentRouter.get("/", listContentsController);
contentRouter.post("/", createContentController);
contentRouter.get("/scheduled", listPublicationsController);
contentRouter.post("/:id/approve", approveContentController);
contentRouter.post("/:id/reject", rejectContentController);
contentRouter.post("/:id/schedule", scheduleContentController);
contentRouter.post("/:id/video", uploadContentVideoController);
contentRouter.get("/:id", getContentController);
contentRouter.patch("/:id", updateContentController);
contentRouter.delete("/:id", deleteContentController);
