import { Router } from "express";
import { goController } from "./tracking.controller.js";

export const trackingRouter = Router();

trackingRouter.get("/:slug", goController);
