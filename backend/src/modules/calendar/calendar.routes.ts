import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { calendarController } from "../publications/publications.controller.js";

export const calendarRouter = Router();

calendarRouter.use(requireAuth);
calendarRouter.get("/", calendarController);
