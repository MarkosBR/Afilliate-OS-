import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { listNotificationsController, markNotificationReadController } from "./notifications.controller.js";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);
notificationsRouter.get("/", listNotificationsController);
notificationsRouter.patch("/:id/read", markNotificationReadController);
