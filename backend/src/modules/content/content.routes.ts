import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  createContentController,
  deleteContentController,
  getContentController,
  listContentsController,
  updateContentController,
} from "./content.controller.js";

export const contentRouter = Router();

contentRouter.use(requireAuth);
contentRouter.get("/", listContentsController);
contentRouter.post("/", createContentController);
contentRouter.get("/:id", getContentController);
contentRouter.patch("/:id", updateContentController);
contentRouter.delete("/:id", deleteContentController);
