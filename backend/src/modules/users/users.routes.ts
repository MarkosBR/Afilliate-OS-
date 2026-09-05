import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { meController, updateProfileController } from "../auth/auth.controller.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);
usersRouter.get("/me", meController);
usersRouter.patch("/me", updateProfileController);
