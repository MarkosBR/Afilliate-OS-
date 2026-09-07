import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { aiStatusController, generateController } from "./ai.controller.js";

export const aiRouter = Router();

aiRouter.use(requireAuth);
aiRouter.get("/status", aiStatusController);
aiRouter.post("/generate", generateController);
